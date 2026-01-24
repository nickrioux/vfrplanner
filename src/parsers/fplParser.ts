/**
 * ForeFlight/Garmin FPL file parser
 * Parses XML files conforming to Garmin FlightPlan v1 schema
 */

import { XMLParser } from 'fast-xml-parser';
import type {
    FPLFlightPlan,
    FPLWaypoint,
    FPLRoute,
    FPLRoutePoint,
    FPLParseResult,
    FPLValidationResult,
    FPLValidationError,
    WaypointType,
} from '../types/fpl';
import type { FlightPlan, Waypoint } from '../types/flightPlan';

const VALID_WAYPOINT_TYPES: WaypointType[] = [
    'AIRPORT',
    'USER WAYPOINT',
    'VOR',
    'NDB',
    'INT',
    'INT-VRP',
];

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
 * Parse waypoint type string to WaypointType enum
 */
function parseWaypointType(typeStr: string): WaypointType {
    const normalized = typeStr.toUpperCase().trim();
    if (VALID_WAYPOINT_TYPES.includes(normalized as WaypointType)) {
        return normalized as WaypointType;
    }
    // Default to USER WAYPOINT for unknown types
    return 'USER WAYPOINT';
}

/**
 * Parse a single waypoint from the waypoint-table
 */
function parseWaypoint(wpData: Record<string, unknown>): FPLWaypoint {
    return {
        identifier: String(wpData['identifier'] || '').toUpperCase(),
        type: parseWaypointType(String(wpData['type'] || 'USER WAYPOINT')),
        countryCode: String(wpData['country-code'] || ''),
        lat: Number(wpData['lat']) || 0,
        lon: Number(wpData['lon']) || 0,
        comment: wpData['comment'] ? String(wpData['comment']) : undefined,
        elevation: wpData['elevation'] !== undefined ? Number(wpData['elevation']) : undefined,
    };
}

/**
 * Parse the waypoint-table section
 */
function parseWaypointTable(tableData: Record<string, unknown>): FPLWaypoint[] {
    const waypoints: FPLWaypoint[] = [];

    if (!tableData || !tableData['waypoint']) {
        return waypoints;
    }

    // Handle both single waypoint and array of waypoints
    const wpArray = Array.isArray(tableData['waypoint'])
        ? tableData['waypoint']
        : [tableData['waypoint']];

    for (const wp of wpArray) {
        if (wp && typeof wp === 'object') {
            waypoints.push(parseWaypoint(wp as Record<string, unknown>));
        }
    }

    return waypoints;
}

/**
 * Parse a single route-point
 */
function parseRoutePoint(rpData: Record<string, unknown>): FPLRoutePoint {
    return {
        waypointIdentifier: String(rpData['waypoint-identifier'] || '').toUpperCase(),
        waypointType: parseWaypointType(String(rpData['waypoint-type'] || 'USER WAYPOINT')),
        waypointCountryCode: String(rpData['waypoint-country-code'] || ''),
    };
}

/**
 * Parse the route section
 */
function parseRoute(routeData: Record<string, unknown>): FPLRoute | undefined {
    if (!routeData) {
        return undefined;
    }

    const points: FPLRoutePoint[] = [];

    if (routeData['route-point']) {
        const rpArray = Array.isArray(routeData['route-point'])
            ? routeData['route-point']
            : [routeData['route-point']];

        for (const rp of rpArray) {
            if (rp && typeof rp === 'object') {
                points.push(parseRoutePoint(rp as Record<string, unknown>));
            }
        }
    }

    return {
        name: String(routeData['route-name'] || 'Unnamed Route'),
        description: routeData['route-description'] ? String(routeData['route-description']) : undefined,
        flightPlanIndex: Number(routeData['flight-plan-index']) || 1,
        points,
    };
}

/**
 * Parse an FPL XML string into FPLFlightPlan structure
 */
export function parseFPL(xmlString: string): FPLParseResult {
    try {
        const parsed = xmlParser.parse(xmlString);
        const fp = parsed['flight-plan'];

        if (!fp) {
            return {
                success: false,
                error: 'Invalid FPL file: missing flight-plan root element',
            };
        }

        if (!fp['waypoint-table']) {
            return {
                success: false,
                error: 'Invalid FPL file: missing waypoint-table',
            };
        }

        const flightPlan: FPLFlightPlan = {
            created: fp['created'] ? new Date(fp['created']) : undefined,
            waypointTable: parseWaypointTable(fp['waypoint-table']),
            route: fp['route'] ? parseRoute(fp['route']) : undefined,
        };

        return {
            success: true,
            flightPlan,
        };
    } catch (error) {
        return {
            success: false,
            error: `Failed to parse FPL file: ${error instanceof Error ? error.message : 'Unknown error'}`,
        };
    }
}

/**
 * Validate an FPL flight plan
 */
