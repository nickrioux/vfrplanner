/**
 * Weather service for fetching Windy forecast data
 * Uses Windy's point forecast API
 */

import { getPointForecastData, getMeteogramForecastData } from '@windy/fetch';
import metrics from '@windy/metrics';
import store from '@windy/store';
import type { DataHash, WeatherDataPayload } from '@windy/interfaces';
import type { Products } from '@windy/rootScope';
import type { HttpPayload } from '@windy/http';
import type { Waypoint } from '../types/flightPlan';

/** Wind data at a specific pressure level */
export interface LevelWind {
    level: string;          // e.g., '850h', '700h'
    altitudeFeet: number;   // approximate altitude in feet
    windSpeed: number;      // knots
    windDir: number;        // degrees
}

export interface WaypointWeather {
    windSpeed: number;      // knots (at flight altitude)
    windDir: number;        // degrees (at flight altitude)
    windGust?: number;      // knots (surface)
    windAltitude?: number;  // feet MSL - altitude at which wind was measured
    windLevel?: string;     // pressure level used (e.g., '850h-900h')
    surfaceWindSpeed?: number;  // knots (surface wind for terminal operations)
    surfaceWindDir?: number;    // degrees (surface wind direction)
    verticalWinds?: LevelWind[];  // wind at each pressure level
    temperature: number;    // celsius
    dewPoint?: number;      // celsius
    pressure?: number;      // hPa
    cloudBase?: number;     // meters AGL (Above Ground Level - raw value from Windy ECMWF API)
    cloudBaseDisplay?: string; // formatted display string in feet
    visibility?: number;    // km (estimated from humidity)
    humidity?: number;      // %
    precipitation?: number; // mm
    timestamp: number;
}

export interface WeatherAlert {
    type: 'wind' | 'gust' | 'visibility' | 'ceiling' | 'rain' | 'temperature' | 'altitude-conflict';
    severity: 'caution' | 'warning';
    message: string;
    value: number;
    threshold: number;
}

export interface WeatherAlertThresholds {
    windSpeed: number;      // knots
    gustSpeed: number;      // knots
    visibility: number;     // km
    cloudBase: number;      // feet
    precipitation: number;  // mm
}

export const DEFAULT_ALERT_THRESHOLDS: WeatherAlertThresholds = {
    windSpeed: 25,
    gustSpeed: 35,
    visibility: 5,
    cloudBase: 1500,
    precipitation: 5,
};

/**
 * Convert m/s to knots
 */
function msToKnots(ms: number): number {
    return ms * 1.94384;
}

/**
 * Convert Kelvin to Celsius
 */
function kelvinToCelsius(k: number): number {
    return k - 273.15;
}

/**
 * Convert meters to feet
 */
function metersToFeet(m: number): number {
    return m * 3.28084;
}

/**
 * Pressure level definitions with approximate altitudes
 */
const PRESSURE_LEVELS = [
    { level: 'surface', altitudeFeet: 0 },
    { level: '1000h', altitudeFeet: 330 },
    { level: '950h', altitudeFeet: 1600 },
    { level: '900h', altitudeFeet: 3300 },
    { level: '850h', altitudeFeet: 5000 },
    { level: '700h', altitudeFeet: 10000 },
    { level: '500h', altitudeFeet: 18000 },
    { level: '300h', altitudeFeet: 30000 },
    { level: '200h', altitudeFeet: 39000 },
] as const;

/**
 * Convert altitude in feet MSL to approximate pressure level (hPa)
 * Uses standard atmosphere model
 * @param altitudeFeet - Altitude in feet MSL
 * @returns Pressure level string (e.g., "850h") or "surface" for low altitudes
 */
function altitudeToPressureLevel(altitudeFeet: number): string {
    if (altitudeFeet < 500) {
        return 'surface';
    }
    
    // Find the appropriate level
    for (let i = PRESSURE_LEVELS.length - 1; i >= 0; i--) {
        if (altitudeFeet >= PRESSURE_LEVELS[i].altitudeFeet) {
            return PRESSURE_LEVELS[i].level;
        }
    }
    
    return 'surface';
}

/**
 * Get the two pressure levels that bracket the target altitude for interpolation
 * @param altitudeFeet - Target altitude in feet MSL
 * @returns Object with lower and upper pressure levels and their altitudes, plus interpolation fraction
 */
function getBracketingPressureLevels(altitudeFeet: number): {
    lower: { level: string; altitudeFeet: number };
    upper: { level: string; altitudeFeet: number };
    fraction: number; // 0-1, how far between lower and upper
} | null {
    if (altitudeFeet < 0) {
        return null;
    }
    
    // If below lowest level, use surface only
    if (altitudeFeet < PRESSURE_LEVELS[1].altitudeFeet) {
        return {
            lower: PRESSURE_LEVELS[0],
            upper: PRESSURE_LEVELS[1],
            fraction: altitudeFeet / PRESSURE_LEVELS[1].altitudeFeet
        };
    }
    
    // Find the two levels that bracket the altitude
    for (let i = 1; i < PRESSURE_LEVELS.length; i++) {
        const lower = PRESSURE_LEVELS[i - 1];
        const upper = PRESSURE_LEVELS[i];
        
        if (altitudeFeet >= lower.altitudeFeet && altitudeFeet <= upper.altitudeFeet) {
            const altitudeRange = upper.altitudeFeet - lower.altitudeFeet;
            const fraction = altitudeRange > 0 
                ? (altitudeFeet - lower.altitudeFeet) / altitudeRange 
                : 0;
            
            return { lower, upper, fraction };
        }
    }
    
    // Above highest level, use highest two levels
    const last = PRESSURE_LEVELS[PRESSURE_LEVELS.length - 1];
    const secondLast = PRESSURE_LEVELS[PRESSURE_LEVELS.length - 2];
    return {
        lower: secondLast,
        upper: last,
        fraction: 1.0 // At or above highest level
    };
}

/**
 * Estimate visibility from relative humidity (rough approximation)
 */
function estimateVisibility(humidity: number): number {
    // Very rough estimate - high humidity = lower visibility
    if (humidity >= 100) return 0.5;
    if (humidity >= 95) return 2;
    if (humidity >= 90) return 5;
    if (humidity >= 80) return 10;
    return 20;
}

/**
 * Fetches vertical wind data for all pressure levels using getMeteogramForecastData with extended: 'true'
 * This is the approach used by the flyxc windy-sounding plugin
 * @param lat - Latitude
 * @param lon - Longitude
 * @param enableLogging - Enable debug logging
 * @returns Object with wind data at each pressure level (windU-XXXh, windV-XXXh keys)
 */
