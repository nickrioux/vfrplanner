/**
 * Interpolation utilities for VFR Planner
 * Provides linear and angular interpolation functions for wind and navigation data
 */

import type { Waypoint } from '../types/flightPlan';
import type { WaypointWeather } from '../services/weatherService';
import { calculateWindComponents as calcWindComponents } from '../services/navigationCalc';

/**
 * Linear interpolation between two values
 * @param a - Start value
 * @param b - End value
 * @param t - Interpolation factor (0 to 1)
 * @returns Interpolated value
 */
export function lerp(a: number, b: number, t: number): number {
    return a + (b - a) * t;
}

/**
 * Angular interpolation with wrap-around handling
 * Prevents "spinning" errors when interpolating between angles like 350° and 10°
 * @param a - Start angle in degrees (0-360)
 * @param b - End angle in degrees (0-360)
 * @param t - Interpolation factor (0 to 1)
 * @returns Interpolated angle in degrees (0-360)
 */
export function lerpAngle(a: number, b: number, t: number): number {
    // Calculate the difference, handling wrap-around
    let diff = b - a;

    // Use shortest path around the circle
    if (diff > 180) diff -= 360;
    if (diff < -180) diff += 360;

    // Interpolate
    let result = a + diff * t;

    // Normalize to 0-360 range
    if (result < 0) result += 360;
    if (result >= 360) result -= 360;

    return result;
}

/**
 * Result of finding bracketing waypoints
 */
export interface BracketingWaypoints {
    prevWaypoint: Waypoint;
    nextWaypoint: Waypoint;
    prevIndex: number;
    nextIndex: number;
    prevDistance: number;  // Distance from start to prev waypoint
    nextDistance: number;  // Distance from start to next waypoint
    fraction: number;      // How far between prev and next (0 to 1)
}

/**
 * Find the two waypoints that bracket a given distance along the route
 * @param distance - Distance in NM from start of route
 * @param waypoints - Array of waypoints with distance data
 * @returns Bracketing waypoints info, or null if not found
 */
export function findBracketingWaypoints(
    distance: number,
    waypoints: Waypoint[]
): BracketingWaypoints | null {
    if (waypoints.length < 2) return null;

    let cumulativeDistance = 0;

    // Find the segment containing the target distance
    for (let i = 0; i < waypoints.length - 1; i++) {
        const prevWp = waypoints[i];
        const nextWp = waypoints[i + 1];
        const legDistance = prevWp.distance || 0;
        const nextCumulativeDistance = cumulativeDistance + legDistance;

        if (distance >= cumulativeDistance && distance <= nextCumulativeDistance) {
            const fraction = legDistance > 0
                ? (distance - cumulativeDistance) / legDistance
                : 0;

            return {
                prevWaypoint: prevWp,
                nextWaypoint: nextWp,
                prevIndex: i,
                nextIndex: i + 1,
                prevDistance: cumulativeDistance,
                nextDistance: nextCumulativeDistance,
                fraction
            };
        }

        cumulativeDistance = nextCumulativeDistance;
    }

    // If beyond the end, return last segment
    if (distance >= cumulativeDistance && waypoints.length >= 2) {
        const lastIndex = waypoints.length - 1;
        return {
            prevWaypoint: waypoints[lastIndex - 1],
            nextWaypoint: waypoints[lastIndex],
            prevIndex: lastIndex - 1,
            nextIndex: lastIndex,
            prevDistance: cumulativeDistance - (waypoints[lastIndex - 1].distance || 0),
            nextDistance: cumulativeDistance,
            fraction: 1.0
        };
    }

    return null;
}

/**
 * Interpolated wind data result
 */
export interface InterpolatedWind {
    windSpeed: number;
    windDir: number;
    windGust?: number;
    headwindComponent: number;
    crosswindComponent: number;
}

/**
 * Interpolate wind data between two waypoints
 * @param distance - Distance in NM from start of route
 * @param waypoints - Array of waypoints
 * @param weatherData - Map of waypoint ID to weather data
 * @param bearing - Track bearing at this point (for wind component calculation)
 * @returns Interpolated wind data
 */
export function interpolateWindBetweenWaypoints(
    distance: number,
    waypoints: Waypoint[],
    weatherData: Map<string, WaypointWeather>,
    bearing?: number
): InterpolatedWind {
    const defaultWind: InterpolatedWind = {
        windSpeed: 0,
        windDir: 0,
        headwindComponent: 0,
        crosswindComponent: 0
    };

    const bracket = findBracketingWaypoints(distance, waypoints);
    if (!bracket) return defaultWind;

    const prevWx = weatherData.get(bracket.prevWaypoint.id);
    const nextWx = weatherData.get(bracket.nextWaypoint.id);

    // If we don't have weather data for both waypoints, use what we have
    if (!prevWx && !nextWx) return defaultWind;

    // If only one has data, use that
    if (!prevWx && nextWx) {
        return calculateWindComponents(nextWx, bearing);
    }
    if (prevWx && !nextWx) {
        return calculateWindComponents(prevWx, bearing);
    }

    // Both have data - interpolate
    const t = bracket.fraction;

    const windSpeed = lerp(prevWx!.windSpeed, nextWx!.windSpeed, t);
    const windDir = lerpAngle(prevWx!.windDir, nextWx!.windDir, t);

    // Interpolate gust if both have it
    let windGust: number | undefined;
    if (prevWx!.windGust !== undefined && nextWx!.windGust !== undefined) {
        windGust = lerp(prevWx!.windGust, nextWx!.windGust, t);
    } else if (prevWx!.windGust !== undefined) {
        windGust = prevWx!.windGust;
    } else if (nextWx!.windGust !== undefined) {
        windGust = nextWx!.windGust;
    }

    // Calculate wind components using centralized function
    let headwindComponent = 0;
    let crosswindComponent = 0;

    if (bearing !== undefined) {
        const windComp = calcWindComponents(bearing, windDir, windSpeed);
        headwindComponent = windComp.headwind;
        crosswindComponent = windComp.crosswind;
    }

    return {
        windSpeed,
        windDir,
        windGust,
        headwindComponent,
        crosswindComponent
    };
}

/**
 * Calculate wind components from weather data
 * Uses centralized wind calculation from navigationCalc
 */
function calculateWindComponents(wx: WaypointWeather, bearing?: number): InterpolatedWind {
    let headwindComponent = 0;
    let crosswindComponent = 0;

    if (bearing !== undefined) {
        const windComp = calcWindComponents(bearing, wx.windDir, wx.windSpeed);
        headwindComponent = windComp.headwind;
        crosswindComponent = windComp.crosswind;
    }

    return {
        windSpeed: wx.windSpeed,
        windDir: wx.windDir,
        windGust: wx.windGust,
        headwindComponent,
        crosswindComponent
    };
}

/**
 * Interpolate bearing between waypoints
 * @param distance - Distance in NM from start
 * @param waypoints - Array of waypoints with bearing data
 * @returns Interpolated bearing in degrees, or undefined
 */
export function interpolateBearing(
    distance: number,
    waypoints: Waypoint[]
): number | undefined {
    const bracket = findBracketingWaypoints(distance, waypoints);
    if (!bracket) return undefined;

    // Use the bearing of the segment we're in (from prevWaypoint)
    // Bearing doesn't change much within a segment, so use the segment's bearing
    return bracket.prevWaypoint.bearing;
}
