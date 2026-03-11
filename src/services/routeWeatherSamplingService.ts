/**
 * Route Weather Sampling Service
 * Fetches weather at intermediate points along the route for better en-route alert coverage.
 * Reuses sampleRoutePoints() from elevationService and fetchWaypointWeather() from weatherService.
 */

import type { Waypoint } from '../types/flightPlan';
import type { RouteWeatherSample, RouteWeatherAlert } from '../stores/weatherStore';
import type { SegmentCondition } from './profileService';
import type { VfrConditionThresholds } from '../types/conditionThresholds';
import { sampleRoutePoints } from './elevationService';
import {
    fetchWaypointWeather,
    checkWeatherAlerts,
    DEFAULT_ALERT_THRESHOLDS,
    type WaypointWeather,
} from './weatherService';
import { evaluateAllRules, type ConditionCriteria } from './vfrConditionRules';
import { logger } from './logger';

/**
 * Condition data for a route weather sample point (used for map coloring)
 */
export interface RouteWeatherCondition {
    lat: number;
    lon: number;
    distance: number;
    condition: SegmentCondition;
}

/** Maximum concurrent weather API requests */
const MAX_CONCURRENT = 5;

/**
 * Cache for route weather samples.
 * Avoids redundant API calls when the same route and departure time are
 * requested again (e.g. map pans, settings toggle).  Any change in
 * departure time invalidates the cache because each sample point's ETA
 * shifts and the Windy API returns interpolated values for the new time.
 */
interface SampleCache {
    /** Hash of waypoint coords + interval — identifies the route geometry */
    routeKey: string;
    /** Exact departure time that was used for the fetch */
    departureTime: number;
    /** Whether ETA-adjusted times were used */
    adjustForFlightTime: boolean;
    /** Cached results */
    samples: RouteWeatherSample[];
}

let sampleCache: SampleCache | null = null;

/**
 * Build a cache key from waypoint positions and sample interval.
 */
function buildRouteKey(waypoints: Waypoint[], intervalNM: number): string {
    const coords = waypoints.map(wp => `${wp.lat.toFixed(4)},${wp.lon.toFixed(4)}`).join('|');
    return `${coords}@${intervalNM}`;
}

/**
 * Clear the route weather sample cache (call when route changes).
 */
export function clearRouteWeatherCache(): void {
    sampleCache = null;
}

/**
 * Run async functions with a concurrency limit
 */
async function runWithConcurrency<T, R>(
    items: T[],
    fn: (item: T) => Promise<R>,
    maxConcurrent: number
): Promise<R[]> {
    const results: R[] = new Array(items.length);
    let nextIndex = 0;

    async function worker(): Promise<void> {
        while (nextIndex < items.length) {
            const index = nextIndex++;
            results[index] = await fn(items[index]);
        }
    }

    const workers = Array.from(
        { length: Math.min(maxConcurrent, items.length) },
        () => worker()
    );
    await Promise.all(workers);
    return results;
}

/**
 * Fetch weather at intermediate sample points along the route.
 *
 * @param waypoints - Flight plan waypoints
 * @param sampleIntervalNM - NM between weather samples
 * @param departureTime - Departure timestamp (ms)
 * @param airspeedKnots - TAS for ETA computation
 * @param plannedAltitude - Cruise altitude in feet MSL
 * @param pluginName - Windy plugin name for API calls
 * @param enableLogging - Debug logging flag
 * @returns Array of RouteWeatherSample for intermediate points
 */
