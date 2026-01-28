/**
 * VFR Window Detection Service
 * Detects time windows where VFR conditions are acceptable along the entire route
 */

import type { Waypoint } from '../types/flightPlan';
import type { WaypointWeather, ForecastTimeRange, FullForecastData } from './weatherService';
import { fetchWaypointWeather, getForecastTimeRange, fetchFullForecast, extractWeatherAtTimestamp } from './weatherService';
import { evaluateSegmentCondition, type SegmentCondition, type ProfileDataPoint } from './profileService';
import type {
    MinimumConditionLevel,
    DepartureTimeEvaluation,
    VFRWindow,
    VFRWindowSearchResult,
    VFRWindowSearchOptions,
    WaypointEvaluationDetail,
    VFRWindowCSVData,
} from '../types/vfrWindow';
import { metersToFeet } from '../utils/units';
import { filterToDaylightHours } from '../utils/sunCalc';
import { logger } from './logger';

/**
 * Weather cache to avoid redundant API calls during search
 * Key format: `${lat.toFixed(4)}_${lon.toFixed(4)}_${timestamp}`
 */
class WeatherCache {
    private cache: Map<string, WaypointWeather | null> = new Map();

    private makeKey(lat: number, lon: number, timestamp: number): string {
        // Round timestamp to nearest hour to match our 1-hour scan intervals
        const roundedTs = Math.round(timestamp / (1 * 60 * 60 * 1000)) * (1 * 60 * 60 * 1000);
        return `${lat.toFixed(4)}_${lon.toFixed(4)}_${roundedTs}`;
    }

    get(lat: number, lon: number, timestamp: number): WaypointWeather | null | undefined {
        return this.cache.get(this.makeKey(lat, lon, timestamp));
    }

    set(lat: number, lon: number, timestamp: number, weather: WaypointWeather | null): void {
        this.cache.set(this.makeKey(lat, lon, timestamp), weather);
    }

    has(lat: number, lon: number, timestamp: number): boolean {
        return this.cache.has(this.makeKey(lat, lon, timestamp));
    }

    clear(): void {
        this.cache.clear();
    }

    get size(): number {
        return this.cache.size;
    }
}

/**
 * Forecast cache to store full forecast data per unique location
 * Key format: `${lat.toFixed(4)}_${lon.toFixed(4)}`
 * This dramatically reduces API calls by fetching each location only once
 */
class ForecastCache {
    private cache: Map<string, FullForecastData | null> = new Map();
    private pendingFetches: Map<string, Promise<FullForecastData | null>> = new Map();

    private makeKey(lat: number, lon: number): string {
        return `${lat.toFixed(4)}_${lon.toFixed(4)}`;
    }

    /**
     * Get or fetch full forecast for a location
     * Uses deduplication to avoid fetching the same location multiple times
     */
    async getOrFetch(
        lat: number,
        lon: number,
        altitude: number,
        enableLogging: boolean = false
    ): Promise<FullForecastData | null> {
        const key = this.makeKey(lat, lon);

        // Return cached result if available
        if (this.cache.has(key)) {
            return this.cache.get(key) ?? null;
        }

        // If a fetch is already in progress for this location, wait for it
        if (this.pendingFetches.has(key)) {
            return this.pendingFetches.get(key)!;
        }

        // Start a new fetch
        const fetchPromise = fetchFullForecast(lat, lon, altitude, enableLogging)
            .then((forecast) => {
                this.cache.set(key, forecast);
                this.pendingFetches.delete(key);
                return forecast;
            })
            .catch((error) => {
                if (enableLogging) {
                    logger.error(`[VFR Window] Error fetching forecast for ${lat},${lon}:`, error);
                }
                this.cache.set(key, null);
                this.pendingFetches.delete(key);
                return null;
            });

        this.pendingFetches.set(key, fetchPromise);
        return fetchPromise;
    }

    /**
     * Prefetch forecasts for all unique locations in parallel
     * This is the key optimization - fetch once per location, not per timestamp
     */
    async prefetchLocations(
        waypoints: Waypoint[],
        altitude: number,
        enableLogging: boolean = false
    ): Promise<void> {
        // Get unique locations (deduplicate by key)
        const uniqueLocations = new Map<string, Waypoint>();
        for (const wp of waypoints) {
            const key = this.makeKey(wp.lat, wp.lon);
            if (!uniqueLocations.has(key)) {
                uniqueLocations.set(key, wp);
            }
        }

        if (enableLogging) {
            logger.debug(`[VFR Window] Prefetching forecasts for ${uniqueLocations.size} unique locations (${waypoints.length} waypoints)`);
        }

        // Fetch all unique locations in parallel
        const fetchPromises = Array.from(uniqueLocations.values()).map((wp) =>
            this.getOrFetch(wp.lat, wp.lon, altitude, enableLogging)
        );

        await Promise.all(fetchPromises);

        if (enableLogging) {
            logger.debug(`[VFR Window] Prefetch complete: ${this.cache.size} forecasts cached`);
        }
    }

