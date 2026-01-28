/**
 * Vertical wind profile service
 * Handles fetching and processing wind data at multiple pressure levels
 */

import { getMeteogramForecastData } from '@windy/fetch';
import type { WindyMeteogramData } from '../types/weather';
import { METEOGRAM_PRESSURE_LEVELS } from './altitudeToWindService';
import { logger } from './logger';

/** Wind data at a specific pressure level */
export interface LevelWind {
    level: string;          // e.g., '850h', '700h'
    altitudeFeet: number;   // approximate altitude in feet
    windSpeed: number;      // knots
    windDir: number;        // degrees
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
): Promise<WindyMeteogramData | null> {
    try {
        // Log the request parameters
        const requestParams = {
            model: 'ecmwf',
            location: { lat, lon, step: 1 },
            options: { extended: 'true' }
        };

        if (enableLogging) {
            logger.debug(`[Weather] ========== getMeteogramForecastData REQUEST ==========`);
            logger.debug(`[Weather] Request params:`, JSON.stringify(requestParams, null, 2));
        }

        // Use getMeteogramForecastData with extended: 'true' to get all pressure levels
        // This is the approach used by flyxc windy-sounding plugin
        const result = await getMeteogramForecastData(
            'ecmwf' as any,  // model
            { lat, lon, step: 1 },  // location with step
            { extended: 'true' }  // extended option to get all pressure levels
        );

        if (enableLogging) {
            logger.debug(`[Weather] ========== getMeteogramForecastData RAW RESPONSE ==========`);
            logger.debug(`[Weather] Full result object:`, result);
            logger.debug(`[Weather] Result type:`, typeof result);
            logger.debug(`[Weather] Result keys:`, result ? Object.keys(result) : 'null');

            if (result?.data) {
                logger.debug(`[Weather] result.data keys:`, Object.keys(result.data));
                logger.debug(`[Weather] result.data:`, result.data);
            }

            if (result?.data?.data) {
                const dataKeys = Object.keys(result.data.data);
                logger.debug(`[Weather] result.data.data keys (${dataKeys.length}):`, dataKeys);
                // Show wind-related keys specifically
                const windKeys = dataKeys.filter(k => k.includes('wind') || k.includes('Wind'));
                logger.debug(`[Weather] Wind-related keys:`, windKeys);
                // Log sample values for first wind key
                if (windKeys.length > 0) {
                    logger.debug(`[Weather] Sample ${windKeys[0]}:`, result.data.data[windKeys[0]]);
                }
                // Show cbase-related keys
                const cbaseKeys = dataKeys.filter(k => k.includes('cbase') || k.includes('cloud'));
                logger.debug(`[Weather] Cbase/cloud-related keys:`, cbaseKeys);
                if (cbaseKeys.length > 0) {
                    logger.debug(`[Weather] Sample ${cbaseKeys[0]}:`, result.data.data[cbaseKeys[0]]);
                }
            }
            logger.debug(`[Weather] ========================================================`);
        }

        return result?.data?.data || null;
    } catch (error) {
        logger.error('[Weather] Error fetching vertical wind data:', error);
        if (enableLogging) {
            logger.debug(`[Weather] Error details:`, error);
        }
        return null;
    }
}

/**
 * Find wind U/V key pairs dynamically from meteogram data
 * Searches for patterns like windU-850h, wind_u-850h, gh-850h, etc.
 */
export function findWindKeyPairs(
    meteogramData: WindyMeteogramData,
    enableLogging: boolean = false
): Map<string, { uKey: string; vKey: string }> {
    if (!meteogramData) return new Map();

    const allKeys = Object.keys(meteogramData);
    const levelKeyPairs = new Map<string, { uKey: string; vKey: string }>();

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
        logger.debug(`[Weather] Found U keys:`, Array.from(uKeysByLevel.entries()));
        logger.debug(`[Weather] Found V keys:`, Array.from(vKeysByLevel.entries()));
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
    meteogramData: WindyMeteogramData,
    timeIndex: number = 0,
    enableLogging: boolean = false
): LevelWind[] {
    if (!meteogramData) return [];

    const winds: LevelWind[] = [];
    const allKeys = Object.keys(meteogramData);

    if (enableLogging) {
        logger.debug(`[Weather] getAllWindLevels - total keys: ${allKeys.length}`);
        // Log wind-related keys
        const windKeys = allKeys.filter(k => k.toLowerCase().includes('wind'));
        logger.debug(`[Weather] Wind-related keys:`, windKeys);
    }

    // Try dynamic key discovery first
    const keyPairs = findWindKeyPairs(meteogramData, enableLogging);

    if (keyPairs.size > 0) {
        if (enableLogging) {
            logger.debug(`[Weather] Using dynamic key discovery, found ${keyPairs.size} level pairs`);
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
                            logger.debug(`[Weather] Skipping unknown level: ${level}`);
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
                        logger.debug(`[Weather] Level ${level} (${levelInfo.altitudeFeet}ft):`);
                        logger.debug(`[Weather]   Raw U/V: u=${u.toFixed(2)} m/s (eastward), v=${v.toFixed(2)} m/s (northward)`);
                        logger.debug(`[Weather]   Speed: sqrt(${u.toFixed(2)}² + ${v.toFixed(2)}²) = ${speedMs.toFixed(2)} m/s = ${speedKt.toFixed(0)} kt`);
                        logger.debug(`[Weather]   Dir: atan2(-${u.toFixed(2)}, -${v.toFixed(2)}) = ${(Math.atan2(-u, -v) * 180 / Math.PI).toFixed(1)}° -> ${Math.round(dir)}° (normalized)`);
                    }
                }
            }
        }
    }

    // Fallback: try predefined key formats
    if (winds.length === 0) {
        if (enableLogging) {
            logger.debug(`[Weather] Dynamic discovery found no winds, trying predefined formats...`);
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
                logger.debug(`[Weather] Predefined lookup for ${pl.level}: foundU=${foundUKey}(${u}), foundV=${foundVKey}(${v})`);
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
        logger.debug(`[Weather] getAllWindLevels found ${winds.length} levels:`, winds.map(w => `${w.level}(${w.altitudeFeet}ft)`));
    }

    return winds;
}

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
    meteogramData: WindyMeteogramData,
    altitudeFt: number,
    timeIndex: number = 0,
    enableLogging: boolean = false
): { windSpeed: number; windDir: number; level: string } | null {
    if (!meteogramData) return null;

    // First, get all available wind levels using dynamic key discovery
    const allWinds = getAllWindLevelsFromMeteogram(meteogramData, timeIndex, false); // Don't double-log

    if (allWinds.length === 0) {
        if (enableLogging) {
            logger.debug(`[Weather] getWindAtAltitude: No wind levels found in meteogram data`);
        }
        return null;
    }

    // Sort by altitude
    const sortedWinds = [...allWinds].sort((a, b) => a.altitudeFeet - b.altitudeFeet);

    if (enableLogging) {
        logger.debug(`[Weather] getWindAtAltitude: target=${altitudeFt}ft, available levels:`,
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
            logger.debug(`[Weather] Interpolating: ${lowerWind.level}(${lowerWind.altitudeFeet}ft) -> ${upperWind.level}(${upperWind.altitudeFeet}ft), fraction=${fraction.toFixed(2)}`);
        }
    }

    if (enableLogging) {
        logger.debug(`[Weather] Result: ${Math.round(windDir)}° @ ${Math.round(windSpeed)}kt (level: ${usedLevel})`);
    }

    return {
        windSpeed,
        windDir,
        level: usedLevel
    };
}