export async function fetchVerticalWindData(
    lat: number,
    lon: number,
    enableLogging: boolean = false
): Promise<any | null> {
    try {
        // Log the request parameters
        const requestParams = {
            model: 'ecmwf',
            location: { lat, lon, step: 1 },
            options: { extended: 'true' }
        };

        if (enableLogging) {
            console.log(`[VFR Debug] ========== getMeteogramForecastData REQUEST ==========`);
            console.log(`[VFR Debug] Request params:`, JSON.stringify(requestParams, null, 2));
        }

        // Use getMeteogramForecastData with extended: 'true' to get all pressure levels
        // This is the approach used by flyxc windy-sounding plugin
        const result = await getMeteogramForecastData(
            'ecmwf' as any,  // model
            { lat, lon, step: 1 },  // location with step
            { extended: 'true' }  // extended option to get all pressure levels
        );

        if (enableLogging) {
            console.log(`[VFR Debug] ========== getMeteogramForecastData RAW RESPONSE ==========`);
            console.log(`[VFR Debug] Full result object:`, result);
            console.log(`[VFR Debug] Result type:`, typeof result);
            console.log(`[VFR Debug] Result keys:`, result ? Object.keys(result) : 'null');

            if (result?.data) {
                console.log(`[VFR Debug] result.data keys:`, Object.keys(result.data));
                console.log(`[VFR Debug] result.data:`, result.data);
            }

            if (result?.data?.data) {
                const dataKeys = Object.keys(result.data.data);
                console.log(`[VFR Debug] result.data.data keys (${dataKeys.length}):`, dataKeys);
                // Show wind-related keys specifically
                const windKeys = dataKeys.filter(k => k.includes('wind') || k.includes('Wind'));
                console.log(`[VFR Debug] Wind-related keys:`, windKeys);
                // Log sample values for first wind key
                if (windKeys.length > 0) {
                    console.log(`[VFR Debug] Sample ${windKeys[0]}:`, result.data.data[windKeys[0]]);
                }
                // Show cbase-related keys
                const cbaseKeys = dataKeys.filter(k => k.includes('cbase') || k.includes('cloud'));
                console.log(`[VFR Debug] Cbase/cloud-related keys:`, cbaseKeys);
                if (cbaseKeys.length > 0) {
                    console.log(`[VFR Debug] Sample ${cbaseKeys[0]}:`, result.data.data[cbaseKeys[0]]);
                }
            }
            console.log(`[VFR Debug] ========================================================`);
        }

        return result?.data?.data || null;
    } catch (error) {
        console.error('[VFR Planner] Error fetching vertical wind data:', error);
        if (enableLogging) {
            console.log(`[VFR Debug] Error details:`, error);
        }
        return null;
    }
}

/**
 * Meteogram pressure levels with approximate altitudes in feet
 * These are the levels available from getMeteogramForecastData with extended: 'true'
 * Includes all standard pressure levels from surface to stratosphere
 */
const METEOGRAM_PRESSURE_LEVELS = [
    { level: '1000h', altitudeFeet: 330 },
    { level: '975h', altitudeFeet: 1000 },
    { level: '950h', altitudeFeet: 1600 },
    { level: '925h', altitudeFeet: 2500 },
    { level: '900h', altitudeFeet: 3300 },
    { level: '850h', altitudeFeet: 5000 },
    { level: '800h', altitudeFeet: 6200 },
    { level: '700h', altitudeFeet: 10000 },
    { level: '600h', altitudeFeet: 14000 },
    { level: '500h', altitudeFeet: 18000 },
    { level: '400h', altitudeFeet: 23500 },
    { level: '300h', altitudeFeet: 30000 },
    { level: '250h', altitudeFeet: 34000 },
    { level: '200h', altitudeFeet: 39000 },
    { level: '150h', altitudeFeet: 45000 },
    { level: '100h', altitudeFeet: 53000 },
];

/**
 * Extracts wind at a specific altitude from meteogram vertical data
 * Interpolates between pressure levels based on altitude
 * @param meteogramData - Data from getMeteogramForecastData with extended: 'true'
 * @param altitudeFt - Target altitude in feet MSL
 * @param timeIndex - Index in the time series (0 for current)
 * @param enableLogging - Enable debug logging
 * @returns Wind speed (knots) and direction (degrees), or null if not available
 */
export function getWindAtAltitudeFromMeteogram(
    meteogramData: any,
    altitudeFt: number,
    timeIndex: number = 0,
    enableLogging: boolean = false
): { windSpeed: number; windDir: number; level: string } | null {
    if (!meteogramData) return null;

    // First, get all available wind levels using dynamic key discovery
    const allWinds = getAllWindLevelsFromMeteogram(meteogramData, timeIndex, false); // Don't double-log

    if (allWinds.length === 0) {
        if (enableLogging) {
            console.log(`[VFR Debug] getWindAtAltitude: No wind levels found in meteogram data`);
        }
        return null;
    }

    // Sort by altitude
    const sortedWinds = [...allWinds].sort((a, b) => a.altitudeFeet - b.altitudeFeet);

    if (enableLogging) {
        console.log(`[VFR Debug] getWindAtAltitude: target=${altitudeFt}ft, available levels:`,
            sortedWinds.map(w => `${w.level}(${w.altitudeFeet}ft)`));
    }

    // Find bracketing levels
    let lowerWind = sortedWinds[0];
    let upperWind = sortedWinds[sortedWinds.length - 1];

    for (let i = 0; i < sortedWinds.length - 1; i++) {
        if (altitudeFt >= sortedWinds[i].altitudeFeet && altitudeFt <= sortedWinds[i + 1].altitudeFeet) {
            lowerWind = sortedWinds[i];
            upperWind = sortedWinds[i + 1];
            break;
        }
    }

    // If altitude is below lowest level, use lowest
    if (altitudeFt < sortedWinds[0].altitudeFeet) {
        lowerWind = sortedWinds[0];
        upperWind = sortedWinds[0];
    }
    // If altitude is above highest level, use highest
    if (altitudeFt > sortedWinds[sortedWinds.length - 1].altitudeFeet) {
        lowerWind = sortedWinds[sortedWinds.length - 1];
        upperWind = sortedWinds[sortedWinds.length - 1];
    }

    // Interpolate between the two levels
    let windSpeed: number;
    let windDir: number;
    let usedLevel: string;

    if (lowerWind === upperWind) {
        // Same level - no interpolation needed
        windSpeed = lowerWind.windSpeed;
        windDir = lowerWind.windDir;
        usedLevel = lowerWind.level;
    } else {
        // Interpolate
        const altRange = upperWind.altitudeFeet - lowerWind.altitudeFeet;
        const fraction = altRange > 0 ? (altitudeFt - lowerWind.altitudeFeet) / altRange : 0;

        // For wind direction, we need to handle the wrap-around at 360°
        let dirDiff = upperWind.windDir - lowerWind.windDir;
        if (dirDiff > 180) dirDiff -= 360;
        if (dirDiff < -180) dirDiff += 360;
        windDir = lowerWind.windDir + dirDiff * fraction;
        if (windDir < 0) windDir += 360;
        if (windDir >= 360) windDir -= 360;

        // Linear interpolation for speed
        windSpeed = lowerWind.windSpeed + (upperWind.windSpeed - lowerWind.windSpeed) * fraction;
        usedLevel = `${lowerWind.level}-${upperWind.level}`;

        if (enableLogging) {
            console.log(`[VFR Debug] Interpolating: ${lowerWind.level}(${lowerWind.altitudeFeet}ft) -> ${upperWind.level}(${upperWind.altitudeFeet}ft), fraction=${fraction.toFixed(2)}`);
        }
    }

    if (enableLogging) {
        console.log(`[VFR Debug] Result: ${Math.round(windDir)}° @ ${Math.round(windSpeed)}kt (level: ${usedLevel})`);
    }

    return {
        windSpeed,
        windDir,
        level: usedLevel
    };
}

/**
 * Find wind U/V key pairs dynamically from meteogram data
 * Searches for patterns like windU-850h, wind_u-850h, gh-850h, etc.
 */