    /**
     * Extract weather at a specific timestamp from cached forecast
     */
    extractWeather(
        lat: number,
        lon: number,
        timestamp: number,
        altitude: number,
        waypointName?: string,
        enableLogging: boolean = false
    ): WaypointWeather | null {
        const key = this.makeKey(lat, lon);
        const forecast = this.cache.get(key);

        if (!forecast) {
            return null;
        }

        return extractWeatherAtTimestamp(forecast, timestamp, altitude, waypointName, enableLogging);
    }

    has(lat: number, lon: number): boolean {
        const key = this.makeKey(lat, lon);
        // Only return true if we have a valid (non-null) forecast
        return this.cache.has(key) && this.cache.get(key) !== null;
    }

    clear(): void {
        this.cache.clear();
        this.pendingFetches.clear();
    }

    get size(): number {
        return this.cache.size;
    }
}

/**
 * Check if a condition meets the minimum acceptable level
 */
function meetsMinimumCondition(condition: SegmentCondition, minimum: MinimumConditionLevel): boolean {
    if (minimum === 'good') {
        return condition === 'good';
    }
    // minimum === 'marginal'
    return condition === 'good' || condition === 'marginal';
}

/**
 * Get the worse of two conditions
 */
function worseCondition(a: SegmentCondition, b: SegmentCondition): SegmentCondition {
    const order: Record<SegmentCondition, number> = {
        'good': 0,
        'marginal': 1,
        'poor': 2,
        'unknown': 3,
    };
    return order[a] >= order[b] ? a : b;
}

/**
 * Calculate confidence level based on how far in the future the forecast is
 */
function calculateConfidence(timestamp: number): 'high' | 'medium' | 'low' {
    const hoursFromNow = (timestamp - Date.now()) / (1000 * 60 * 60);
    if (hoursFromNow <= 24) return 'high';
    if (hoursFromNow <= 72) return 'medium';
    return 'low';
}

/**
 * Waypoint info with pre-calculated timing for parallel fetch
 */
interface WaypointFetchInfo {
    index: number;
    waypoint: Waypoint;
    altitude: number;
    arrivalTime: number;
    isTerminal: boolean;
}

/**
 * Pre-calculate waypoint timing information
 */
function calculateWaypointTimings(
    departureTime: number,
    waypoints: Waypoint[],
    defaultAltitude: number
): WaypointFetchInfo[] {
    const infos: WaypointFetchInfo[] = [];
    let cumulativeEteMinutes = 0;

    for (let i = 0; i < waypoints.length; i++) {
        const wp = waypoints[i];
        infos.push({
            index: i,
            waypoint: wp,
            altitude: wp.altitude ?? defaultAltitude,
            arrivalTime: departureTime + (cumulativeEteMinutes * 60 * 1000),
            isTerminal: i === 0 || i === waypoints.length - 1,
        });
        cumulativeEteMinutes += wp.ete || 0;
    }

    return infos;
}

/**
 * Fetch weather for multiple waypoints in parallel
 * Returns array of weather data in same order as input
 *
 * When forecastCache is provided, extracts weather from prefetched full forecasts
 * (O(1) per waypoint/timestamp), otherwise falls back to fetching each separately.
 */
