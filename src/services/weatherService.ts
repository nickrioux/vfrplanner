/**
 * Weather service for fetching Windy forecast data
 * Uses Windy's point forecast API
 *
 * This module orchestrates weather data fetching and processing.
 * It imports specialized functionality from sub-modules:
 * - altitudeToWindService: Pressure level conversions
 * - verticalWindService: Vertical wind profile handling
 * - pointForecastService: Model detection and point forecast fetching
 */

import { getPointForecastData } from '@windy/fetch';
import metrics from '@windy/metrics';
import store from '@windy/store';
import type { DataHash, WeatherDataPayload } from '@windy/interfaces';
import type { Products } from '@windy/rootScope';
import type { HttpPayload } from '@windy/http';
import type { Waypoint } from '../types/flightPlan';
import type { WindyPointForecastData, WindyMeteogramData } from '../types/weather';
import { metersToFeet, msToKnots, kelvinToCelsius } from '../utils/units';
import {
    getInterpolationIndices,
    interpolateValue,
    interpolateWindDirection,
    CLEAR_SKY_METERS,
} from './weatherHelpers';
import { logger } from './logger';

// Import from specialized modules
import {
    PRESSURE_LEVELS,
    METEOGRAM_PRESSURE_LEVELS,
    altitudeToPressureLevel,
    getBracketingPressureLevels,
    getAltitudeForPressureLevel,
} from './altitudeToWindService';

import {
    fetchVerticalWindData,
    findWindKeyPairs,
    getAllWindLevelsFromMeteogram,
    getWindAtAltitudeFromMeteogram,
    type LevelWind,
} from './verticalWindService';

import {
    isEcmwfModel,
    getCurrentModelName,
    estimateVisibility,
    fetchEcmwfCbase,
    getForecastTimeRange,
    getCurrentProduct,
    type ForecastTimeRange,
} from './pointForecastService';

// Re-export for backward compatibility
export {
    // From altitudeToWindService
    PRESSURE_LEVELS,
    METEOGRAM_PRESSURE_LEVELS,
    altitudeToPressureLevel,
    getBracketingPressureLevels,
    getAltitudeForPressureLevel,
    // From verticalWindService
    fetchVerticalWindData,
    findWindKeyPairs,
    getAllWindLevelsFromMeteogram,
    getWindAtAltitudeFromMeteogram,
    type LevelWind,
    // From pointForecastService
    isEcmwfModel,
    getCurrentModelName,
    estimateVisibility,
    fetchEcmwfCbase,
    getForecastTimeRange,
    getCurrentProduct,
    type ForecastTimeRange,
};

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

/**
 * Full forecast data for a location - contains all time series data
 * Used for caching to avoid repeated API calls for the same location
 */