function findWindKeyPairs(meteogramData: any, enableLogging: boolean = false): Map<string, { uKey: string; vKey: string }> {
    const allKeys = Object.keys(meteogramData);
    const levelKeyPairs = new Map<string, { uKey: string; vKey: string }>();

    // First, find all wind-related U keys and extract their level
    const uKeyPattern = /^(windU|wind_u|wind-u|gh)[-_]?(\d+h?)$/i;
    const vKeyPattern = /^(windV|wind_v|wind-v|gh)[-_]?(\d+h?)$/i;

    // Find all potential U keys
    const uKeysByLevel = new Map<string, string>();
    const vKeysByLevel = new Map<string, string>();

    for (const key of allKeys) {
        // Check for U component patterns
        let match = key.match(/wind.*[uU][-_]?(\d+h?)/i);
        if (match) {
            const level = match[1].endsWith('h') ? match[1] : `${match[1]}h`;
            uKeysByLevel.set(level, key);
            continue;
        }

        // Check for V component patterns
        match = key.match(/wind.*[vV][-_]?(\d+h?)/i);
        if (match) {
            const level = match[1].endsWith('h') ? match[1] : `${match[1]}h`;
            vKeysByLevel.set(level, key);
        }
    }

    if (enableLogging) {
        console.log(`[VFR Debug] Found U keys:`, Array.from(uKeysByLevel.entries()));
        console.log(`[VFR Debug] Found V keys:`, Array.from(vKeysByLevel.entries()));
    }

    // Match U and V keys by level
    for (const [level, uKey] of uKeysByLevel) {
        const vKey = vKeysByLevel.get(level);
        if (vKey) {
            levelKeyPairs.set(level, { uKey, vKey });
        }
    }

    return levelKeyPairs;
}

/**
 * Extracts wind at ALL pressure levels from meteogram data
 * Dynamically finds wind keys regardless of format (windU-850h, wind_u_850h, etc.)
 * @param meteogramData - Data from getMeteogramForecastData with extended: 'true'
 * @param timeIndex - Index in the time series (0 for current)
 * @param enableLogging - Enable debug logging
 * @returns Array of wind data at each available level
 */
export function getAllWindLevelsFromMeteogram(
    meteogramData: any,
    timeIndex: number = 0,
    enableLogging: boolean = false
): LevelWind[] {
    if (!meteogramData) return [];

    const winds: LevelWind[] = [];
    const allKeys = Object.keys(meteogramData);

    if (enableLogging) {
        console.log(`[VFR Debug] getAllWindLevels - total keys: ${allKeys.length}`);
        // Log wind-related keys
        const windKeys = allKeys.filter(k => k.toLowerCase().includes('wind'));
        console.log(`[VFR Debug] Wind-related keys:`, windKeys);
    }

    // Try dynamic key discovery first
    const keyPairs = findWindKeyPairs(meteogramData, enableLogging);

    if (keyPairs.size > 0) {
        if (enableLogging) {
            console.log(`[VFR Debug] Using dynamic key discovery, found ${keyPairs.size} level pairs`);
        }

        for (const [level, { uKey, vKey }] of keyPairs) {
            const uArr = meteogramData[uKey];
            const vArr = meteogramData[vKey];

            if (Array.isArray(uArr) && Array.isArray(vArr) && uArr.length > timeIndex && vArr.length > timeIndex) {
                const u = uArr[timeIndex];
                const v = vArr[timeIndex];

                if (typeof u === 'number' && typeof v === 'number') {
                    // Find altitude for this level - only accept known pressure levels
                    const levelInfo = METEOGRAM_PRESSURE_LEVELS.find(pl => pl.level === level);
                    if (!levelInfo) {
                        // Skip unknown levels to avoid wrong altitude calculations
                        if (enableLogging) {
                            console.log(`[VFR Debug] Skipping unknown level: ${level}`);
                        }
                        continue;
                    }

                    const speedMs = Math.sqrt(u * u + v * v);
                    const speedKt = speedMs * 1.94384;
                    // Wind direction formula: atan2(-u, -v) gives direction wind comes FROM
                    // u = eastward component (positive = wind blowing east)
                    // v = northward component (positive = wind blowing north)
                    const dir = (Math.atan2(-u, -v) * 180 / Math.PI + 360) % 360;

                    winds.push({
                        level,
                        altitudeFeet: levelInfo.altitudeFeet,
                        windSpeed: speedKt,
                        windDir: dir
                    });

                    if (enableLogging) {
                        // Detailed U/V calculation logging
                        console.log(`[VFR Debug] Level ${level} (${levelInfo.altitudeFeet}ft):`);
                        console.log(`[VFR Debug]   Raw U/V: u=${u.toFixed(2)} m/s (eastward), v=${v.toFixed(2)} m/s (northward)`);
                        console.log(`[VFR Debug]   Speed: sqrt(${u.toFixed(2)}² + ${v.toFixed(2)}²) = ${speedMs.toFixed(2)} m/s = ${speedKt.toFixed(0)} kt`);
                        console.log(`[VFR Debug]   Dir: atan2(-${u.toFixed(2)}, -${v.toFixed(2)}) = ${(Math.atan2(-u, -v) * 180 / Math.PI).toFixed(1)}° -> ${Math.round(dir)}° (normalized)`);
                    }
                }
            }
        }
    }

    // Fallback: try predefined key formats
    if (winds.length === 0) {
        if (enableLogging) {
            console.log(`[VFR Debug] Dynamic discovery found no winds, trying predefined formats...`);
        }

        for (const pl of METEOGRAM_PRESSURE_LEVELS) {
            // Try different key formats for U component
            const uKeyVariants = [
                `windU-${pl.level}`,
                `wind_u-${pl.level}`,
                `wind-u-${pl.level}`,
                `windU_${pl.level}`,
                `wind_u_${pl.level}`,
            ];
            const vKeyVariants = [
                `windV-${pl.level}`,
                `wind_v-${pl.level}`,
                `wind-v-${pl.level}`,
                `windV_${pl.level}`,
                `wind_v_${pl.level}`,
            ];

            let u: number | undefined;
            let v: number | undefined;
            let foundUKey = '';
            let foundVKey = '';

            // Find matching U key
            for (const key of uKeyVariants) {
                if (meteogramData[key] !== undefined) {
                    const arr = meteogramData[key];
                    u = Array.isArray(arr) ? arr[timeIndex] : arr;
                    foundUKey = key;
                    break;
                }
            }

            // Find matching V key
            for (const key of vKeyVariants) {
                if (meteogramData[key] !== undefined) {
                    const arr = meteogramData[key];
                    v = Array.isArray(arr) ? arr[timeIndex] : arr;
                    foundVKey = key;
                    break;
                }
            }

            if (enableLogging && pl.level === '850h') {
                console.log(`[VFR Debug] Predefined lookup for ${pl.level}: foundU=${foundUKey}(${u}), foundV=${foundVKey}(${v})`);
            }

            if (typeof u === 'number' && typeof v === 'number') {
                const speedMs = Math.sqrt(u * u + v * v);
                const speedKt = speedMs * 1.94384;
                const dir = (Math.atan2(-u, -v) * 180 / Math.PI + 360) % 360;

                winds.push({
                    level: pl.level,
                    altitudeFeet: pl.altitudeFeet,
                    windSpeed: speedKt,
                    windDir: dir
                });
            }
        }
    }

    // Sort by altitude (ascending - low to high)
    winds.sort((a, b) => a.altitudeFeet - b.altitudeFeet);

    if (enableLogging) {
        console.log(`[VFR Debug] getAllWindLevels found ${winds.length} levels:`, winds.map(w => `${w.level}(${w.altitudeFeet}ft)`));
    }

    return winds;
}

/**
 * Interpolation result containing indices and fraction for time-based interpolation
 */
interface InterpolationIndices {
    lowerIndex: number;
    upperIndex: number;
    fraction: number;
    needsInterpolation: boolean;
}

