/**
 * GPX file parser
 * Parses GPS Exchange Format (GPX) files for flight plan import
 */

import { XMLParser } from 'fast-xml-parser';
import type { FlightPlan, Waypoint, WaypointType } from '../types/flightPlan';

/**
 * GPX waypoint from parsed XML
 */
interface GPXWaypoint {
    '@_lat': number;
    '@_lon': number;
    name?: string;
    ele?: number;
    desc?: string;
    sym?: string;
    type?: string;
}

/**
 * GPX route point (same structure as waypoint)
 */
type GPXRoutePoint = GPXWaypoint;

/**
 * GPX route
 */
interface GPXRoute {
    name?: string;
    desc?: string;
    rtept?: GPXRoutePoint | GPXRoutePoint[];
}

/**
 * GPX track segment
 */
interface GPXTrackSegment {
    trkpt?: GPXWaypoint | GPXWaypoint[];
}

/**
 * GPX track
 */
interface GPXTrack {
    name?: string;
    desc?: string;
    trkseg?: GPXTrackSegment | GPXTrackSegment[];
}

/**
 * Parsed GPX structure
 */
interface GPXData {
    gpx?: {
        '@_version'?: string;
        '@_creator'?: string;
        wpt?: GPXWaypoint | GPXWaypoint[];
        rte?: GPXRoute | GPXRoute[];
        trk?: GPXTrack | GPXTrack[];
        metadata?: {
            name?: string;
            desc?: string;
            time?: string;
        };
    };
}

/**
 * GPX parse result
 */
export interface GPXParseResult {
    success: boolean;
    flightPlan?: FlightPlan;
    error?: string;
}

const xmlParser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    parseAttributeValue: true,
    trimValues: true,
    // Security: Disable external entity processing to prevent XXE attacks
    processEntities: false,
    htmlEntities: false,
});

/**
 * Map GPX symbol to waypoint type
 */
function mapSymbolToType(sym?: string, type?: string): WaypointType {
    const symbol = (sym || type || '').toLowerCase();

    if (symbol.includes('airport') || symbol.includes('aerodrome')) {
        return 'AIRPORT';
    }
    if (symbol.includes('vor')) {
        return 'VOR';
    }
    if (symbol.includes('ndb')) {
        return 'NDB';
    }
    if (symbol.includes('intersection') || symbol.includes('int')) {
        return 'INT';
    }
    if (symbol.includes('vrp') || symbol.includes('visual')) {
        return 'INT-VRP';
    }

    return 'USER WAYPOINT';
}

/**
 * Generate a unique ID for a waypoint
 */
function generateWaypointId(name: string, index: number): string {
    return `${name}-${index}-${Date.now()}`;
}

/**
 * Convert GPX waypoint to internal Waypoint format
 */
function convertWaypoint(gpxWp: GPXWaypoint, index: number): Waypoint {
    const name = gpxWp.name || `WPT${index}`;

    return {
        id: generateWaypointId(name, index),
        name: name.toUpperCase(),
        type: mapSymbolToType(gpxWp.sym, gpxWp.type),
        lat: gpxWp['@_lat'],
        lon: gpxWp['@_lon'],
        elevation: gpxWp.ele,
        comment: gpxWp.desc,
    };
}

/**
 * Ensure array from single item or array
 */
function ensureArray<T>(item: T | T[] | undefined): T[] {
    if (!item) return [];
    return Array.isArray(item) ? item : [item];
}

/**
 * Extract waypoints from GPX data
 * Priority: routes > tracks > standalone waypoints
 */
function extractWaypoints(gpx: GPXData['gpx']): Waypoint[] {
    if (!gpx) return [];

    // Priority 1: Use route points if available (most likely for flight plans)
    const routes = ensureArray(gpx.rte);
    if (routes.length > 0 && routes[0].rtept) {
        const routePoints = ensureArray(routes[0].rtept);
        return routePoints.map((rp, i) => convertWaypoint(rp, i));
    }

    // Priority 2: Use track points if available
    const tracks = ensureArray(gpx.trk);
    if (tracks.length > 0) {
        const segments = ensureArray(tracks[0].trkseg);
        if (segments.length > 0) {
            const trackPoints = ensureArray(segments[0].trkpt);
            // For tracks, we might have many points - sample if too many
            const maxPoints = 50;
            let points = trackPoints;
            if (trackPoints.length > maxPoints) {
                // Sample evenly, always including first and last
                const step = (trackPoints.length - 1) / (maxPoints - 1);
                points = [];
                for (let i = 0; i < maxPoints; i++) {
                    const idx = Math.round(i * step);
                    points.push(trackPoints[idx]);
                }
            }
            return points.map((tp, i) => convertWaypoint(tp, i));
        }
    }

    // Priority 3: Use standalone waypoints
    const waypoints = ensureArray(gpx.wpt);
    return waypoints.map((wp, i) => convertWaypoint(wp, i));
}

