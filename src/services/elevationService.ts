/**
 * Elevation service using Open-Meteo API
 * Fetches terrain elevation data along flight route
 */

import type { Waypoint } from '../types/flightPlan';

export interface ElevationPoint {
    lat: number;
    lon: number;
    elevation: number; // meters MSL
    distance: number;  // cumulative distance in NM from start
    waypointIndex?: number; // If this point corresponds to a waypoint, its index
}

/**
 * Calculate great circle distance between two points (Haversine formula)
 * @returns Distance in nautical miles
 */
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 3440.065; // Earth radius in nautical miles
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

/**
 * Interpolate a point along great circle path
 * @param lat1, lon1 - Start point
 * @param lat2, lon2 - End point
 * @param fraction - Position along path (0 to 1)
 * @returns Interpolated coordinates
 */
function interpolatePoint(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
    fraction: number
): { lat: number; lon: number } {
    // Convert to radians
    const φ1 = lat1 * Math.PI / 180;
    const λ1 = lon1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const λ2 = lon2 * Math.PI / 180;

    // Calculate angular distance
    const d = 2 * Math.asin(Math.sqrt(
        Math.sin((φ2 - φ1) / 2) ** 2 +
        Math.cos(φ1) * Math.cos(φ2) * Math.sin((λ2 - λ1) / 2) ** 2
    ));

    // Interpolate along great circle
    const a = Math.sin((1 - fraction) * d) / Math.sin(d);
    const b = Math.sin(fraction * d) / Math.sin(d);

    const x = a * Math.cos(φ1) * Math.cos(λ1) + b * Math.cos(φ2) * Math.cos(λ2);
    const y = a * Math.cos(φ1) * Math.sin(λ1) + b * Math.cos(φ2) * Math.sin(λ2);
    const z = a * Math.sin(φ1) + b * Math.sin(φ2);

    const φ = Math.atan2(z, Math.sqrt(x ** 2 + y ** 2));
    const λ = Math.atan2(y, x);

    return {
        lat: φ * 180 / Math.PI,
        lon: λ * 180 / Math.PI
    };
}

/**
 * Sample points along the flight route at regular intervals
 * @param waypoints - Flight plan waypoints
 * @param sampleIntervalNM - Distance between samples in nautical miles (default: 5 NM)
 * @returns Array of sampled points with lat/lon and cumulative distance, plus waypoint index if applicable
 */
export function sampleRoutePoints(
    waypoints: Waypoint[],
    sampleIntervalNM: number = 5
): Array<{ lat: number; lon: number; distance: number; waypointIndex?: number }> {
    if (waypoints.length < 2) return [];

    const sampledPoints: Array<{ lat: number; lon: number; distance: number; waypointIndex?: number }> = [];
    let cumulativeDistance = 0;

    // Always include first waypoint
    sampledPoints.push({
        lat: waypoints[0].lat,
        lon: waypoints[0].lon,
        distance: 0,
        waypointIndex: 0  // Mark as waypoint
    });

    // Sample along each leg
    for (let i = 0; i < waypoints.length - 1; i++) {
        const wp1 = waypoints[i];
        const wp2 = waypoints[i + 1];

        const legDistance = calculateDistance(wp1.lat, wp1.lon, wp2.lat, wp2.lon);
        const numSamples = Math.floor(legDistance / sampleIntervalNM);

        // Sample intermediate points along this leg
        for (let j = 1; j <= numSamples; j++) {
            const fraction = (j * sampleIntervalNM) / legDistance;
            const point = interpolatePoint(wp1.lat, wp1.lon, wp2.lat, wp2.lon, fraction);
            const pointDistance = cumulativeDistance + (j * sampleIntervalNM);

            sampledPoints.push({
                lat: point.lat,
                lon: point.lon,
                distance: pointDistance
            });
        }

        // Always include the end waypoint of this leg
        cumulativeDistance += legDistance;
        sampledPoints.push({
            lat: wp2.lat,
            lon: wp2.lon,
            distance: cumulativeDistance,
            waypointIndex: i + 1  // Mark as waypoint
        });
    }

    return sampledPoints;
}