/**
 * Get interpolation indices for a target time within timestamps array
 * This allows us to interpolate between forecast timesteps like WindyVFRPlugIn does
 */
function getInterpolationIndices(timestamps: number[], targetTime?: number): InterpolationIndices {
    const target = targetTime ?? Date.now();

    // Find the bracket containing the target time
    for (let i = 0; i < timestamps.length - 1; i++) {
        if (target >= timestamps[i] && target <= timestamps[i + 1]) {
            const timeDiff = timestamps[i + 1] - timestamps[i];
            const fraction = timeDiff > 0 ? (target - timestamps[i]) / timeDiff : 0;
            return {
                lowerIndex: i,
                upperIndex: i + 1,
                fraction,
                needsInterpolation: fraction > 0 && fraction < 1,
            };
        }
    }

    // Target is outside range - find closest
    let closestIndex = 0;
    let closestDiff = Math.abs(timestamps[0] - target);

    for (let i = 1; i < timestamps.length; i++) {
        const diff = Math.abs(timestamps[i] - target);
        if (diff < closestDiff) {
            closestDiff = diff;
            closestIndex = i;
        }
    }

    return {
        lowerIndex: closestIndex,
        upperIndex: closestIndex,
        fraction: 0,
        needsInterpolation: false,
    };
}

/**
 * Interpolate between two values
 */
function interpolateValue(value0: number | null | undefined, value1: number | null | undefined, fraction: number): number | null {
    if (value0 === null || value0 === undefined || isNaN(value0)) {
        return value1 !== null && value1 !== undefined && !isNaN(value1) ? value1 : null;
    }
    if (value1 === null || value1 === undefined || isNaN(value1)) {
        return value0;
    }
    return value0 + (value1 - value0) * fraction;
}

/**
 * Get timestamp index closest to target time from forecast data (legacy, for simple lookups)
 */
function getTimestampIndex(timestamps: number[], targetTime?: number): number {
    const result = getInterpolationIndices(timestamps, targetTime);
    return result.lowerIndex;
}

/**
 * Get the available forecast time range from Windy
 */
export interface ForecastTimeRange {
    start: number;  // timestamp ms
    end: number;    // timestamp ms
    timestamps: number[];  // all available timestamps
}

export async function getForecastTimeRange(
    lat: number,
    lon: number
): Promise<ForecastTimeRange | null> {
    try {
        const product = (store.get('product') as Products) || 'ecmwf';

        // Add timeout to prevent hanging
        const fetchPromise = getPointForecastData(
            product,
            { lat, lon },
            {},
            {}
        );

        const timeoutPromise = new Promise<never>((_, reject) => {
            setTimeout(() => {
                reject(new Error('Forecast time range fetch timeout'));
            }, 10000); // 10 second timeout
        });

        const response: HttpPayload<WeatherDataPayload<DataHash>> = await Promise.race([
            fetchPromise,
            timeoutPromise,
        ]);

        const { data } = response.data;
        const timestamps = data.ts;

        if (!timestamps || timestamps.length === 0) {
            return null;
        }

        return {
            start: timestamps[0],
            end: timestamps[timestamps.length - 1],
            timestamps,
        };
    } catch (error) {
        console.error('Failed to get forecast time range:', error);
        return null;
    }
}

/**
 * Fetch weather data for a single waypoint at a specific time
 * Uses Windy Point Forecast API with pressure levels for altitude-specific wind data
 * @param altitude - Altitude in feet MSL for wind data (optional, defaults to surface)
 */
