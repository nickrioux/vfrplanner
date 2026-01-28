/**
 * Navigation calculation service
 * Provides distance, bearing, and ETE calculations
 */

import * as turf from '@turf/turf';
import type { Waypoint, LegData, FlightPlanTotals } from '../types/flightPlan';

/**
 * Calculate bearing between two points (degrees true)
 */
export function calculateBearing(
    fromLat: number,
    fromLon: number,
    toLat: number,
    toLon: number
): number {
    const bearing = turf.bearing(
        turf.point([fromLon, fromLat]),
        turf.point([toLon, toLat])
    );
    // Normalize to 0-360
    return (bearing + 360) % 360;
}

/**
 * Calculate distance between two points in nautical miles
 */
export function calculateDistance(
    fromLat: number,
    fromLon: number,
    toLat: number,
    toLon: number
): number {
    return turf.distance(
        turf.point([fromLon, fromLat]),
        turf.point([toLon, toLat]),
        { units: 'nauticalmiles' }
    );
}

/**
 * Wind component result with headwind and crosswind
 */
export interface WindComponents {
    /** Headwind component: positive = headwind (slows aircraft), negative = tailwind (speeds up) */
    headwind: number;
    /** Crosswind component: positive = right crosswind, negative = left crosswind */
    crosswind: number;
}

/**
 * Calculate both headwind and crosswind components
 * @param trackTrue - Aircraft track direction in degrees true
 * @param windDir - Wind direction in degrees (where wind comes FROM)
 * @param windSpeed - Wind speed in knots
 * @returns Object with headwind and crosswind components
 */
export function calculateWindComponents(
    trackTrue: number,
    windDir: number,
    windSpeed: number
): WindComponents {
    // Convert to radians
    const trackRad = (trackTrue * Math.PI) / 180;
    const windRad = (windDir * Math.PI) / 180;

    // Calculate angle difference
    const angleDiff = trackRad - windRad;

    // Headwind component: positive = headwind (slows aircraft), negative = tailwind (speeds up)
    const headwind = windSpeed * Math.cos(angleDiff);

    // Crosswind component: positive = right crosswind, negative = left crosswind
    const crosswind = windSpeed * Math.sin(angleDiff);

    return { headwind, crosswind };
}

/**
 * Calculate headwind component (positive = headwind, negative = tailwind)
 * @deprecated Use calculateWindComponents() for both headwind and crosswind
 */
export function calculateHeadwindComponent(
    trackTrue: number,
    windDir: number,
    windSpeed: number
): number {
    return calculateWindComponents(trackTrue, windDir, windSpeed).headwind;
}

/**
 * Calculate ground speed given TAS and wind
 */
export function calculateGroundSpeed(
    tas: number,
    trackTrue: number,
    windDir: number,
    windSpeed: number
): number {
    // Calculate headwind component
    const headwind = calculateHeadwindComponent(trackTrue, windDir, windSpeed);

    // Ground speed calculation (simplified, ignores wind correction angle)
    // Ground speed = TAS - headwind (headwind positive = slower, negative = faster)
    const groundSpeed = tas - headwind;

    return Math.max(0, groundSpeed);
}

/**
 * Calculate leg data between two waypoints
 */
export function calculateLeg(
    from: Waypoint,
    to: Waypoint,
    tas: number = 100,
    windDir?: number,
    windSpeed?: number
): LegData {
    const bearing = calculateBearing(from.lat, from.lon, to.lat, to.lon);
    const distance = calculateDistance(from.lat, from.lon, to.lat, to.lon);

    let groundSpeed: number | undefined;
    let ete: number | undefined;

    if (windDir !== undefined && windSpeed !== undefined) {
        groundSpeed = calculateGroundSpeed(tas, bearing, windDir, windSpeed);
        ete = groundSpeed > 0 ? (distance / groundSpeed) * 60 : undefined;
    } else {
        groundSpeed = tas;
        ete = (distance / tas) * 60;
    }

    return {
        distance,
        bearing,
        groundSpeed,
        ete,
    };
}

/**
 * Calculate navigation data for all waypoints in a flight plan
 */
export function calculateFlightPlanNavigation(
    waypoints: Waypoint[],
    tas: number = 100
): { waypoints: Waypoint[]; totals: FlightPlanTotals } {
    if (waypoints.length === 0) {
        return {
            waypoints: [],
            totals: { distance: 0, ete: 0 },
        };
    }

    let totalDistance = 0;
    let totalEte = 0;
    let weightedHeadwindSum = 0; // For distance-weighted average

    const updatedWaypoints = waypoints.map((wp, index) => {
        if (index === 0) {
            // First waypoint has no leg data
            return { ...wp, distance: 0, bearing: 0, ete: 0 };
        }

        const prevWp = waypoints[index - 1];
        const leg = calculateLeg(prevWp, wp, tas, wp.windDir, wp.windSpeed);

        totalDistance += leg.distance;
        if (leg.ete) {
            totalEte += leg.ete;
        }

        // Calculate headwind component for this leg (if wind data available)
        if (wp.windDir !== undefined && wp.windSpeed !== undefined && leg.bearing !== undefined) {
            const headwind = calculateHeadwindComponent(leg.bearing, wp.windDir, wp.windSpeed);
            // Weight by distance for accurate average
            weightedHeadwindSum += headwind * leg.distance;
        }

        return {
            ...wp,
            distance: leg.distance,
            bearing: leg.bearing,
            groundSpeed: leg.groundSpeed,
            ete: leg.ete,
        };
    });

    // Calculate distance-weighted average headwind
    const averageHeadwind = totalDistance > 0 ? weightedHeadwindSum / totalDistance : undefined;

    return {
        waypoints: updatedWaypoints,
        totals: {
            distance: totalDistance,
            ete: totalEte,
            averageGroundSpeed: totalEte > 0 ? (totalDistance / totalEte) * 60 : tas,
            averageHeadwind,
        },
    };
}

/**
 * Format distance for display
 */
export function formatDistance(nm: number): string {
    return `${nm.toFixed(1)} NM`;
}

/**
 * Format bearing for display
 */
export function formatBearing(degrees: number): string {
    return `${Math.round(degrees).toString().padStart(3, '0')}°`;
}

/**
 * Format ETE for display (rounded to whole minutes)
 */
export function formatEte(minutes: number): string {
    const roundedMinutes = Math.round(minutes);
    const hours = Math.floor(roundedMinutes / 60);
    const mins = roundedMinutes % 60;
    if (hours > 0) {
        return `${hours}h ${mins.toString().padStart(2, '0')}m`;
    }
    return `${mins}m`;
}

/**
 * Format headwind/tailwind for display
 */
export function formatHeadwind(headwind: number): string {
    const absValue = Math.abs(headwind);
    if (headwind > 0) {
        return `HW ${absValue.toFixed(0)} kt`;
    } else if (headwind < 0) {
        return `TW ${absValue.toFixed(0)} kt`;
    }
    return 'No wind';
}