/**
 * Fetch elevations from Open-Meteo API for multiple points
 * Open-Meteo Elevation API: https://open-meteo.com/en/docs/elevation-api
 * Free, no API key required
 *
 * @param points - Array of lat/lon points
 * @param enableLogging - Enable debug logging
 * @returns Array of elevation points with elevations in meters MSL
 */
export async function fetchElevations(
    points: Array<{ lat: number; lon: number; distance: number; waypointIndex?: number }>,
    enableLogging: boolean = false
): Promise<ElevationPoint[]> {
    if (points.length === 0) return [];

    try {
        // Open-Meteo accepts comma-separated lat/lon lists
        const latitudes = points.map(p => p.lat.toFixed(6)).join(',');
        const longitudes = points.map(p => p.lon.toFixed(6)).join(',');

        const url = `https://api.open-meteo.com/v1/elevation?latitude=${latitudes}&longitude=${longitudes}`;

        if (enableLogging) {
            console.log(`[VFR Planner] Fetching elevations for ${points.length} points from Open-Meteo...`);
            console.log(`[VFR Planner] API URL: ${url}`);
            // Log first 5 points being queried
            console.log('[VFR Planner] First 5 points queried:',
                points.slice(0, 5).map((p, i) =>
                    `[${i}] (${p.lat.toFixed(6)}, ${p.lon.toFixed(6)}) @ ${p.distance.toFixed(1)}NM`
                )
            );
        }

        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`Open-Meteo API error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();

        if (enableLogging) {
            console.log('[VFR Planner] Open-Meteo API response:', data);
        }

        if (!data.elevation || !Array.isArray(data.elevation)) {
            throw new Error('Invalid response from Open-Meteo API');
        }

        // Combine elevations with original points
        const elevationPoints: ElevationPoint[] = points.map((point, index) => ({
            lat: point.lat,
            lon: point.lon,
            elevation: data.elevation[index], // meters MSL
            distance: point.distance,
            waypointIndex: point.waypointIndex
        }));

        if (enableLogging) {
            console.log(`[VFR Planner] Received ${elevationPoints.length} elevation points`);
            console.log(`[VFR Planner] Elevation range: ${Math.min(...data.elevation)}m to ${Math.max(...data.elevation)}m`);
            // Log first 5 points with full details for debugging
            console.log('[VFR Planner] First 5 elevation points received:');
            elevationPoints.slice(0, 5).forEach((p, i) => {
                const wpMarker = p.waypointIndex !== undefined ? ` [WP ${p.waypointIndex}]` : '';
                console.log(`  [${i}]${wpMarker} (${p.lat.toFixed(6)}, ${p.lon.toFixed(6)}): ${p.elevation}m = ${(p.elevation * 3.28084).toFixed(1)}ft @ ${p.distance.toFixed(1)}NM`);
            });
            // Log all waypoint elevations specifically
            const waypointElevations = elevationPoints.filter(p => p.waypointIndex !== undefined);
            console.log(`[VFR Planner] Waypoint elevations (${waypointElevations.length} waypoints):`);
            waypointElevations.forEach(p => {
                console.log(`  WP ${p.waypointIndex}: ${p.elevation}m = ${(p.elevation * 3.28084).toFixed(1)}ft MSL`);
            });
        }

        return elevationPoints;

    } catch (error) {
        console.error('[VFR Planner] Error fetching elevations:', error);
        return [];
    }
}

/**
 * Get elevation for a specific waypoint by its index
 * @param elevationPoints - Array of elevation points
 * @param waypointIndex - Index of the waypoint
 * @returns Elevation in meters, or undefined if not found
 */
export function getElevationForWaypoint(
    elevationPoints: ElevationPoint[],
    waypointIndex: number
): number | undefined {
    // Find the elevation point that corresponds to this waypoint
    const point = elevationPoints.find(p => p.waypointIndex === waypointIndex);
    return point?.elevation;
}

/**
 * Get interpolated elevation at a specific distance along the route
 * @param elevationPoints - Array of elevation points with distance
 * @param distance - Distance in NM to get elevation at
 * @returns Elevation in meters, or undefined if not available
 */
export function getElevationAtDistance(
    elevationPoints: ElevationPoint[],
    distance: number
): number | undefined {
    if (elevationPoints.length === 0) return undefined;
    if (elevationPoints.length === 1) return elevationPoints[0].elevation;

    // Find the two points to interpolate between
    for (let i = 0; i < elevationPoints.length - 1; i++) {
        const p1 = elevationPoints[i];
        const p2 = elevationPoints[i + 1];

        if (distance >= p1.distance && distance <= p2.distance) {
            // Linear interpolation
            const t = (distance - p1.distance) / (p2.distance - p1.distance);
            return p1.elevation + (p2.elevation - p1.elevation) * t;
        }
    }

    // If beyond the end, return last elevation
    if (distance >= elevationPoints[elevationPoints.length - 1].distance) {
        return elevationPoints[elevationPoints.length - 1].elevation;
    }

    // If before the start, return first elevation
    return elevationPoints[0].elevation;
}

/**
 * Fetch elevation for a single point
 * @param lat - Latitude
 * @param lon - Longitude
 * @param enableLogging - Enable debug logging
 * @returns Elevation in feet MSL, or undefined if failed
 */
export async function fetchPointElevation(
    lat: number,
    lon: number,
    enableLogging: boolean = false
): Promise<number | undefined> {
    try {
        const url = `https://api.open-meteo.com/v1/elevation?latitude=${lat.toFixed(6)}&longitude=${lon.toFixed(6)}`;

        if (enableLogging) {
            console.log(`[VFR Planner] Fetching elevation for point (${lat.toFixed(6)}, ${lon.toFixed(6)})`);
        }

        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`Open-Meteo API error: ${response.status}`);
        }

        const data = await response.json();

        if (!data.elevation || !Array.isArray(data.elevation) || data.elevation.length === 0) {
            return undefined;
        }

        // Convert meters to feet
        const elevationFeet = Math.round(data.elevation[0] * 3.28084);

        if (enableLogging) {
            console.log(`[VFR Planner] Elevation at point: ${data.elevation[0]}m = ${elevationFeet}ft MSL`);
        }

        return elevationFeet;
    } catch (error) {
        console.error('[VFR Planner] Error fetching point elevation:', error);
        return undefined;
    }
}