export async function fetchWaypointWeather(
    lat: number,
    lon: number,
    pluginName: string,
    targetTimestamp?: number,
    waypointName?: string,
    altitude?: number,
    enableLogging: boolean = false
): Promise<WaypointWeather | null> {
    try {
        // Get current product from store (same as Windy picker uses)
        const product = store.get('product') as Products;

        // Get bracketing pressure levels for interpolation if altitude is specified
        let bracketingLevels: ReturnType<typeof getBracketingPressureLevels> | null = null;
        let levels: string[] = ['surface'];
        
        if (altitude !== undefined && altitude > 0) {
            bracketingLevels = getBracketingPressureLevels(altitude);
            if (bracketingLevels) {
                // Request both bracketing levels plus surface for other data
                levels = ['surface', bracketingLevels.lower.level, bracketingLevels.upper.level];
                // Remove duplicates
                levels = [...new Set(levels)];
                
                if (enableLogging && waypointName) {
                    console.log(`[VFR Planner] Fetching weather for ${waypointName} at ${altitude} ft MSL`);
                    console.log(`[VFR Planner] Interpolating between ${bracketingLevels.lower.level} (${bracketingLevels.lower.altitudeFeet}ft) and ${bracketingLevels.upper.level} (${bracketingLevels.upper.altitudeFeet}ft)`);
                    console.log(`[VFR Planner] Interpolation fraction: ${(bracketingLevels.fraction * 100).toFixed(1)}%`);
                }
            } else {
                // Fallback to single level if bracketing fails
                const pressureLevel = altitudeToPressureLevel(altitude);
                levels = pressureLevel === 'surface' ? ['surface'] : ['surface', pressureLevel];
                if (enableLogging && waypointName) {
                    console.log(`[VFR Planner] Fetching weather for ${waypointName} at ${altitude} ft MSL (pressure level: ${pressureLevel})`);
                }
            }
        } else {
            if (enableLogging && waypointName) {
                console.log(`[VFR Planner] Fetching weather for ${waypointName} at surface`);
            }
        }

        // Try to use getPointForecastData with levels option first
        // If that doesn't work, we'll try the direct API call
        let response;
        let responseData: any;
        
        try {
            // First, try passing levels in options to getPointForecastData
            // This might work if Windy's plugin API supports it
            const options: Record<string, any> = {};
            if (levels.length > 0 && levels[0] !== 'surface') {
                options.levels = levels;
            }
            
            try {
                const pointForecastResponse: HttpPayload<WeatherDataPayload<DataHash>> = await getPointForecastData(
            product,
            { lat, lon },
            options,
            {}
        );

                // Check if response has level-specific data
                const data = pointForecastResponse.data?.data;
                if (data && (data[`wind-${pressureLevel}`] || data.wind)) {
                    // Response has the data we need
                    responseData = data;
                } else {
                    // No level-specific data, try direct API
                    throw new Error('No level-specific data in response');
                }
            } catch (pointForecastError) {
                // getPointForecastData doesn't support levels, try direct API call
                if (enableLogging && waypointName) {
                    console.log(`[VFR Planner] getPointForecastData doesn't support levels, trying direct API for ${waypointName}`);
                }
                
                const requestBody = {
                    lat,
                    lon,
                    model: product,
                    parameters: ['wind', 'windDir', 'temp', 'dewPoint', 'pressure', 'rh', 'mm', 'cbase', 'gust'],
                    levels: levels
                };

                // Use native fetch to call Windy's Point Forecast API
                // Note: This may require API key or may not work from plugin context
                const apiUrl = 'https://api.windy.com/api/point-forecast/v2';
                const apiResponse = await fetch(apiUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(requestBody)
                });

                const responseStatus = apiResponse.status;
                const responseStatusText = apiResponse.statusText;
                
                // Read response body once
                let responseBodyText = '';
                let apiResult: any = null;
                try {
                    responseBodyText = await apiResponse.text();
                    if (responseBodyText) {
                        apiResult = JSON.parse(responseBodyText);
                    }
                } catch (e) {
                    responseBodyText = 'Could not parse response';
                }

                if (!apiResponse.ok) {
                    throw new Error(`Point Forecast API returned ${responseStatus}: ${responseStatusText}`);
                }

                responseData = apiResult?.data || apiResult;
            }
        } catch (apiError) {
            // If both methods fail, fall back to getPointForecastData for surface data
            if (enableLogging && waypointName) {
                console.warn(`[VFR Planner] Point Forecast API failed for ${waypointName}, falling back to surface data:`, apiError);
            }
            // Fall back to original method for surface data only
            const fallbackResponse: HttpPayload<WeatherDataPayload<DataHash>> = await getPointForecastData(
                product,
                { lat, lon },
                {},
                {}
            );
            // Use the fallback response data (surface level only)
            responseData = fallbackResponse.data?.data;
            // Clear bracketing levels since we're using surface data only
            bracketingLevels = null;
            if (enableLogging && waypointName) {
                console.log(`[VFR Planner] Using surface data fallback for ${waypointName}`);
            }
        }

        // The response has data keys like 'wind-surface', 'wind-850h', 'windDir-850h', etc.
        // responseData is already set above

        // Debug: log available data keys and wind at all levels
        if (enableLogging && waypointName) {
            console.log(`[VFR Debug] Response data keys for ${waypointName}:`, Object.keys(responseData || {}));

            // Check for wind-specific keys
            const windKeys = Object.keys(responseData || {}).filter(k => k.includes('wind'));
            console.log(`[VFR Debug] Wind-related keys:`, windKeys);

            // Log wind at all available pressure levels
            const levels = [
                { key: 'surface', alt: '10m AGL', desc: 'Surface wind' },
                { key: '1000h', alt: '330 ft', desc: 'Near surface' },
                { key: '950h', alt: '1,600 ft', desc: 'Low level' },
                { key: '900h', alt: '3,300 ft', desc: 'Boundary layer' },
                { key: '850h', alt: '5,000 ft', desc: 'GA / Low clouds' },
                { key: '700h', alt: '10,000 ft', desc: 'Mid-altitude' },
                { key: '500h', alt: '18,000 ft', desc: 'Mid-troposphere' },
                { key: '300h', alt: '30,000 ft', desc: 'Jet stream' },
                { key: '200h', alt: '39,000 ft', desc: 'Upper troposphere' },
            ];

            console.log(`[VFR Debug] ===== Wind at all levels for ${waypointName} =====`);
            levels.forEach(level => {
                const windKey = level.key === 'surface' ? 'wind' : `wind-${level.key}`;
                const windDirKey = level.key === 'surface' ? 'windDir' : `windDir-${level.key}`;

                const windArr = responseData[windKey] || responseData[`wind-${level.key}`];
                const windDirArr = responseData[windDirKey] || responseData[`windDir-${level.key}`];

                if (windArr && windDirArr) {
                    // Get first value (current time) and convert m/s to knots
                    const windMs = windArr[0];
                    const windKt = Math.round(windMs * 1.94384);
                    const windDeg = Math.round(windDirArr[0]);
                    console.log(`[VFR Debug]   ${level.key.padEnd(8)} (${level.alt.padEnd(10)}): ${String(windDeg).padStart(3, '0')}° @ ${String(windKt).padStart(2)}kt - ${level.desc}`);
                } else {
                    console.log(`[VFR Debug]   ${level.key.padEnd(8)} (${level.alt.padEnd(10)}): N/A - ${level.desc}`);
                }
            });
            console.log(`[VFR Debug] ================================================`);
        }

        // Get wind data at flight altitude using meteogram vertical data
        let windSpeed: number | undefined;
        let windDir: number | undefined;
        let gustData: number[] | undefined;
        let usedPressureLevel = 'surface';
        let verticalWinds: LevelWind[] = [];

        // Fetch meteogram data for vertical wind levels
        console.log(`[VFR Debug] Fetching meteogram for ${waypointName}, altitude=${altitude}...`);
        const meteogramData = await fetchVerticalWindData(lat, lon, true); // Always log for debugging
        console.log(`[VFR Debug] Meteogram result for ${waypointName}:`, meteogramData ? `${Object.keys(meteogramData).length} keys` : 'NULL');

        if (meteogramData) {
            // Get all wind levels
            verticalWinds = getAllWindLevelsFromMeteogram(meteogramData, 0, true); // Always log for debugging
            console.log(`[VFR Debug] Extracted ${verticalWinds.length} vertical wind levels`);

            if (enableLogging && waypointName) {
                console.log(`[VFR Planner] Vertical winds for ${waypointName}:`, verticalWinds.map(w =>
                    `${w.level}(${w.altitudeFeet}ft): ${Math.round(w.windDir)}°@${Math.round(w.windSpeed)}kt`
                ).join(', '));
            }

            // Try to get altitude-specific wind
            if (altitude !== undefined && altitude > 0) {
                const altitudeWind = getWindAtAltitudeFromMeteogram(meteogramData, altitude, 0, enableLogging);
                if (altitudeWind) {
                    windSpeed = altitudeWind.windSpeed;
                    windDir = altitudeWind.windDir;
                    usedPressureLevel = altitudeWind.level;

                    if (enableLogging && waypointName) {
                        console.log(`[VFR Planner] ✓ Wind at ${altitude}ft for ${waypointName}: ${Math.round(windDir)}° @ ${Math.round(windSpeed)}kt (level: ${usedPressureLevel})`);
                    }
                }
            }
        }

        // Fallback to surface wind from point forecast if altitude wind not available
        let windData: number[] | undefined;
        let windDirData: number[] | undefined;

        // ALWAYS get surface wind from point forecast for comparison
        const surfaceWindData = responseData['wind-surface'] || responseData.wind;
        const surfaceWindDirData = responseData['windDir-surface'] || responseData.windDir;

        // Log comparison between point forecast and meteogram
        if (surfaceWindData && surfaceWindDirData && waypointName) {
            const pfWindSpeedMs = surfaceWindData[0];
            const pfWindSpeedKt = pfWindSpeedMs * 1.94384;
            const pfWindDir = surfaceWindDirData[0];
            console.log(`[VFR Debug] === WIND DATA COMPARISON for ${waypointName} ===`);
            console.log(`[VFR Debug] Point Forecast (what Windy shows):`);
            console.log(`[VFR Debug]   Surface wind: ${Math.round(pfWindDir)}° @ ${Math.round(pfWindSpeedKt)} kt`);

            if (verticalWinds.length > 0) {
                const surfaceFromMeteogram = verticalWinds.find(w => w.level === '1000h' || w.altitudeFeet < 1000);
                if (surfaceFromMeteogram) {
                    console.log(`[VFR Debug] Meteogram (calculated from U/V):`);
                    console.log(`[VFR Debug]   ${surfaceFromMeteogram.level}: ${Math.round(surfaceFromMeteogram.windDir)}° @ ${Math.round(surfaceFromMeteogram.windSpeed)} kt`);
                    const dirDiff = Math.abs(pfWindDir - surfaceFromMeteogram.windDir);
                    const speedDiff = Math.abs(pfWindSpeedKt - surfaceFromMeteogram.windSpeed);
                    if (dirDiff > 10 || speedDiff > 5) {
                        console.log(`[VFR Debug] ⚠️ DISCREPANCY DETECTED!`);
                        console.log(`[VFR Debug]   Direction diff: ${dirDiff.toFixed(0)}°, Speed diff: ${speedDiff.toFixed(0)} kt`);
                    }
                }
            }

            if (windSpeed !== undefined && windDir !== undefined) {
                console.log(`[VFR Debug] Selected altitude wind (${usedPressureLevel}):`);
                console.log(`[VFR Debug]   ${Math.round(windDir)}° @ ${Math.round(windSpeed)} kt`);
            }
            console.log(`[VFR Debug] ==========================================`);
        }

        if (windSpeed === undefined || windDir === undefined) {
            usedPressureLevel = 'surface';
            windData = surfaceWindData;
            windDirData = surfaceWindDirData;
            gustData = responseData['gust-surface'] || responseData.gust;

            if (enableLogging && waypointName) {
                console.log(`[VFR Debug] Falling back to surface wind for ${waypointName}:`, {
                    windDataFound: !!windData,
                    windDirDataFound: !!windDirData,
                    windSample: windData?.slice?.(0, 3),
                    windDirSample: windDirData?.slice?.(0, 3)
                });
            }
        } else {
            // We have altitude wind, but still get gust from surface
            gustData = responseData['gust-surface'] || responseData.gust;
        }

        // Get other data from surface level
        const tempData = responseData['temp-surface'] || responseData.temp;
        const dewPointData = responseData['dewPoint-surface'] || responseData.dewPoint;
        const pressureData = responseData['pressure-surface'] || responseData.pressure;
        const rhData = responseData['rh-surface'] || responseData.rh;
        const mmData = responseData['mm-surface'] || responseData.mm;

        // Try to get cbase from meteogram data first, then fall back to point forecast
        let cbaseData: number[] | undefined;
        let cbaseSource = 'none';

        if (meteogramData) {
            // Check for cbase in meteogram data (try various possible key names)
            const meteogramCbase = meteogramData['cbase-surface'] || meteogramData['cbase'] ||
                                   meteogramData['cloudBase-surface'] || meteogramData['cloudBase'];
            if (meteogramCbase && Array.isArray(meteogramCbase) && meteogramCbase.length > 0) {
                cbaseData = meteogramCbase;
                cbaseSource = 'meteogram';
                if (enableLogging) {
                    console.log(`[VFR Debug] Using cbase from MeteogramForecastData for ${waypointName}:`, {
                        dataLength: cbaseData.length,
                        sample: cbaseData.slice(0, 5),
                        allKeys: Object.keys(meteogramData).filter(k => k.includes('cbase') || k.includes('cloud'))
                    });
                }
            }
        }

        // Fall back to point forecast cbase if meteogram doesn't have it
        if (!cbaseData) {
            cbaseData = responseData['cbase-surface'] || responseData.cbase;
            if (cbaseData) {
                cbaseSource = 'pointForecast';
                if (enableLogging) {
                    console.log(`[VFR Debug] Using cbase from PointForecastData for ${waypointName}:`, {
                        dataLength: cbaseData?.length,
                        sample: cbaseData?.slice(0, 5)
                    });
                }
            }
        }

        if (enableLogging) {
            console.log(`[VFR Debug] Cbase source for ${waypointName}: ${cbaseSource}`);
        }

        // Get timestamps - use meteogram timestamps if cbase comes from meteogram
        let timestamps: number[] = [];
        let cbaseTimestamps: number[] | undefined;

        if (cbaseSource === 'meteogram' && meteogramData) {
            // Meteogram has its own timestamps
            cbaseTimestamps = meteogramData.ts || meteogramData['ts-surface'];
            timestamps = responseData.ts || responseData['ts-surface'] || cbaseTimestamps || [];
            if (enableLogging && cbaseTimestamps) {
                console.log(`[VFR Debug] Meteogram timestamps for ${waypointName}:`, {
                    count: cbaseTimestamps.length,
                    first: cbaseTimestamps[0] ? new Date(cbaseTimestamps[0]).toISOString() : 'N/A',
                    last: cbaseTimestamps[cbaseTimestamps.length - 1] ? new Date(cbaseTimestamps[cbaseTimestamps.length - 1]).toISOString() : 'N/A'
                });
            }
        } else {
            timestamps = responseData.ts || responseData['ts-surface'] || [];
        }

        if (!timestamps || timestamps.length === 0) {
            if (enableLogging) {
                console.error(`[VFR Planner] No timestamp data for ${waypointName}`);
            }
            return null;
        }

        // Use target timestamp if provided, otherwise use Windy's current timestamp
        const windyTimestamp = store.get('timestamp') as number;
        const effectiveTimestamp = targetTimestamp ?? windyTimestamp ?? Date.now();

        // Interpolate to get values at the target time
        const interp = getInterpolationIndices(timestamps, effectiveTimestamp);
        const { lowerIndex, upperIndex, fraction, needsInterpolation } = interp;

        // Extract wind data - use altitude wind if available, otherwise interpolate from surface arrays
        let finalWindSpeed: number;
        let finalWindDir: number;

        if (windSpeed !== undefined && windDir !== undefined) {
            // Use altitude-specific wind (already in knots)
            finalWindSpeed = windSpeed;
            finalWindDir = windDir;
        } else {
            // Fallback: interpolate from surface wind arrays
            const windLower = windData?.[lowerIndex] || 0;
            const windUpper = windData?.[upperIndex] || 0;
            const windMs = needsInterpolation
                ? interpolateValue(windLower, windUpper, fraction) ?? 0
                : windLower;
            finalWindSpeed = msToKnots(windMs);

            const windDirLower = windDirData?.[lowerIndex] || 0;
            const windDirUpper = windDirData?.[upperIndex] || 0;
            finalWindDir = windDirLower;
            if (needsInterpolation && windDirData) {
                let diff = windDirUpper - windDirLower;
                if (diff > 180) diff -= 360;
                if (diff < -180) diff += 360;
                finalWindDir = windDirLower + diff * fraction;
                if (finalWindDir < 0) finalWindDir += 360;
                if (finalWindDir >= 360) finalWindDir -= 360;
            }
        }

        // Extract other weather data
        const tempLower = tempData?.[lowerIndex] || 273.15;
        const tempUpper = tempData?.[upperIndex] || 273.15;
        const tempKelvin = needsInterpolation
            ? interpolateValue(tempLower, tempUpper, fraction) ?? 273.15
            : tempLower;
        const tempCelsius = kelvinToCelsius(tempKelvin);

        let dewPointCelsius: number | undefined;
        if (dewPointData) {
            const dewLower = dewPointData[lowerIndex];
            const dewUpper = dewPointData[upperIndex];
            const dewKelvin = needsInterpolation
                ? interpolateValue(dewLower, dewUpper, fraction)
                : dewLower;
            if (dewKelvin !== null && dewKelvin !== undefined && !isNaN(dewKelvin)) {
                dewPointCelsius = kelvinToCelsius(dewKelvin);
            }
        }

        // Cloud base (from meteogram or surface level)
        // Use ceiling calculation method setting to determine how to handle forecast data
        let cloudBase: number | undefined;
        let cloudBaseDisplay: string | undefined;

        // Default clear sky value in meters (29999 ft = ~9144 m)
        const CLEAR_SKY_METERS = 9144;

        if (cbaseData && Array.isArray(cbaseData) && cbaseData.length > 0) {
            // Use meteogram timestamps for interpolation if cbase comes from meteogram
            let cbaseLowerIdx = lowerIndex;
            let cbaseUpperIdx = upperIndex;
            let cbaseFraction = fraction;
            let cbaseNeedsInterp = needsInterpolation;

            if (cbaseSource === 'meteogram' && cbaseTimestamps && cbaseTimestamps.length > 0) {
                // Recalculate interpolation indices for meteogram timestamps
                const meteogramInterp = getInterpolationIndices(cbaseTimestamps, effectiveTimestamp);
                cbaseLowerIdx = meteogramInterp.lowerIndex;
                cbaseUpperIdx = meteogramInterp.upperIndex;
                cbaseFraction = meteogramInterp.fraction;
                cbaseNeedsInterp = meteogramInterp.needsInterpolation;

                if (enableLogging) {
                    console.log(`[VFR Debug] Meteogram cbase interpolation for ${waypointName}:`, {
                        lowerIdx: cbaseLowerIdx,
                        upperIdx: cbaseUpperIdx,
                        fraction: cbaseFraction.toFixed(2),
                        needsInterp: cbaseNeedsInterp
                    });
                }
            }

            const cbaseLower = cbaseData[cbaseLowerIdx];
            const cbaseUpper = cbaseData[cbaseUpperIdx];
            const isLowerValid = cbaseLower !== null && cbaseLower !== undefined && !isNaN(cbaseLower) && cbaseLower > 0;
            const isUpperValid = cbaseUpper !== null && cbaseUpper !== undefined && !isNaN(cbaseUpper) && cbaseUpper > 0;

            let cbaseValue: number | null = null;

            // Always interpolate between lower and upper values
            if (cbaseNeedsInterp && isLowerValid && isUpperValid) {
                cbaseValue = interpolateValue(cbaseLower, cbaseUpper, cbaseFraction);
            } else if (isLowerValid) {
                cbaseValue = cbaseLower;
            } else if (isUpperValid) {
                cbaseValue = cbaseUpper;
            } else {
                cbaseValue = CLEAR_SKY_METERS; // Clear sky
            }

            if (enableLogging) {
                console.log(`[VFR Cbase Debug] ${waypointName || 'unknown'}: source=${cbaseSource}, timestamp=${new Date(effectiveTimestamp).toISOString()}, lowerIndex=${cbaseLowerIdx}, upperIndex=${cbaseUpperIdx}, fraction=${cbaseFraction.toFixed(2)}, cbaseLower=${cbaseLower}m (${cbaseLower ? Math.round(metersToFeet(cbaseLower)) : 'CLR'}ft), cbaseUpper=${cbaseUpper}m (${cbaseUpper ? Math.round(metersToFeet(cbaseUpper)) : 'CLR'}ft), final=${cbaseValue}m (${cbaseValue ? Math.round(metersToFeet(cbaseValue)) : 'CLR'}ft)`);
            }

            if (cbaseValue !== null && cbaseValue !== undefined && !isNaN(cbaseValue) && cbaseValue > 0) {
                cloudBase = cbaseValue;
                const cloudBaseFeet = metersToFeet(cloudBase);
                // Show CLR for clear sky (29999 ft)
                if (cloudBaseFeet >= 29000) {
                    cloudBaseDisplay = 'CLR';
                } else {
                    cloudBaseDisplay = `${Math.round(cloudBaseFeet)} ft`;
                }
            }
        } else {
            // No cbase data at all - treat as clear sky
            cloudBase = CLEAR_SKY_METERS;
            cloudBaseDisplay = 'CLR';
        }

        // Extract gust data
        const gustMs = gustData ? (needsInterpolation
            ? interpolateValue(gustData[lowerIndex], gustData[upperIndex], fraction) ?? 0
            : gustData[lowerIndex] || 0) : undefined;

        // Extract surface wind for terminal operations (departure/arrival)
        let surfaceWindSpeedKt: number | undefined;
        let surfaceWindDirDeg: number | undefined;
        if (surfaceWindData && surfaceWindDirData) {
            const surfaceWindLower = surfaceWindData[lowerIndex] || 0;
            const surfaceWindUpper = surfaceWindData[upperIndex] || 0;
            const surfaceWindMs = needsInterpolation
                ? interpolateValue(surfaceWindLower, surfaceWindUpper, fraction) ?? 0
                : surfaceWindLower;
            surfaceWindSpeedKt = msToKnots(surfaceWindMs);

            const surfaceDirLower = surfaceWindDirData[lowerIndex] || 0;
            const surfaceDirUpper = surfaceWindDirData[upperIndex] || 0;
            surfaceWindDirDeg = surfaceDirLower;
            if (needsInterpolation) {
                let diff = surfaceDirUpper - surfaceDirLower;
                if (diff > 180) diff -= 360;
                if (diff < -180) diff += 360;
                surfaceWindDirDeg = surfaceDirLower + diff * fraction;
                if (surfaceWindDirDeg < 0) surfaceWindDirDeg += 360;
                if (surfaceWindDirDeg >= 360) surfaceWindDirDeg -= 360;
            }
        }

        const weather: WaypointWeather = {
            windSpeed: finalWindSpeed,
            windDir: finalWindDir,
            windGust: gustMs !== undefined ? msToKnots(gustMs) : undefined,
            windAltitude: altitude, // Store the altitude at which wind was fetched
            windLevel: usedPressureLevel,
            surfaceWindSpeed: surfaceWindSpeedKt,
            surfaceWindDir: surfaceWindDirDeg,
            verticalWinds: verticalWinds.length > 0 ? verticalWinds : undefined,
            temperature: tempCelsius,
            dewPoint: dewPointCelsius,
            pressure: pressureData ? (needsInterpolation
                ? (interpolateValue(pressureData[lowerIndex], pressureData[upperIndex], fraction) ?? 0) / 100
                : (pressureData[lowerIndex] || 0) / 100) : undefined, // Pa to hPa
            cloudBase,
            cloudBaseDisplay,
            humidity: rhData ? (needsInterpolation
                ? interpolateValue(rhData[lowerIndex], rhData[upperIndex], fraction) ?? undefined
                : rhData[lowerIndex]) : undefined,
            visibility: rhData ? estimateVisibility(needsInterpolation
                ? interpolateValue(rhData[lowerIndex], rhData[upperIndex], fraction) ?? 0
                : rhData[lowerIndex] || 0) : undefined,
            precipitation: mmData ? (needsInterpolation
                ? interpolateValue(mmData[lowerIndex], mmData[upperIndex], fraction) ?? undefined
                : mmData[lowerIndex]) : undefined,
            timestamp: timestamps[lowerIndex],
        };

        if (enableLogging && waypointName) {
            console.log(`[VFR Planner] Fetched weather for ${waypointName} at ${usedPressureLevel}:`, {
                windSpeed: `${Math.round(weather.windSpeed)} kt`,
                windDir: `${Math.round(weather.windDir)}°`,
                windAltitude: weather.windAltitude ? `${weather.windAltitude} ft MSL` : 'surface',
                temperature: `${Math.round(weather.temperature)}°C`,
                pressureLevel: usedPressureLevel
            });
        }

        return weather;
    } catch (error) {
        console.error('Failed to fetch weather for waypoint:', error);
        return null;
    }
}