export function validateFPL(flightPlan: FPLFlightPlan): FPLValidationResult {
    const errors: FPLValidationError[] = [];

    // Validate waypoint table
    if (!flightPlan.waypointTable || flightPlan.waypointTable.length === 0) {
        errors.push({
            field: 'waypointTable',
            message: 'Flight plan must contain at least one waypoint',
        });
    }

    // Validate each waypoint
    for (let i = 0; i < flightPlan.waypointTable.length; i++) {
        const wp = flightPlan.waypointTable[i];

        if (!wp.identifier || wp.identifier.length === 0) {
            errors.push({
                field: `waypointTable[${i}].identifier`,
                message: 'Waypoint identifier is required',
            });
        } else if (wp.identifier.length > 30) {
            // ForeFlight uses coordinate-based names like "25.97223N/80.60382W" (up to ~22 chars)
            errors.push({
                field: `waypointTable[${i}].identifier`,
                message: 'Waypoint identifier must be 30 characters or less',
                value: wp.identifier,
            });
        }

        if (wp.lat < -90 || wp.lat > 90) {
            errors.push({
                field: `waypointTable[${i}].lat`,
                message: 'Latitude must be between -90 and 90',
                value: wp.lat,
            });
        }

        if (wp.lon < -180 || wp.lon > 180) {
            errors.push({
                field: `waypointTable[${i}].lon`,
                message: 'Longitude must be between -180 and 180',
                value: wp.lon,
            });
        }
    }

    // Validate route points reference existing waypoints
    if (flightPlan.route) {
        const waypointIds = new Set(flightPlan.waypointTable.map(wp => wp.identifier));

        for (let i = 0; i < flightPlan.route.points.length; i++) {
            const rp = flightPlan.route.points[i];
            if (!waypointIds.has(rp.waypointIdentifier)) {
                errors.push({
                    field: `route.points[${i}].waypointIdentifier`,
                    message: `Route point references unknown waypoint: ${rp.waypointIdentifier}`,
                    value: rp.waypointIdentifier,
                });
            }
        }
    }

    return {
        valid: errors.length === 0,
        errors,
    };
}

/**
 * Generate a unique ID for a waypoint
 */
function generateWaypointId(identifier: string, index: number): string {
    return `${identifier}-${index}-${Date.now()}`;
}

/**
 * Check if a waypoint identifier is a coordinate-based name
 * ForeFlight uses formats like "22.64371N/84.5998W" for user waypoints
 */
function isCoordinateIdentifier(identifier: string): boolean {
    // Pattern: digits with optional decimal, N/S, slash, digits with optional decimal, E/W
    const coordinatePattern = /^\d+\.?\d*[NS]\/\d+\.?\d*[EW]$/i;
    return coordinatePattern.test(identifier);
}

/**
 * Convert FPL flight plan to internal FlightPlan format
 */
export function convertToFlightPlan(fpl: FPLFlightPlan, filename?: string): FlightPlan {
    // Build waypoint lookup map
    const waypointMap = new Map<string, FPLWaypoint>();
    for (const wp of fpl.waypointTable) {
        waypointMap.set(wp.identifier, wp);
    }

    // Determine waypoint order from route or use table order
    let orderedWaypoints: FPLWaypoint[];
    if (fpl.route && fpl.route.points.length > 0) {
        orderedWaypoints = fpl.route.points
            .map(rp => waypointMap.get(rp.waypointIdentifier))
            .filter((wp): wp is FPLWaypoint => wp !== undefined);
    } else {
        orderedWaypoints = fpl.waypointTable;
    }

    // Convert to internal Waypoint format
    // Replace coordinate-based identifiers with USR0, USR1, etc.
    let usrCounter = 0;
    const waypoints: Waypoint[] = orderedWaypoints.map((fplWp, index) => {
        let displayName = fplWp.identifier;

        // Replace coordinate-based names with USRn
        if (isCoordinateIdentifier(fplWp.identifier)) {
            displayName = `USR${usrCounter}`;
            usrCounter++;
        }

        return {
            id: generateWaypointId(fplWp.identifier, index),
            name: displayName,
            type: fplWp.type,
            lat: fplWp.lat,
            lon: fplWp.lon,
            comment: fplWp.comment || fplWp.identifier, // Store original identifier in comment if coordinate-based
            elevation: fplWp.elevation,
            countryCode: fplWp.countryCode || undefined,
        };
    });

    // Generate flight plan name
    const planName = fpl.route?.name
        || (waypoints.length >= 2
            ? `${waypoints[0].name} to ${waypoints[waypoints.length - 1].name}`
            : 'Unnamed Flight Plan');

    return {
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
        sourceFormat: 'fpl',
    };
}

/**
 * Detect file encoding from BOM (Byte Order Mark)
 * Returns the encoding name for FileReader.readAsText()
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
    // UTF-8 BOM: 0xEF 0xBB 0xBF (or no BOM, default to UTF-8)
    return 'utf-8';
}

/**
 * Read and parse an FPL file from a File object
 * Handles both UTF-8 and UTF-16 encoded files (ForeFlight exports UTF-16)
 */
export async function readFPLFile(file: File): Promise<FPLParseResult> {
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
                    resolve(parseFPL(content));
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