async function fetchWeatherParallel(
    waypointInfos: WaypointFetchInfo[],
    cache: WeatherCache,
    pluginName: string,
    enableLogging: boolean,
    forecastCache?: ForecastCache
): Promise<(WaypointWeather | null)[]> {
    const results: (WaypointWeather | null)[] = new Array(waypointInfos.length);
    const fetchPromises: Promise<void>[] = [];

    for (const info of waypointInfos) {
        const { index, waypoint: wp, altitude, arrivalTime } = info;

        // Check result cache first (avoids re-processing same location/time)
        const cached = cache.get(wp.lat, wp.lon, arrivalTime);
        if (cached !== undefined) {
            results[index] = cached;
            continue;
        }

        // If we have a forecast cache, try to extract from it (fast path - no API call)
        if (forecastCache && forecastCache.has(wp.lat, wp.lon)) {
            const weather = forecastCache.extractWeather(
                wp.lat,
                wp.lon,
                arrivalTime,
                altitude,
                wp.name,
                enableLogging
            );
            // Only use cached result if extraction succeeded
            if (weather !== null) {
                cache.set(wp.lat, wp.lon, arrivalTime, weather);
                results[index] = weather;
                continue;
            }
            // If extraction failed, fall through to individual fetch
        }

        // Fallback: fetch individually (slow path - makes API call)
        const fetchPromise = fetchWaypointWeather(
            wp.lat,
            wp.lon,
            pluginName,
            arrivalTime,
            wp.name,
            altitude,
            enableLogging
        )
            .then((weather) => {
                cache.set(wp.lat, wp.lon, arrivalTime, weather);
                results[index] = weather;
            })
            .catch((error) => {
                if (enableLogging) {
                    logger.error(`[VFR Window] Error fetching weather for ${wp.name}:`, error);
                }
                cache.set(wp.lat, wp.lon, arrivalTime, null);
                results[index] = null;
            });

        fetchPromises.push(fetchPromise);
    }

    // Wait for any fallback fetches to complete
    if (fetchPromises.length > 0) {
        await Promise.all(fetchPromises);
    }

    return results;
}

/**
 * Evaluate conditions at a specific departure time
 * Checks weather at each waypoint accounting for flight time to reach it
 * Uses parallel weather fetching for improved performance
 */
export async function evaluateDepartureTime(
    departureTime: number,
    waypoints: Waypoint[],
    defaultAltitude: number,
    minimumCondition: MinimumConditionLevel,
    cache: WeatherCache,
    pluginName: string = 'VFR Planner',
    enableLogging: boolean = false,
    forecastCache?: ForecastCache
): Promise<DepartureTimeEvaluation> {
    // Pre-calculate all waypoint timings
    const waypointInfos = calculateWaypointTimings(departureTime, waypoints, defaultAltitude);

    // Fetch all weather data in parallel (uses forecastCache for fast extraction if available)
    const weatherResults = await fetchWeatherParallel(waypointInfos, cache, pluginName, enableLogging, forecastCache);

    // Now evaluate conditions sequentially (for early exit and worst condition tracking)
    let worstCondition: SegmentCondition = 'good';
    let limitingWaypoint: string | undefined;
    let limitingReasons: string[] | undefined;

    for (const info of waypointInfos) {
        const { index, waypoint: wp, altitude, isTerminal } = info;
        const weather = weatherResults[index];

        // If we couldn't get weather, treat as unknown
        if (!weather) {
            return {
                departureTime,
                isAcceptable: false,
                worstCondition: 'unknown',
                limitingWaypoint: wp.name,
                limitingReasons: ['Unable to fetch weather data'],
            };
        }

        // Create a profile data point for condition evaluation
        const terrainElevation = wp.elevation ? metersToFeet(wp.elevation) : 0;
        let cloudBase: number | undefined;
        if (weather.cloudBase !== undefined && weather.cloudBase > 0) {
            const cloudBaseAGL = metersToFeet(weather.cloudBase);
            cloudBase = cloudBaseAGL + terrainElevation;
        }

        const point: ProfileDataPoint = {
            distance: 0, // Not relevant for condition check
            altitude,
            terrainElevation,
            cloudBase,
            headwindComponent: 0,
            crosswindComponent: 0,
            windSpeed: weather.windSpeed,
            windDir: weather.windDir,
        };

        // Evaluate the condition at this waypoint
        const evaluation = evaluateSegmentCondition(point, altitude, weather, isTerminal, wp);

        // Track worst condition
        if (worseCondition(evaluation.condition, worstCondition) === evaluation.condition) {
            worstCondition = evaluation.condition;
            if (evaluation.reasons && evaluation.reasons.length > 0) {
                limitingWaypoint = wp.name;
                limitingReasons = evaluation.reasons;
            }
        }

        // Early exit if condition is unacceptable
        if (!meetsMinimumCondition(evaluation.condition, minimumCondition)) {
            return {
                departureTime,
                isAcceptable: false,
                worstCondition: evaluation.condition,
                limitingWaypoint: wp.name,
                limitingReasons: evaluation.reasons,
            };
        }
    }

    return {
        departureTime,
        isAcceptable: true,
        worstCondition,
        limitingWaypoint,
        limitingReasons,
    };
}

/**
 * Evaluate conditions at a specific departure time and collect detailed data for CSV export
 * Uses parallel weather fetching for improved performance
 */