export async function fetchRouteWeatherSamples(
    waypoints: Waypoint[],
    sampleIntervalNM: number,
    departureTime: number,
    airspeedKnots: number,
    plannedAltitude: number,
    pluginName: string,
    enableLogging: boolean = false,
    adjustForFlightTime: boolean = true,
): Promise<RouteWeatherSample[]> {
    if (waypoints.length < 2 || airspeedKnots <= 0) {
        return [];
    }

    // Enforce minimum 5 NM interval
    const interval = Math.max(5, sampleIntervalNM);

    // Check cache — skip re-fetch only if same route AND same departure time
    const routeKey = buildRouteKey(waypoints, interval);

    if (sampleCache && sampleCache.routeKey === routeKey && sampleCache.departureTime === departureTime && sampleCache.adjustForFlightTime === adjustForFlightTime) {
        if (enableLogging) {
            logger.debug(
                `[RouteWeatherSampling] Using cached results (${sampleCache.samples.length} samples, same departure time)`
            );
        }
        return sampleCache.samples;
    }

    // Get sample points along the route
    const allPoints = sampleRoutePoints(waypoints, interval);

    // Filter OUT waypoint points (already fetched by main weather flow)
    const intermediatePoints = allPoints.filter(p => p.waypointIndex === undefined);

    if (intermediatePoints.length === 0) {
        if (enableLogging) {
            logger.debug('[RouteWeatherSampling] No intermediate points to sample');
        }
        return [];
    }

    if (enableLogging) {
        logger.debug(
            `[RouteWeatherSampling] Fetching weather for ${intermediatePoints.length} intermediate points ` +
            `(interval: ${interval} NM, concurrency: ${MAX_CONCURRENT})`
        );
    }

    // Fetch weather for each intermediate point with concurrency cap
    const results = await runWithConcurrency(
        intermediatePoints,
        async (point) => {
            // Compute ETA: departureTime + (distance / airspeed) in hours → ms
            const etaMs = departureTime + (point.distance / airspeedKnots) * 3600000;

            // When adjustForFlightTime is off, use departure time for all points
            // (matches main waypoint weather behavior)
            const targetTime = adjustForFlightTime ? etaMs : departureTime;

            const weather = await fetchWaypointWeather(
                point.lat,
                point.lon,
                pluginName,
                targetTime,
                `Route sample @ ${point.distance.toFixed(1)} NM`,
                plannedAltitude,
                enableLogging,
            );

            if (!weather) return null;

            return {
                distance: point.distance,
                lat: point.lat,
                lon: point.lon,
                weather,
                etaTime: adjustForFlightTime ? etaMs : undefined,
            } as RouteWeatherSample;
        },
        MAX_CONCURRENT,
    );

    const samples = results.filter((r): r is RouteWeatherSample => r !== null);

    if (enableLogging) {
        logger.debug(
            `[RouteWeatherSampling] Got weather for ${samples.length}/${intermediatePoints.length} points`
        );
    }

    // Store in cache
    sampleCache = { routeKey, departureTime, adjustForFlightTime, samples };

    return samples;
}

/**
 * Compute weather alerts for route weather samples.
 *
 * @param samples - Route weather samples
 * @param plannedAltitude - Cruise altitude in feet MSL
 * @returns Array of RouteWeatherAlert with distance info
 */
export function computeRouteWeatherAlerts(
    samples: RouteWeatherSample[],
    plannedAltitude: number,
): RouteWeatherAlert[] {
    const alerts: RouteWeatherAlert[] = [];

    for (const sample of samples) {
        const sampleAlerts = checkWeatherAlerts(
            sample.weather,
            DEFAULT_ALERT_THRESHOLDS,
            plannedAltitude,
            false, // not a terminal waypoint
        );

        for (const alert of sampleAlerts) {
            alerts.push({
                distance: sample.distance,
                alert,
            });
        }
    }

    return alerts;
}

/**
 * Evaluate VFR conditions at each route weather sample point.
 * Returns condition + position data for map segment coloring.
 */
export function evaluateRouteWeatherConditions(
    samples: RouteWeatherSample[],
    plannedAltitude: number,
    thresholds?: VfrConditionThresholds,
): RouteWeatherCondition[] {
    return samples.map(sample => {
        const wx = sample.weather;

        // Cloud base in AGL — wx.cloudBase is meters AGL from the API
        const cloudBaseAGL = wx.cloudBase != null ? wx.cloudBase * 3.28084 : 99999;

        // En-route samples are not terminal waypoints — exclude visibility
        // and gusts from condition evaluation (no landing/take-off here).
        const criteria: ConditionCriteria = {
            windSpeed: wx.windSpeed ?? 0,
            // gustSpeed intentionally omitted — not relevant en-route
            cloudBaseAGL,
            visibility: 9999, // ignore visibility for en-route points
            precipitation: wx.precipitation ?? 0,
            // No terrain data for intermediate samples — use generous defaults
            terrainClearance: 99999,
            cloudClearance: 99999,
        };

        const { condition } = evaluateAllRules(criteria, false, thresholds);

        return {
            lat: sample.lat,
            lon: sample.lon,
            distance: sample.distance,
            condition,
        };
    });
}