/**
 * Fetch weather for all waypoints in a flight plan
 * @param waypoints - Array of waypoints with ETE data
 * @param pluginName - Plugin name for API calls
 * @param departureTime - Optional departure timestamp (ms). If provided, weather is fetched for estimated arrival time at each waypoint
 * @param altitude - Altitude in feet MSL for wind data (optional, defaults to surface)
 */
export async function fetchFlightPlanWeather(
    waypoints: Waypoint[],
    pluginName: string,
    departureTime?: number,
    altitude?: number,
    enableLogging: boolean = false
): Promise<Map<string, WaypointWeather>> {
    const weatherMap = new Map<string, WaypointWeather>();

    // Calculate cumulative ETE to get arrival time at each waypoint
    let cumulativeEteMinutes = 0;

    // Fetch weather for all waypoints in parallel with individual error handling
    const promises = waypoints.map(async (wp, index) => {
        try {
            // Calculate target time for this waypoint
            let targetTime: number | undefined;

            if (departureTime) {
                // Add cumulative ETE to departure time
                targetTime = departureTime + (cumulativeEteMinutes * 60 * 1000);
            }

            // Add this waypoint's ETE to cumulative for next waypoint
            cumulativeEteMinutes += wp.ete || 0;

            // Add timeout to prevent hanging (15 seconds per waypoint)
            const weatherPromise = fetchWaypointWeather(wp.lat, wp.lon, pluginName, targetTime, wp.name, altitude, enableLogging);
            
            const timeoutPromise = new Promise<null>((resolve) => {
                setTimeout(() => {
                    if (enableLogging) {
                        console.warn(`[VFR] Weather fetch timeout for waypoint ${wp.name} (${wp.id})`);
                    }
                    resolve(null);
                }, 15000); // Reduced to 15 seconds
            });

            const weather = await Promise.race([weatherPromise, timeoutPromise]);

            if (weather) {
                weatherMap.set(wp.id, weather);
            }
        } catch (error) {
            // Individual waypoint errors shouldn't stop the entire operation
            if (enableLogging) {
                console.error(`[VFR] Error fetching weather for waypoint ${wp.name} (${wp.id}):`, error);
            }
            // Continue with other waypoints even if one fails
        }
    });

    // Use allSettled to ensure all promises complete (even if some fail)
    await Promise.allSettled(promises);

    return weatherMap;
}