export async function evaluateDepartureTimeDetailed(
    departureTime: number,
    waypoints: Waypoint[],
    defaultAltitude: number,
    minimumCondition: MinimumConditionLevel,
    cache: WeatherCache,
    pluginName: string = 'VFR Planner',
    enableLogging: boolean = false,
    forecastCache?: ForecastCache
): Promise<{ evaluation: DepartureTimeEvaluation; details: WaypointEvaluationDetail[] }> {
    // Pre-calculate all waypoint timings
    const waypointInfos = calculateWaypointTimings(departureTime, waypoints, defaultAltitude);

    // Fetch all weather data in parallel (uses forecastCache for fast extraction if available)
    const weatherResults = await fetchWeatherParallel(waypointInfos, cache, pluginName, enableLogging, forecastCache);

    // Now evaluate and collect details
    let worstCondition: SegmentCondition = 'good';
    let limitingWaypoint: string | undefined;
    let limitingReasons: string[] | undefined;
    const details: WaypointEvaluationDetail[] = [];

    for (const info of waypointInfos) {
        const { index, waypoint: wp, altitude, arrivalTime, isTerminal } = info;
        const weather = weatherResults[index];

        // If we couldn't get weather, record as unknown
        if (!weather) {
            details.push({
                departureTime,
                departureTimeISO: new Date(departureTime).toISOString(),
                waypointName: wp.name || `WP${index}`,
                waypointIndex: index,
                arrivalTime,
                arrivalTimeISO: new Date(arrivalTime).toISOString(),
                altitude,
                terrainElevation: wp.elevation ? metersToFeet(wp.elevation) : 0,
                windSpeed: 0,
                windDir: 0,
                temperature: 0,
                condition: 'unknown',
                conditionReasons: 'Unable to fetch weather data',
                isTerminal,
            });
            continue;
        }

        // Create a profile data point for condition evaluation
        const terrainElevation = wp.elevation ? metersToFeet(wp.elevation) : 0;
        let cloudBase: number | undefined;
        let cloudBaseFt: number | undefined;
        if (weather.cloudBase !== undefined && weather.cloudBase > 0) {
            const cloudBaseAGL = metersToFeet(weather.cloudBase);
            cloudBase = weather.cloudBase;
            cloudBaseFt = cloudBaseAGL + terrainElevation;
        }

        const point: ProfileDataPoint = {
            distance: 0,
            altitude,
            terrainElevation,
            cloudBase: cloudBaseFt,
            headwindComponent: 0,
            crosswindComponent: 0,
            windSpeed: weather.windSpeed,
            windDir: weather.windDir,
        };

        // Evaluate the condition at this waypoint
        const evaluation = evaluateSegmentCondition(point, altitude, weather, isTerminal, wp);

        // Track worst condition
        if (worseCondition(evaluation.condition, worstCondition) === evaluation.condition) {
            worstCondition = evaluation.condition;
            if (evaluation.reasons && evaluation.reasons.length > 0) {
                limitingWaypoint = wp.name;
                limitingReasons = evaluation.reasons;
            }
        }

        // Record detailed data
        details.push({
            departureTime,
            departureTimeISO: new Date(departureTime).toISOString(),
            waypointName: wp.name || `WP${index}`,
            waypointIndex: index,
            arrivalTime,
            arrivalTimeISO: new Date(arrivalTime).toISOString(),
            altitude,
            terrainElevation,
            windSpeed: weather.windSpeed,
            windDir: weather.windDir,
            windGust: weather.windGust,
            temperature: weather.temperature,
            dewPoint: weather.dewPoint,
            cloudBase,
            cloudBaseFt,
            visibility: weather.visibility,
            condition: evaluation.condition,
            conditionReasons: evaluation.reasons?.join('; ') || '',
            isTerminal,
        });
    }

    const isAcceptable = meetsMinimumCondition(worstCondition, minimumCondition);

    return {
        evaluation: {
            departureTime,
            isAcceptable,
            worstCondition,
            limitingWaypoint,
            limitingReasons,
        },
        details,
    };
}

/**
 * Run evaluations with concurrency control
 */