/**
 * Extract flight plan name from GPX data
 */
function extractPlanName(gpx: GPXData['gpx'], waypoints: Waypoint[], filename?: string): string {
    // Try metadata name
    if (gpx?.metadata?.name) {
        return gpx.metadata.name;
    }

    // Try route name
    const routes = ensureArray(gpx?.rte);
    if (routes.length > 0 && routes[0].name) {
        return routes[0].name;
    }

    // Try track name
    const tracks = ensureArray(gpx?.trk);
    if (tracks.length > 0 && tracks[0].name) {
        return tracks[0].name;
    }

    // Generate from waypoints
    if (waypoints.length >= 2) {
        return `${waypoints[0].name} to ${waypoints[waypoints.length - 1].name}`;
    }

    // Use filename without extension
    if (filename) {
        return filename.replace(/\.gpx$/i, '');
    }

    return 'Imported GPX Route';
}

/**
 * Parse a GPX XML string into FlightPlan
 */
export function parseGPX(xmlString: string, filename?: string): GPXParseResult {
    try {
        const parsed: GPXData = xmlParser.parse(xmlString);

        if (!parsed.gpx) {
            return {
                success: false,
                error: 'Invalid GPX file: missing gpx root element',
            };
        }

        const waypoints = extractWaypoints(parsed.gpx);

        if (waypoints.length === 0) {
            return {
                success: false,
                error: 'GPX file contains no waypoints, routes, or tracks',
            };
        }

        const planName = extractPlanName(parsed.gpx, waypoints, filename);

        const flightPlan: FlightPlan = {
            id: `fp-${Date.now()}`,
            name: planName,
            waypoints,
            aircraft: {
                airspeed: 100, // Default TAS in knots
                defaultAltitude: 3000, // Default altitude in feet
            },
            totals: {
                distance: 0, // Will be calculated by navigation service
                ete: 0,
            },
            sourceFile: filename,
            sourceFormat: 'gpx',
        };

        return {
            success: true,
            flightPlan,
        };
    } catch (error) {
        return {
            success: false,
            error: `Failed to parse GPX file: ${error instanceof Error ? error.message : 'Unknown error'}`,
        };
    }
}

/**
 * Detect file encoding from BOM (Byte Order Mark)
 */
function detectEncoding(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer.slice(0, 4));

    // UTF-16 LE BOM: 0xFF 0xFE
    if (bytes[0] === 0xFF && bytes[1] === 0xFE) {
        return 'utf-16le';
    }
    // UTF-16 BE BOM: 0xFE 0xFF
    if (bytes[0] === 0xFE && bytes[1] === 0xFF) {
        return 'utf-16be';
    }
    // UTF-8 BOM or no BOM - default to UTF-8
    return 'utf-8';
}

/**
 * Read and parse a GPX file from a File object
 */
export async function readGPXFile(file: File): Promise<GPXParseResult> {
    return new Promise((resolve) => {
        // First, read as ArrayBuffer to detect encoding
        const encodingReader = new FileReader();

        encodingReader.onload = (event) => {
            const buffer = event.target?.result as ArrayBuffer;
            if (!buffer) {
                resolve({
                    success: false,
                    error: 'Failed to read file content',
                });
                return;
            }

            const encoding = detectEncoding(buffer);

            // Now read with the correct encoding
            const textReader = new FileReader();

            textReader.onload = (textEvent) => {
                const content = textEvent.target?.result;
                if (typeof content === 'string') {
                    resolve(parseGPX(content, file.name));
                } else {
                    resolve({
                        success: false,
                        error: 'Failed to read file content',
                    });
                }
            };

            textReader.onerror = () => {
                resolve({
                    success: false,
                    error: 'Failed to read file',
                });
            };

            textReader.readAsText(file, encoding);
        };

        encodingReader.onerror = () => {
            resolve({
                success: false,
                error: 'Failed to read file',
            });
        };

        encodingReader.readAsArrayBuffer(file);
    });
}