/**
 * Check for weather alerts at a waypoint
 * @param weather - Weather data for the waypoint
 * @param thresholds - Alert thresholds
 * @param plannedAltitude - Planned flight altitude in feet (optional, for altitude conflict check)
 */
export function checkWeatherAlerts(
    weather: WaypointWeather,
    thresholds: WeatherAlertThresholds = DEFAULT_ALERT_THRESHOLDS,
    plannedAltitude?: number
): WeatherAlert[] {
    const alerts: WeatherAlert[] = [];

    // Wind speed alert
    if (weather.windSpeed >= thresholds.windSpeed) {
        alerts.push({
            type: 'wind',
            severity: weather.windSpeed >= thresholds.windSpeed * 1.5 ? 'warning' : 'caution',
            message: `Wind ${Math.round(weather.windSpeed)} kt`,
            value: weather.windSpeed,
            threshold: thresholds.windSpeed,
        });
    }

    // Gust alert
    if (weather.windGust && weather.windGust >= thresholds.gustSpeed) {
        alerts.push({
            type: 'gust',
            severity: weather.windGust >= thresholds.gustSpeed * 1.3 ? 'warning' : 'caution',
            message: `Gust ${Math.round(weather.windGust)} kt`,
            value: weather.windGust,
            threshold: thresholds.gustSpeed,
        });
    }

    // Visibility alert
    if (weather.visibility && weather.visibility < thresholds.visibility) {
        alerts.push({
            type: 'visibility',
            severity: weather.visibility < thresholds.visibility / 2 ? 'warning' : 'caution',
            message: `Vis ${weather.visibility.toFixed(1)} km`,
            value: weather.visibility,
            threshold: thresholds.visibility,
        });
    }

    // Cloud base alert
    // Note: weather.cloudBase is in meters AGL, but thresholds.cloudBase is in feet
    if (weather.cloudBase) {
        const cloudBaseFeet = metersToFeet(weather.cloudBase);
        // Use rounded value (no decimals)
        const ceilingDisplay = `${Math.round(cloudBaseFeet)} ft`;
        
        if (cloudBaseFeet < thresholds.cloudBase) {
            alerts.push({
                type: 'ceiling',
                severity: cloudBaseFeet < thresholds.cloudBase / 2 ? 'warning' : 'caution',
                message: `Ceiling ${ceilingDisplay}`,
                value: cloudBaseFeet,
                threshold: thresholds.cloudBase,
            });
        }

        // Altitude conflict alert: cloud ceiling below planned altitude
        if (plannedAltitude !== undefined && plannedAltitude > 0 && cloudBaseFeet < plannedAltitude) {
            const margin = plannedAltitude - cloudBaseFeet;
            // Use rounded value for planned altitude
            const plannedAltDisplay = `${Math.round(plannedAltitude)} ft`;
            alerts.push({
                type: 'altitude-conflict',
                severity: margin > 500 ? 'warning' : 'caution', // Warning if more than 500ft below
                message: `Ceiling ${ceilingDisplay} below planned ${plannedAltDisplay}`,
                value: cloudBaseFeet,
                threshold: plannedAltitude,
            });
        }
    }

    // Precipitation alert
    if (weather.precipitation && weather.precipitation >= thresholds.precipitation) {
        alerts.push({
            type: 'rain',
            severity: weather.precipitation >= thresholds.precipitation * 2 ? 'warning' : 'caution',
            message: `Rain ${weather.precipitation.toFixed(1)} mm`,
            value: weather.precipitation,
            threshold: thresholds.precipitation,
        });
    }

    return alerts;
}