async function runWithConcurrency<T, R>(
    items: T[],
    fn: (item: T) => Promise<R>,
    maxConcurrent: number
): Promise<R[]> {
    const results: R[] = [];
    const executing: Promise<void>[] = [];

    for (const item of items) {
        const promise = fn(item).then((result) => {
            results.push(result);
        });

        executing.push(promise);

        if (executing.length >= maxConcurrent) {
            await Promise.race(executing);
            // Remove completed promises
            for (let i = executing.length - 1; i >= 0; i--) {
                // Check if promise is settled by using Promise.race with a resolved promise
                const settled = await Promise.race([
                    executing[i].then(() => true).catch(() => true),
                    Promise.resolve(false),
                ]);
                if (settled) {
                    executing.splice(i, 1);
                }
            }
        }
    }

    await Promise.all(executing);
    return results;
}

/**
 * Scan for VFR windows at 1-hour intervals
 * Identifies candidate time ranges that may contain VFR windows
 */
async function coarseScanForWindows(
    forecastRange: ForecastTimeRange,
    waypoints: Waypoint[],
    defaultAltitude: number,
    flightDuration: number,
    minimumCondition: MinimumConditionLevel,
    cache: WeatherCache,
    maxConcurrent: number,
    onProgress?: (progress: number) => void,
    enableLogging: boolean = false,
    startFrom?: number,
    collectDetailedData: boolean = false,
    forecastCache?: ForecastCache
): Promise<{ candidateRanges: { start: number; end: number }[]; detailedData: WaypointEvaluationDetail[] }> {
    const interval = 1 * 60 * 60 * 1000; // 1 hour in ms
    const timestamps: number[] = [];
    const allDetailedData: WaypointEvaluationDetail[] = [];

    // Use startFrom if provided and within forecast range, otherwise use forecast start
    let searchStart = forecastRange.start;
    if (startFrom && startFrom >= forecastRange.start && startFrom <= forecastRange.end) {
        // Align startFrom to the next hour
        const alignedStart = Math.ceil(startFrom / interval) * interval;
        searchStart = alignedStart <= forecastRange.end ? alignedStart : forecastRange.start;
    }

    // Generate timestamps at 1-hour intervals starting from aligned searchStart
    for (let t = searchStart; t <= forecastRange.end; t += interval) {
        timestamps.push(t);
    }

    if (enableLogging) {
        logger.debug(`[VFR Window] Scanning: ${timestamps.length} timestamps from ${new Date(searchStart).toISOString()} to ${new Date(forecastRange.end).toISOString()}`);
    }

    // Evaluate each timestamp with concurrency control
    const evaluations: DepartureTimeEvaluation[] = [];
    let completed = 0;

    for (let i = 0; i < timestamps.length; i += maxConcurrent) {
        const batch = timestamps.slice(i, i + maxConcurrent);

        if (collectDetailedData) {
            // Use detailed evaluation for CSV export
            const batchResults = await Promise.all(
                batch.map((t) =>
                    evaluateDepartureTimeDetailed(t, waypoints, defaultAltitude, minimumCondition, cache, 'VFR Planner', enableLogging, forecastCache)
                )
            );
            for (const result of batchResults) {
                evaluations.push(result.evaluation);
                allDetailedData.push(...result.details);
            }
        } else {
            // Use simple evaluation
            const batchResults = await Promise.all(
                batch.map((t) =>
                    evaluateDepartureTime(t, waypoints, defaultAltitude, minimumCondition, cache, 'VFR Planner', enableLogging, forecastCache)
                )
            );
            evaluations.push(...batchResults);
        }

        completed += batch.length;
        onProgress?.(completed / timestamps.length * 0.6); // Scan is 60% of work

        // Log each evaluation result for debugging
        if (enableLogging) {
            const results = evaluations.slice(-batch.length);
            for (const result of results) {
                logger.debug(`[VFR Window] Eval ${new Date(result.departureTime).toISOString()}: ${result.isAcceptable ? '✓' : '✗'} ${result.worstCondition}${result.limitingWaypoint ? ` (${result.limitingWaypoint}: ${result.limitingReasons?.join(', ')})` : ''}`);
            }
        }
    }

    // Sort evaluations by time
    evaluations.sort((a, b) => a.departureTime - b.departureTime);

    // Log summary of acceptable vs unacceptable
    if (enableLogging) {
        const acceptable = evaluations.filter(e => e.isAcceptable).length;
        logger.debug(`[VFR Window] Scan complete: ${acceptable}/${evaluations.length} timestamps acceptable`);
    }

    // Find contiguous acceptable periods
    const candidateRanges: { start: number; end: number }[] = [];
    let currentRangeStart: number | null = null;
    let lastAcceptableTime: number | null = null;

    for (const eval_ of evaluations) {
        if (eval_.isAcceptable) {
            if (currentRangeStart === null) {
                currentRangeStart = eval_.departureTime;
            }
            // Track the most recent acceptable time as we iterate
            lastAcceptableTime = eval_.departureTime;
        } else {
            if (currentRangeStart !== null && lastAcceptableTime !== null) {
                // End of acceptable range - use the last acceptable time we tracked
                candidateRanges.push({
                    start: currentRangeStart,
                    end: lastAcceptableTime,
                });
                currentRangeStart = null;
                lastAcceptableTime = null;
            }
        }
    }

    // Handle case where last evaluation is acceptable
    if (currentRangeStart !== null && lastAcceptableTime !== null) {
        candidateRanges.push({
            start: currentRangeStart,
            end: lastAcceptableTime,
        });
    }

    if (enableLogging) {
        logger.debug(`[VFR Window] Coarse scan found ${candidateRanges.length} candidate ranges`);
        candidateRanges.forEach((r, i) => {
            logger.debug(`[VFR Window]   Range ${i + 1}: ${new Date(r.start).toISOString()} to ${new Date(r.end).toISOString()}`);
        });
    }

    return { candidateRanges, detailedData: allDetailedData };
}