export interface FullForecastData {
    /** Location identifier */
    lat: number;
    lon: number;
    /** Altitude this forecast was fetched for (affects pressure level selection) */
    altitude: number;
    /** Point forecast timestamps */
    timestamps: number[];
    /** Meteogram timestamps (may differ from point forecast) */
    meteogramTimestamps?: number[];
    /** Raw point forecast data arrays */
    pointForecastData: WindyPointForecastData;
    /** Raw meteogram data for vertical winds and cbase */
    meteogramData: WindyMeteogramData;
    /** Vertical wind profile at all levels (first time index) */
    verticalWinds: LevelWind[];
    /** When this forecast was fetched */
    fetchedAt: number;
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
    // Validate coordinates before making API call
    if (typeof lat !== 'number' || typeof lon !== 'number' ||
        isNaN(lat) || isNaN(lon) ||
        lat < -90 || lat > 90 || lon < -180 || lon > 180) {
        if (enableLogging) {
            logger.warn(`[Weather] Invalid coordinates for ${waypointName || 'waypoint'}: lat=${lat}, lon=${lon}`);
        }
        return null;
    }

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
                    logger.debug(`[Weather] Fetching weather for ${waypointName} at ${altitude} ft MSL`);
                    logger.debug(`[Weather] Interpolating between ${bracketingLevels.lower.level} (${bracketingLevels.lower.altitudeFeet}ft) and ${bracketingLevels.upper.level} (${bracketingLevels.upper.altitudeFeet}ft)`);
                    logger.debug(`[Weather] Interpolation fraction: ${(bracketingLevels.fraction * 100).toFixed(1)}%`);
                }
            } else {
                // Fallback to single level if bracketing fails
                const pressureLevel = altitudeToPressureLevel(altitude);
                levels = pressureLevel === 'surface' ? ['surface'] : ['surface', pressureLevel];
                if (enableLogging && waypointName) {
                    logger.debug(`[Weather] Fetching weather for ${waypointName} at ${altitude} ft MSL (pressure level: ${pressureLevel})`);
                }
            }
        } else {
            if (enableLogging && waypointName) {
                logger.debug(`[Weather] Fetching weather for ${waypointName} at surface`);
            }
        }

        // Try to use getPointForecastData with levels option first
        // If that doesn't work, we'll try the direct API call
        let response;
        let responseData: WindyPointForecastData | undefined;
        
        try {
            // First, try passing levels in options to getPointForecastData
            // This might work if Windy's plugin API supports it
            const options: Record<string, string[]> = {};
            if (levels.length > 0 && levels[0] !== 'surface') {
                options.levels = levels;
            }
            
            // Use Windy's plugin API for weather data
            const pointForecastResponse: HttpPayload<WeatherDataPayload<DataHash>> = await getPointForecastData(
                product,
                { lat, lon },
                options,
                {}
            );

            // Get the response data
            const data = pointForecastResponse.data?.data;
            if (data) {
                responseData = data;
            } else {
                throw new Error('No data in response');
            }
        } catch (apiError) {
            // If both methods fail, fall back to getPointForecastData for surface data
            if (enableLogging && waypointName) {
                logger.warn(`[Weather] Point Forecast API failed for ${waypointName}, falling back to surface data:`, apiError);
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
                logger.debug(`[Weather] Using surface data fallback for ${waypointName}`);
            }
        }

        // The response has data keys like 'wind-surface', 'wind-850h', 'windDir-850h', etc.
        // responseData is already set above

        // Debug: log available data keys and wind at all levels
        if (enableLogging && waypointName) {
            logger.debug(`[Weather] Response data keys for ${waypointName}:`, Object.keys(responseData || {}));

            // Check for wind-specific keys
            const windKeys = Object.keys(responseData || {}).filter(k => k.includes('wind'));
            logger.debug(`[Weather] Wind-related keys:`, windKeys);

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

            logger.debug(`[Weather] ===== Wind at all levels for ${waypointName} =====`);
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
                    logger.debug(`[Weather]   ${level.key.padEnd(8)} (${level.alt.padEnd(10)}): ${String(windDeg).padStart(3, '0')}° @ ${String(windKt).padStart(2)}kt - ${level.desc}`);
                } else {
                    logger.debug(`[Weather]   ${level.key.padEnd(8)} (${level.alt.padEnd(10)}): N/A - ${level.desc}`);
                }
            });
            logger.debug(`[Weather] ================================================`);
        }

        // Get wind data at flight altitude using meteogram vertical data
        let windSpeed: number | undefined;
        let windDir: number | undefined;
        let gustData: number[] | undefined;
        let usedPressureLevel = 'surface';
        let verticalWinds: LevelWind[] = [];

        // Fetch meteogram data for vertical wind levels
        logger.debug(`[Weather] Fetching meteogram for ${waypointName}, altitude=${altitude}...`);
        const meteogramData = await fetchVerticalWindData(lat, lon, true); // Always log for debugging
        logger.debug(`[Weather] Meteogram result for ${waypointName}:`, meteogramData ? `${Object.keys(meteogramData).length} keys` : 'NULL');

        if (meteogramData) {
            // Get all wind levels
            verticalWinds = getAllWindLevelsFromMeteogram(meteogramData, 0, true); // Always log for debugging
            logger.debug(`[Weather] Extracted ${verticalWinds.length} vertical wind levels`);

            if (enableLogging && waypointName) {
                logger.debug(`[Weather] Vertical winds for ${waypointName}:`, verticalWinds.map(w =>
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
                        logger.debug(`[Weather] ✓ Wind at ${altitude}ft for ${waypointName}: ${Math.round(windDir)}° @ ${Math.round(windSpeed)}kt (level: ${usedPressureLevel})`);
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
            logger.debug(`[Weather] === WIND DATA COMPARISON for ${waypointName} ===`);
            logger.debug(`[Weather] Point Forecast (what Windy shows):`);
            logger.debug(`[Weather]   Surface wind: ${Math.round(pfWindDir)}° @ ${Math.round(pfWindSpeedKt)} kt`);

            if (verticalWinds.length > 0) {
                const surfaceFromMeteogram = verticalWinds.find(w => w.level === '1000h' || w.altitudeFeet < 1000);
                if (surfaceFromMeteogram) {
                    logger.debug(`[Weather] Meteogram (calculated from U/V):`);
                    logger.debug(`[Weather]   ${surfaceFromMeteogram.level}: ${Math.round(surfaceFromMeteogram.windDir)}° @ ${Math.round(surfaceFromMeteogram.windSpeed)} kt`);
                    const dirDiff = Math.abs(pfWindDir - surfaceFromMeteogram.windDir);
                    const speedDiff = Math.abs(pfWindSpeedKt - surfaceFromMeteogram.windSpeed);
                    if (dirDiff > 10 || speedDiff > 5) {
                        logger.debug(`[Weather] ⚠️ DISCREPANCY DETECTED!`);
                        logger.debug(`[Weather]   Direction diff: ${dirDiff.toFixed(0)}°, Speed diff: ${speedDiff.toFixed(0)} kt`);
                    }
                }
            }

            if (windSpeed !== undefined && windDir !== undefined) {
                logger.debug(`[Weather] Selected altitude wind (${usedPressureLevel}):`);
                logger.debug(`[Weather]   ${Math.round(windDir)}° @ ${Math.round(windSpeed)} kt`);
            }
            logger.debug(`[Weather] ==========================================`);
        }

        if (windSpeed === undefined || windDir === undefined) {
            usedPressureLevel = 'surface';
            windData = surfaceWindData;
            windDirData = surfaceWindDirData;
            gustData = responseData['gust-surface'] || responseData.gust;

            if (enableLogging && waypointName) {
                logger.debug(`[Weather] Falling back to surface wind for ${waypointName}:`, {
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
                    logger.debug(`[Weather] Using cbase from MeteogramForecastData for ${waypointName}:`, {
                        dataLength: cbaseData.length,
                        sample: cbaseData.slice(0, 5),
                        allKeys: Object.keys(meteogramData).filter(k => k.includes('cbase') || k.includes('cloud'))
                    });
                }
            }
        }

        // Fall back to ECMWF point forecast if meteogram doesn't have cbase
        // This ensures ceiling data always comes from ECMWF regardless of selected model
        let ecmwfCbaseTimestamps: number[] | undefined;

        if (!cbaseData) {
            // Check if current model is already ECMWF - if so, use existing response
            const currentProduct = store.get('product') as Products;
            if (currentProduct === 'ecmwf' || currentProduct === 'ecmwfWaves' || currentProduct === 'ecmwfAifs') {
                cbaseData = responseData['cbase-surface'] || responseData.cbase;
                if (cbaseData) {
                    cbaseSource = 'pointForecast-ecmwf';
                    if (enableLogging) {
                        logger.debug(`[Weather] Using cbase from ECMWF PointForecastData for ${waypointName}:`, {
                            dataLength: cbaseData?.length,
                            sample: cbaseData?.slice(0, 5)
                        });
                    }
                }
            } else {
                // Fetch ECMWF cbase separately since a different model is selected
                const ecmwfCbase = await fetchEcmwfCbase(lat, lon, enableLogging);
                if (ecmwfCbase) {
                    cbaseData = ecmwfCbase.cbaseData;
                    ecmwfCbaseTimestamps = ecmwfCbase.timestamps;
                    cbaseSource = 'ecmwf-separate';
                    if (enableLogging) {
                        logger.debug(`[Weather] Using cbase from separate ECMWF fetch for ${waypointName}:`, {
                            dataLength: cbaseData.length,
                            sample: cbaseData.slice(0, 5)
                        });
                    }
                }
            }
        }

        if (enableLogging) {
            logger.debug(`[Weather] Cbase source for ${waypointName}: ${cbaseSource}`);
        }

        // Get timestamps - use meteogram timestamps if cbase comes from meteogram
        let timestamps: number[] = [];
        let cbaseTimestamps: number[] | undefined;

        if (cbaseSource === 'meteogram' && meteogramData) {
            // Meteogram has its own timestamps
            cbaseTimestamps = meteogramData.ts || meteogramData['ts-surface'];
            timestamps = responseData.ts || responseData['ts-surface'] || cbaseTimestamps || [];
        } else if (cbaseSource === 'ecmwf-separate' && ecmwfCbaseTimestamps) {
            // Use ECMWF timestamps for cbase interpolation
            cbaseTimestamps = ecmwfCbaseTimestamps;
            timestamps = responseData.ts || responseData['ts-surface'] || [];
            if (enableLogging && cbaseTimestamps) {
                logger.debug(`[Weather] Meteogram timestamps for ${waypointName}:`, {
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
                logger.error(`[Weather] No timestamp data for ${waypointName}`);
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
                    logger.debug(`[Weather] Meteogram cbase interpolation for ${waypointName}:`, {
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

            logger.debug(`[Weather] Cbase ${waypointName || 'unknown'}: source=${cbaseSource}, timestamp=${new Date(effectiveTimestamp).toISOString()}, lowerIndex=${cbaseLowerIdx}, upperIndex=${cbaseUpperIdx}, fraction=${cbaseFraction.toFixed(2)}, cbaseLower=${cbaseLower}m (${cbaseLower ? Math.round(metersToFeet(cbaseLower)) : 'CLR'}ft), cbaseUpper=${cbaseUpper}m (${cbaseUpper ? Math.round(metersToFeet(cbaseUpper)) : 'CLR'}ft), final=${cbaseValue}m (${cbaseValue ? Math.round(metersToFeet(cbaseValue)) : 'CLR'}ft)`);

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
            logger.debug(`[Weather] Fetched weather for ${waypointName} at ${usedPressureLevel}:`, {
                windSpeed: `${Math.round(weather.windSpeed)} kt`,
                windDir: `${Math.round(weather.windDir)}°`,
                windAltitude: weather.windAltitude ? `${weather.windAltitude} ft MSL` : 'surface',
                temperature: `${Math.round(weather.temperature)}°C`,
                pressureLevel: usedPressureLevel
            });
        }

        return weather;
    } catch (error) {
        logger.error('Failed to fetch weather for waypoint:', error);
        return null;
    }
}

/**
 * Fetch weather for all waypoints in a flight plan
 * @param waypoints - Array of waypoints with ETE data
 * @param pluginName - Plugin name for API calls
 * @param departureTime - Optional departure timestamp (ms). If provided, weather is fetched for estimated arrival time at each waypoint
 * @param altitude - Altitude in feet MSL for wind data (optional, defaults to surface)
 * @param enableLogging - Enable debug logging
 * @param useProgressiveTime - When true, adjusts forecast time for each waypoint based on ETE. When false, uses departure time for all waypoints.
 */
export async function fetchFlightPlanWeather(
    waypoints: Waypoint[],
    pluginName: string,
    departureTime?: number,
    altitude?: number,
    enableLogging: boolean = false,
    useProgressiveTime: boolean = true
): Promise<Map<string, WaypointWeather>> {
    const weatherMap = new Map<string, WaypointWeather>();

    // Calculate cumulative ETE to get arrival time at each waypoint (only if progressive time is enabled)
    let cumulativeEteMinutes = 0;

    // Fetch weather for all waypoints in parallel with individual error handling
    const promises = waypoints.map(async (wp, index) => {
        try {
            // Calculate target time for this waypoint
            let targetTime: number | undefined;

            if (departureTime) {
                if (useProgressiveTime) {
                    // Add cumulative ETE to departure time for arrival-time forecast
                    targetTime = departureTime + (cumulativeEteMinutes * 60 * 1000);
                } else {
                    // Use same departure time for all waypoints (snapshot mode)
                    targetTime = departureTime;
                }
            }

            // Add this waypoint's ETE to cumulative for next waypoint (only matters if progressive)
            if (useProgressiveTime) {
                cumulativeEteMinutes += wp.ete || 0;
            }

            // Add timeout to prevent hanging (15 seconds per waypoint)
            const weatherPromise = fetchWaypointWeather(wp.lat, wp.lon, pluginName, targetTime, wp.name, altitude, enableLogging);
            
            const timeoutPromise = new Promise<null>((resolve) => {
                setTimeout(() => {
                    if (enableLogging) {
                        logger.warn(`[Weather] Weather fetch timeout for waypoint ${wp.name} (${wp.id})`);
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
                logger.error(`[Weather] Error fetching weather for waypoint ${wp.name} (${wp.id}):`, error);
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
 * @param isTerminal - True if this is a departure or arrival waypoint (wind/gust alerts only apply to terminals)
 */
export function checkWeatherAlerts(
    weather: WaypointWeather,
    thresholds: WeatherAlertThresholds = DEFAULT_ALERT_THRESHOLDS,
    plannedAltitude?: number,
    isTerminal: boolean = false
): WeatherAlert[] {
    const alerts: WeatherAlert[] = [];

    // Wind speed alert - only for terminal waypoints (departure/arrival)
    // Use surface wind for terminals, not altitude wind
    if (isTerminal) {
        const terminalWindSpeed = weather.surfaceWindSpeed ?? weather.windSpeed;
        if (terminalWindSpeed >= thresholds.windSpeed) {
            alerts.push({
                type: 'wind',
                severity: terminalWindSpeed >= thresholds.windSpeed * 1.5 ? 'warning' : 'caution',
                message: `Wind ${Math.round(terminalWindSpeed)} kt`,
                value: terminalWindSpeed,
                threshold: thresholds.windSpeed,
            });
        }
    }

    // Gust alert - only for terminal waypoints (departure/arrival)
    if (isTerminal && weather.windGust && weather.windGust >= thresholds.gustSpeed) {
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
 * Fetch full forecast data for a location (all timestamps in one API call)
 * This enables caching and reuse across multiple timestamp queries
 * @param lat - Latitude
 * @param lon - Longitude
 * @param altitude - Target altitude in feet for wind level selection
 * @param enableLogging - Enable debug logging
 * @returns Full forecast data with all time series, or null on error
 */
export async function fetchFullForecast(
    lat: number,
    lon: number,
    altitude: number = 0,
    enableLogging: boolean = false
): Promise<FullForecastData | null> {
    try {
        const product = store.get('product') as Products;

        // Fetch point forecast data
        const response: HttpPayload<WeatherDataPayload<DataHash>> = await getPointForecastData(
            product,
            { lat, lon },
            {},
            {}
        );

        const pointForecastData = response.data?.data;
        if (!pointForecastData) {
            if (enableLogging) {
                logger.error(`[Weather] No point forecast data for ${lat},${lon}`);
            }
            return null;
        }

        const timestamps = pointForecastData.ts || pointForecastData['ts-surface'] || [];
        if (timestamps.length === 0) {
            if (enableLogging) {
                logger.error(`[Weather] No timestamps in forecast data for ${lat},${lon}`);
            }
            return null;
        }

        // Fetch meteogram data for vertical winds and cbase
        let meteogramData: WindyMeteogramData = null;
        let meteogramTimestamps: number[] | undefined;
        let verticalWinds: LevelWind[] = [];

        try {
            meteogramData = await fetchVerticalWindData(lat, lon, false);
            if (meteogramData) {
                meteogramTimestamps = meteogramData.ts || meteogramData['ts-surface'];
                verticalWinds = getAllWindLevelsFromMeteogram(meteogramData, 0, false);
            }
        } catch (meteogramError) {
            if (enableLogging) {
                logger.warn(`[Weather] Meteogram fetch failed for ${lat},${lon}:`, meteogramError);
            }
        }

        if (enableLogging) {
            logger.debug(`[Weather] Fetched full forecast for ${lat.toFixed(4)},${lon.toFixed(4)}: ${timestamps.length} timestamps, ${verticalWinds.length} wind levels`);
        }

        return {
            lat,
            lon,
            altitude,
            timestamps,
            meteogramTimestamps,
            pointForecastData,
            meteogramData,
            verticalWinds,
            fetchedAt: Date.now(),
        };
    } catch (error) {
        if (enableLogging) {
            logger.error(`[Weather] Error fetching forecast for ${lat},${lon}:`, error);
        }
        return null;
    }
}

/**
 * Extract weather data at a specific timestamp from cached full forecast
 * @param forecast - Full forecast data from fetchFullForecast
 * @param targetTimestamp - Target timestamp in ms
 * @param altitude - Target altitude in feet for wind interpolation
 * @param waypointName - Optional waypoint name for logging
 * @param enableLogging - Enable debug logging
 * @returns WaypointWeather at the target timestamp, or null on error
 */
export function extractWeatherAtTimestamp(
    forecast: FullForecastData,
    targetTimestamp: number,
    altitude: number,
    waypointName?: string,
    enableLogging: boolean = false
): WaypointWeather | null {
    try {
        const { pointForecastData, meteogramData, timestamps, meteogramTimestamps } = forecast;

        if (!timestamps || timestamps.length === 0) {
            return null;
        }

        // Get interpolation indices for the target timestamp
        const interp = getInterpolationIndices(timestamps, targetTimestamp);
        const { lowerIndex, upperIndex, fraction, needsInterpolation } = interp;

        // Extract surface wind data
        const windData = pointForecastData.wind || pointForecastData['wind-surface'];
        const windDirData = pointForecastData.windDir || pointForecastData['windDir-surface'];
        const gustData = pointForecastData.gust || pointForecastData['gust-surface'];
        const tempData = pointForecastData.temp || pointForecastData['temp-surface'];
        const dewPointData = pointForecastData.dewpoint || pointForecastData['dewpoint-surface'];
        const humidityData = pointForecastData.rh || pointForecastData['rh-surface'];
        const cbaseData = meteogramData?.cbase || pointForecastData.cbase || pointForecastData['cbase-surface'];

        // Extract wind at altitude from meteogram if available
        let finalWindSpeed: number = 0;
        let finalWindDir: number = 0;
        let usedPressureLevel = 'surface';
        let verticalWinds: LevelWind[] = [];

        if (meteogramData && altitude > 500) {
            // Get time index for meteogram (may have different timestamps)
            let meteogramTimeIndex = 0;
            if (meteogramTimestamps && meteogramTimestamps.length > 0) {
                const meteogramInterp = getInterpolationIndices(meteogramTimestamps, targetTimestamp);
                meteogramTimeIndex = meteogramInterp.lowerIndex;
            }

            // Get wind at altitude from meteogram
            const altitudeWind = getWindAtAltitudeFromMeteogram(meteogramData, altitude, meteogramTimeIndex, false);
            if (altitudeWind) {
                finalWindSpeed = altitudeWind.windSpeed;
                finalWindDir = altitudeWind.windDir;
                usedPressureLevel = altitudeWind.level;
            }

            // Get all vertical winds for the time index
            verticalWinds = getAllWindLevelsFromMeteogram(meteogramData, meteogramTimeIndex, false);
        }

        // Fallback to surface wind if altitude wind not available
        if (finalWindSpeed === 0 && windData) {
            const windLower = windData[lowerIndex] || 0;
            const windUpper = windData[upperIndex] || 0;
            const windMs = needsInterpolation
                ? interpolateValue(windLower, windUpper, fraction) ?? 0
                : windLower;
            finalWindSpeed = msToKnots(windMs);

            if (windDirData) {
                const dirLower = windDirData[lowerIndex] || 0;
                const dirUpper = windDirData[upperIndex] || 0;
                finalWindDir = needsInterpolation
                    ? interpolateWindDirection(dirLower, dirUpper, fraction)
                    : dirLower;
            }
        }

        // Extract surface wind for terminal operations
        let surfaceWindSpeed: number | undefined;
        let surfaceWindDir: number | undefined;
        if (windData && windDirData) {
            const surfaceWindMs = needsInterpolation
                ? interpolateValue(windData[lowerIndex], windData[upperIndex], fraction) ?? 0
                : windData[lowerIndex] || 0;
            surfaceWindSpeed = msToKnots(surfaceWindMs);
            surfaceWindDir = needsInterpolation
                ? interpolateWindDirection(windDirData[lowerIndex] || 0, windDirData[upperIndex] || 0, fraction)
                : windDirData[lowerIndex] || 0;
        }

        // Extract temperature
        let tempCelsius = 15; // ISA default
        if (tempData) {
            const tempLower = tempData[lowerIndex] || 288.15;
            const tempUpper = tempData[upperIndex] || 288.15;
            const tempKelvin = needsInterpolation
                ? interpolateValue(tempLower, tempUpper, fraction) ?? 288.15
                : tempLower;
            tempCelsius = kelvinToCelsius(tempKelvin);
        }

        // Extract dew point
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

        // Extract gust
        let gustKnots: number | undefined;
        if (gustData) {
            const gustMs = needsInterpolation
                ? interpolateValue(gustData[lowerIndex], gustData[upperIndex], fraction)
                : gustData[lowerIndex];
            if (gustMs !== null && gustMs !== undefined && !isNaN(gustMs)) {
                gustKnots = msToKnots(gustMs);
            }
        }

        // Extract cloud base
        let cloudBase: number | undefined;
        let cloudBaseDisplay: string | undefined;

        if (cbaseData && Array.isArray(cbaseData) && cbaseData.length > 0) {
            // Use meteogram timestamps for cbase interpolation if from meteogram
            let cbaseInterp = interp;
            if (meteogramData?.cbase && meteogramTimestamps && meteogramTimestamps.length > 0) {
                cbaseInterp = getInterpolationIndices(meteogramTimestamps, targetTimestamp);
            }

            const cbaseLower = cbaseData[cbaseInterp.lowerIndex];
            const cbaseUpper = cbaseData[cbaseInterp.upperIndex];
            const isLowerValid = cbaseLower !== null && cbaseLower !== undefined && !isNaN(cbaseLower) && cbaseLower > 0;
            const isUpperValid = cbaseUpper !== null && cbaseUpper !== undefined && !isNaN(cbaseUpper) && cbaseUpper > 0;

            let cbaseValue: number | null = null;
            if (cbaseInterp.needsInterpolation && isLowerValid && isUpperValid) {
                cbaseValue = interpolateValue(cbaseLower, cbaseUpper, cbaseInterp.fraction);
            } else if (isLowerValid) {
                cbaseValue = cbaseLower;
            } else if (isUpperValid) {
                cbaseValue = cbaseUpper;
            } else {
                cbaseValue = CLEAR_SKY_METERS;
            }

            if (cbaseValue !== null && cbaseValue > 0) {
                cloudBase = cbaseValue;
                const cloudBaseFeet = metersToFeet(cloudBase);
                cloudBaseDisplay = cloudBaseFeet >= 29000 ? 'CLR' : `${Math.round(cloudBaseFeet)} ft`;
            }
        } else {
            cloudBase = CLEAR_SKY_METERS;
            cloudBaseDisplay = 'CLR';
        }

        // Extract visibility from humidity
        let visibility: number | undefined;
        let humidity: number | undefined;
        if (humidityData) {
            const rhLower = humidityData[lowerIndex];
            const rhUpper = humidityData[upperIndex];
            humidity = needsInterpolation
                ? interpolateValue(rhLower, rhUpper, fraction) ?? undefined
                : rhLower ?? undefined;
            if (humidity !== undefined) {
                // Estimate visibility from humidity
                if (humidity >= 100) visibility = 0.5;
                else if (humidity >= 95) visibility = 2;
                else if (humidity >= 90) visibility = 5;
                else if (humidity >= 80) visibility = 10;
                else visibility = 20;
            }
        }

        return {
            windSpeed: finalWindSpeed,
            windDir: finalWindDir,
            windGust: gustKnots,
            windAltitude: altitude,
            windLevel: usedPressureLevel,
            surfaceWindSpeed,
            surfaceWindDir,
            verticalWinds,
            temperature: tempCelsius,
            dewPoint: dewPointCelsius,
            cloudBase,
            cloudBaseDisplay,
            visibility,
            humidity,
            timestamp: targetTimestamp,
        };
    } catch (error) {
        if (enableLogging) {
            logger.error(`[Weather] Error extracting weather at ${targetTimestamp} for ${waypointName}:`, error);
        }
        return null;
    }
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
                logger.debug('[Weather] cbase table:', {
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
            logger.debug('[Weather] Full cbase table:', {
                waypoint: waypointName || 'Unknown',
                location: { lat, lon },
                product,
                totalPoints: cbaseTable.length,
                table: cbaseTable,
            });
        }

        return cbaseTable;
    } catch (error) {
        logger.error('Failed to get cbase table:', error);
        return null;
    }
}