/**
 * Format wind for display
 */
export function formatWind(speed: number, direction: number, altitude?: number): string {
    const dir = Math.round(direction).toString().padStart(3, '0');
    const speedStr = `${dir}°/${Math.round(speed)} kt`;
    if (altitude !== undefined && altitude > 0) {
        return `${speedStr} @ ${Math.round(altitude)}ft`;
    }
    return speedStr;
}

/**
 * Format temperature for display
 */
export function formatTemperature(celsius: number): string {
    return `${Math.round(celsius)}°C`;
}

/**
 * Format cloud base for display without rounding
 * Shows value with 1 decimal place precision
 */
export function formatCloudBase(cloudBaseMeters: number): string {
    const cloudBaseFeet = metersToFeet(cloudBaseMeters);
    // Show with 1 decimal place for precision
    return `${cloudBaseFeet.toFixed(1)} ft`;
}

/**
 * Get the full cbase table for a location
 * Returns all cloud base values with their timestamps
 */
export async function getCbaseTable(
    lat: number,
    lon: number,
    waypointName?: string,
    enableLogging: boolean = false
): Promise<Array<{ timestamp: number; timestampISO: string; cbase: number | null; cbaseFeet: number | null }> | null> {
    try {
        const product = store.get('product') as Products;

        const response: HttpPayload<WeatherDataPayload<DataHash>> = await getPointForecastData(
            product,
            { lat, lon },
            {},
            {}
        );

        const { data } = response.data;

        if (!data.cbase || !Array.isArray(data.cbase) || data.cbase.length === 0) {
            if (enableLogging) {
                console.log('[VFR] cbase table:', {
                    waypoint: waypointName || 'Unknown',
                    message: 'Not available for this location',
                });
            }
            return null;
        }

        const cbaseTable = data.ts.map((ts: number, idx: number) => {
            const cb = data.cbase?.[idx];
            const hasValue = cb !== null && cb !== undefined && !isNaN(cb) && cb > 0;
            return {
                timestamp: ts,
                timestampISO: new Date(ts).toISOString(),
                cbase: hasValue ? cb : null,
                cbaseFeet: hasValue ? metersToFeet(cb) : null,
            };
        });

        if (enableLogging) {
            console.log('[VFR] Full cbase table:', {
                waypoint: waypointName || 'Unknown',
                location: { lat, lon },
                product,
                totalPoints: cbaseTable.length,
                table: cbaseTable,
            });
        }

        return cbaseTable;
    } catch (error) {
        console.error('Failed to get cbase table:', error);
        return null;
    }
}