/**
 * Binary search to refine a window boundary
 * @param knownGood - A timestamp known to be acceptable
 * @param knownBad - A timestamp known to be unacceptable (or end of forecast)
 * @param waypoints - Flight plan waypoints
 * @param defaultAltitude - Default flight altitude
 * @param minimumCondition - Minimum acceptable condition
 * @param cache - Weather cache
 * @param precision - Target precision in minutes (default: 30)
 * @param enableLogging - Enable debug logging
 * @param forecastCache - Optional forecast cache for fast weather extraction
 * @returns Refined boundary timestamp
 */
async function refineWindowBoundary(
    knownGood: number,
    knownBad: number,
    waypoints: Waypoint[],
    defaultAltitude: number,
    minimumCondition: MinimumConditionLevel,
    cache: WeatherCache,
    precision: number = 30,
    enableLogging: boolean = false,
    forecastCache?: ForecastCache
): Promise<number> {
    const precisionMs = precision * 60 * 1000;
    let good = knownGood;
    let bad = knownBad;

    while (bad - good > precisionMs) {
        const mid = Math.floor((good + bad) / 2);
        const midEval = await evaluateDepartureTime(
            mid,
            waypoints,
            defaultAltitude,
            minimumCondition,
            cache,
            'VFR Planner',
            enableLogging,
            forecastCache
        );

        if (midEval.isAcceptable) {
            good = mid;
        } else {
            bad = mid;
        }
    }

    return good;
}

/**
 * Main entry point: Find VFR windows in the forecast period
 */