/**
 * Fetch terrain elevation profile for entire flight route
 * @param waypoints - Flight plan waypoints
 * @param sampleIntervalNM - Distance between samples (default: 5 NM)
 * @param enableLogging - Enable debug logging
 * @returns Array of elevation points along the route
 */
export async function fetchRouteElevationProfile(
    waypoints: Waypoint[],
    sampleIntervalNM: number = 5,
    enableLogging: boolean = false
): Promise<ElevationPoint[]> {
    if (waypoints.length < 2) {
        if (enableLogging) {
            console.log('[VFR Planner] Not enough waypoints for elevation profile');
        }
        return [];
    }

    if (enableLogging) {
        console.log('[VFR Planner] Original waypoint coordinates:');
        waypoints.forEach((wp, i) => {
            console.log(`  [${i}] ${wp.name}: (${wp.lat.toFixed(6)}, ${wp.lon.toFixed(6)}), FPL elevation: ${wp.elevation ? wp.elevation + 'm' : 'N/A'}`);
        });
    }

    // Sample points along the route
    const sampledPoints = sampleRoutePoints(waypoints, sampleIntervalNM);

    if (enableLogging) {
        console.log(`[VFR Planner] Sampled ${sampledPoints.length} points along ${waypoints.length} waypoint route`);
    }

    // Fetch elevations for all sampled points in one API call
    const elevationPoints = await fetchElevations(sampledPoints, enableLogging);

    return elevationPoints;
}
