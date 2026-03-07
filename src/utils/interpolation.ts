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
    // wp[i].distance is the incoming leg (from wp[i-1] to wp[i]), so the leg
    // from wp[i] to wp[i+1] has length wp[i+1].distance
    for (let i = 0; i < waypoints.length - 1; i++) {
        const prevWp = waypoints[i];
        const nextWp = waypoints[i + 1];
        const legDistance = nextWp.distance || 0;
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
            prevDistance: cumulativeDistance - (waypoints[lastIndex].distance || 0),
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

/**
 * Interpolate lat/lon at a given distance along the route using great circle interpolation
 * @param distance - Distance along route in NM
 * @param waypoints - Array of waypoints
 * @returns Interpolated lat/lon, or null if distance is out of range
 */
export function getLatLonAtDistance(
    distance: number,
    waypoints: Waypoint[]
): { lat: number; lon: number } | null {
    if (waypoints.length === 0) return null;
    if (waypoints.length === 1) return { lat: waypoints[0].lat, lon: waypoints[0].lon };

    let cumulativeDistance = 0;

    for (let i = 0; i < waypoints.length - 1; i++) {
        const wp1 = waypoints[i];
        const wp2 = waypoints[i + 1];
        // wp[i+1].distance is the incoming leg length (from wp[i] to wp[i+1])
        const legDistance = wp2.distance || 0;

        if (distance <= cumulativeDistance + legDistance) {
            const fraction = legDistance > 0 ? (distance - cumulativeDistance) / legDistance : 0;
            // Great circle interpolation
            const φ1 = wp1.lat * Math.PI / 180;
            const λ1 = wp1.lon * Math.PI / 180;
            const φ2 = wp2.lat * Math.PI / 180;
            const λ2 = wp2.lon * Math.PI / 180;
            const d = 2 * Math.asin(Math.sqrt(
                Math.sin((φ2 - φ1) / 2) ** 2 +
                Math.cos(φ1) * Math.cos(φ2) * Math.sin((λ2 - λ1) / 2) ** 2
            ));
            if (d < 1e-10) return { lat: wp1.lat, lon: wp1.lon };
            const a = Math.sin((1 - fraction) * d) / Math.sin(d);
            const b = Math.sin(fraction * d) / Math.sin(d);
            const x = a * Math.cos(φ1) * Math.cos(λ1) + b * Math.cos(φ2) * Math.cos(λ2);
            const y = a * Math.cos(φ1) * Math.sin(λ1) + b * Math.cos(φ2) * Math.sin(λ2);
            const z = a * Math.sin(φ1) + b * Math.sin(φ2);
            return {
                lat: Math.atan2(z, Math.sqrt(x ** 2 + y ** 2)) * 180 / Math.PI,
                lon: Math.atan2(y, x) * 180 / Math.PI,
            };
        }

        cumulativeDistance += legDistance;
    }

    // Beyond route end
    const last = waypoints[waypoints.length - 1];
    return { lat: last.lat, lon: last.lon };
}