export async function findVFRWindows(
    waypoints: Waypoint[],
    defaultAltitude: number,
    flightDuration: number, // Total flight ETE in minutes
    options: VFRWindowSearchOptions,
    onProgress?: (progress: number) => void,
    enableLogging: boolean = false
): Promise<VFRWindowSearchResult> {
    const {
        minimumCondition,
        maxConcurrent = 8,
        maxWindows = 5,
        startFrom,
        collectDetailedData = false,
        includeNightFlights = false,
        routeCoordinates,
    } = options;

    // Get forecast time range from first waypoint
    if (waypoints.length === 0) {
        return {
            windows: [],
            searchRange: { start: Date.now(), end: Date.now() },
            minimumCondition,
            flightDuration,
            limitedBy: 'No waypoints in flight plan',
        };
    }

    const forecastRange = await getForecastTimeRange(waypoints[0].lat, waypoints[0].lon);
    if (!forecastRange) {
        return {
            windows: [],
            searchRange: { start: Date.now(), end: Date.now() },
            minimumCondition,
            flightDuration,
            limitedBy: 'Unable to fetch forecast time range',
        };
    }

    // Initialize caches
    const cache = new WeatherCache();
    const forecastCache = new ForecastCache();

    // Determine actual search start (use startFrom if within forecast range, aligned to 1h intervals)
    const interval = 1 * 60 * 60 * 1000; // 1 hour in ms
    let actualSearchStart = forecastRange.start;
    if (startFrom && startFrom >= forecastRange.start && startFrom <= forecastRange.end) {
        // Align to next hour
        const alignedStart = Math.ceil(startFrom / interval) * interval;
        actualSearchStart = alignedStart <= forecastRange.end ? alignedStart : forecastRange.start;
    }

    if (enableLogging) {
        logger.debug(`[VFR Window] Starting search: ${waypoints.length} waypoints, ${flightDuration} min flight, minimum=${minimumCondition}`);
        logger.debug(`[VFR Window] Forecast range: ${new Date(forecastRange.start).toISOString()} to ${new Date(forecastRange.end).toISOString()}`);
        if (startFrom) {
            logger.debug(`[VFR Window] Starting from: ${new Date(actualSearchStart).toISOString()}`);
        }
    }

    // OPTIMIZATION: Prefetch full forecasts for all waypoint locations
    // This fetches each location only ONCE, then extracts data for all timestamps
    // Reduces API calls from (waypoints × timestamps) to just (unique locations)
    onProgress?.(0.02);
    if (enableLogging) {
        logger.debug(`[VFR Window] Prefetching forecasts for all waypoints...`);
    }
    await forecastCache.prefetchLocations(waypoints, defaultAltitude, enableLogging);
    onProgress?.(0.05);

    // Scan at 1-hour intervals
    const { candidateRanges, detailedData } = await coarseScanForWindows(
        forecastRange,
        waypoints,
        defaultAltitude,
        flightDuration,
        minimumCondition,
        cache,
        maxConcurrent,
        onProgress,
        enableLogging,
        startFrom,
        collectDetailedData,
        forecastCache
    );

    // Phase 2: Refine boundaries for each candidate range
    const windows: VFRWindow[] = [];
    const refinementWork = candidateRanges.length * 2; // Start and end refinement
    let refinementDone = 0;

    for (const range of candidateRanges) {
        // Note: We don't break early on maxWindows here because the limit should be
        // applied AFTER daylight filtering (line 983). Breaking early would cause
        // "Marginal or Better" searches to return fewer windows than "Good only"
        // when some pre-filter windows span night hours.

        // Refine start boundary (find earliest acceptable time)
        // If the range starts at forecast start, we can't look earlier
        let refinedStart = range.start;
        if (range.start > forecastRange.start) {
            // There's an unacceptable time before this, so refine the start
            const previousBad = range.start - (1 * 60 * 60 * 1000);
            refinedStart = await refineWindowBoundary(
                range.start,
                previousBad,
                waypoints,
                defaultAltitude,
                minimumCondition,
                cache,
                30,
                enableLogging,
                forecastCache
            );
        }
        refinementDone++;
        onProgress?.(0.6 + (refinementDone / refinementWork) * 0.35);

        // Refine end boundary (find latest acceptable time)
        let refinedEnd = range.end;
        if (range.end < forecastRange.end) {
            // There's an unacceptable time after this, so refine the end
            const nextBad = range.end + (1 * 60 * 60 * 1000);
            refinedEnd = await refineWindowBoundary(
                range.end,
                Math.min(nextBad, forecastRange.end),
                waypoints,
                defaultAltitude,
                minimumCondition,
                cache,
                30,
                enableLogging,
                forecastCache
            );
        }
        refinementDone++;
        onProgress?.(0.6 + (refinementDone / refinementWork) * 0.35);

        // Calculate window duration
        const durationMinutes = (refinedEnd - refinedStart) / (60 * 1000);

        // Only include windows at least as long as the flight duration
        if (durationMinutes >= flightDuration) {
            // Determine worst condition within the window (use the coarse evaluations)
            // For now, assume it's the worst we found during coarse scan
            // This is a simplification - the actual condition is at least as good as marginal
            const worstCondition: SegmentCondition = minimumCondition === 'good' ? 'good' : 'marginal';

            // Calculate confidence based on window timing
            const confidence = calculateConfidence(refinedStart);

            windows.push({
                startTime: refinedStart,
                endTime: refinedEnd,
                duration: durationMinutes,
                worstCondition,
                confidence,
            });

            if (enableLogging) {
                logger.debug(`[VFR Window] Found window: ${new Date(refinedStart).toISOString()} to ${new Date(refinedEnd).toISOString()} (${Math.round(durationMinutes)} min, ${confidence} confidence)`);
            }
        } else if (enableLogging) {
            logger.debug(`[VFR Window] Skipping window (too short): ${Math.round(durationMinutes)} min < ${flightDuration} min required`);
        }
    }

    onProgress?.(1.0);

    // Clean up caches
    if (enableLogging) {
        logger.debug(`[VFR Window] Search complete. Weather cache: ${cache.size} entries, Forecast cache: ${forecastCache.size} locations, Windows found: ${windows.length}`);
    }
    cache.clear();
    forecastCache.clear();

    // Filter to daylight hours if night flights are not included
    let filteredWindows = windows;
    if (!includeNightFlights && windows.length > 0) {
        // Use route coordinates or first waypoint for daylight calculation
        const lat = routeCoordinates?.lat ?? waypoints[0].lat;
        const lon = routeCoordinates?.lon ?? waypoints[0].lon;

        if (enableLogging) {
            logger.debug(`[VFR Window] Filtering to daylight hours at ${lat.toFixed(4)}, ${lon.toFixed(4)}`);
        }

        filteredWindows = [];
        for (const window of windows) {
            // Get daylight ranges within this window
            const daylightRanges = filterToDaylightHours(window.startTime, window.endTime, lat, lon);

            for (const range of daylightRanges) {
                const durationMinutes = (range.end - range.start) / (60 * 1000);

                // Only include if the daylight portion is long enough for the flight
                if (durationMinutes >= flightDuration) {
                    filteredWindows.push({
                        startTime: range.start,
                        endTime: range.end,
                        duration: durationMinutes,
                        worstCondition: window.worstCondition,
                        confidence: calculateConfidence(range.start),
                    });

                    if (enableLogging) {
                        logger.debug(`[VFR Window] Daylight window: ${new Date(range.start).toISOString()} to ${new Date(range.end).toISOString()} (${Math.round(durationMinutes)} min)`);
                    }
                } else if (enableLogging) {
                    logger.debug(`[VFR Window] Skipping daylight window (too short): ${Math.round(durationMinutes)} min < ${flightDuration} min required`);
                }
            }
        }

        // Limit to maxWindows after filtering
        filteredWindows = filteredWindows.slice(0, maxWindows);

        if (enableLogging) {
            logger.debug(`[VFR Window] After daylight filter: ${filteredWindows.length} windows (was ${windows.length})`);
        }
    }

    // Determine if search was limited
    let limitedBy: string | undefined;
    if (filteredWindows.length === 0 && candidateRanges.length > 0) {
        if (!includeNightFlights && windows.length > 0) {
            limitedBy = 'All VFR windows are outside daylight hours';
        } else {
            limitedBy = `All candidate windows shorter than ${Math.round(flightDuration)} min flight duration`;
        }
    } else if (filteredWindows.length >= maxWindows) {
        limitedBy = `Limited to first ${maxWindows} windows`;
    }

    // Build CSV data if detailed data was collected
    let csvData: VFRWindowCSVData | undefined;
    if (collectDetailedData && detailedData.length > 0) {
        csvData = {
            rows: detailedData,
            generatedAt: new Date().toISOString(),
            searchRange: {
                start: new Date(actualSearchStart).toISOString(),
                end: new Date(forecastRange.end).toISOString(),
            },
            minimumCondition,
        };
    }

    return {
        windows: filteredWindows,
        searchRange: { start: actualSearchStart, end: forecastRange.end },
        minimumCondition,
        flightDuration,
        limitedBy,
        csvData,
    };
}

/**
 * Format a VFR window for display
 */
export function formatVFRWindow(window: VFRWindow): {
    date: string;
    timeRange: string;
    duration: string;
    confidence: string;
} {
    const startDate = new Date(window.startTime);
    const endDate = new Date(window.endTime);

    // Format times as HH:MM
    const formatTime = (d: Date) => {
        const hours = d.getHours().toString().padStart(2, '0');
        const minutes = d.getMinutes().toString().padStart(2, '0');
        return `${hours}:${minutes}`;
    };

    // Format date (e.g., "Mon Jan 20")
    const formatDate = (d: Date) => {
        return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
    };

    // Date display - show start date, or range if spans multiple days
    let date: string;
    if (startDate.toDateString() === endDate.toDateString()) {
        date = formatDate(startDate);
    } else {
        date = `${formatDate(startDate)} - ${formatDate(endDate)}`;
    }

    // Time range
    let timeRange: string;
    if (startDate.toDateString() === endDate.toDateString()) {
        timeRange = `${formatTime(startDate)} - ${formatTime(endDate)}`;
    } else {
        timeRange = `${formatTime(startDate)} - ${formatTime(endDate)}`;
    }

    // Format duration
    const hours = Math.floor(window.duration / 60);
    const minutes = Math.round(window.duration % 60);
    const duration = hours > 0 ? `${hours}h ${minutes}m window` : `${minutes}m window`;

    // Confidence display
    const confidenceMap = {
        high: 'High confidence',
        medium: 'Medium confidence',
        low: 'Low confidence',
    };

    return {
        date,
        timeRange,
        duration,
        confidence: confidenceMap[window.confidence],
    };
}
