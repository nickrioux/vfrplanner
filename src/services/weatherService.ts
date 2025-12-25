/**
 * Weather service for fetching Windy forecast data
 * Uses Windy's point forecast API
 */

import { getPointForecastData } from '@windy/fetch';
import metrics from '@windy/metrics';
import store from '@windy/store';
import type { DataHash, WeatherDataPayload } from '@windy/interfaces';
import type { Products } from '@windy/rootScope';
import type { HttpPayload } from '@windy/http';
import type { Waypoint } from '../types/flightPlan';

export interface WaypointWeather {
    windSpeed: number;      // knots
    windDir: number;        // degrees
    windGust?: number;      // knots
    windAltitude?: number;  // feet MSL - altitude at which wind was measured
    temperature: number;    // celsius
    dewPoint?: number;      // celsius
    pressure?: number;      // hPa
    cloudBase?: number;     // meters (raw value from API)
    cloudBaseDisplay?: string; // formatted with user's altitude unit preference
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

        const response: HttpPayload<WeatherDataPayload<DataHash>> = await getPointForecastData(
            product,
            { lat, lon },
            {},
            {}
        );

        const { data } = response.data;
        const timestamps = data.ts;

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

        // Note: Currently fetching surface wind data
        // Windy's API may support altitude-specific wind through different endpoints or parameters
        // For now, we store the requested altitude and display it to the user
        // The wind data returned is surface-level, but we indicate the planned altitude in the display
        // Future enhancement: If Windy provides altitude-specific wind API, update this to fetch wind at the specified altitude
        const options: Record<string, string> = {};
        
        const response: HttpPayload<WeatherDataPayload<DataHash>> = await getPointForecastData(
            product,
            { lat, lon },
            options,
            {}
        );

        const { data } = response.data;

        // Use target timestamp if provided, otherwise use Windy's current timestamp
        // This ensures our data matches what Windy's picker displays
        const windyTimestamp = store.get('timestamp') as number;
        const effectiveTimestamp = targetTimestamp ?? windyTimestamp ?? Date.now();

        // Use interpolation like WindyVFRPlugIn does
        const interp = getInterpolationIndices(data.ts, effectiveTimestamp);
        const { lowerIndex, upperIndex, fraction, needsInterpolation } = interp;

        // Extract base weather data with interpolation
        const tempLower = data.temp[lowerIndex] || 273.15;
        const tempUpper = data.temp[upperIndex] || 273.15;
        const tempKelvin = needsInterpolation
            ? interpolateValue(tempLower, tempUpper, fraction) ?? 273.15
            : tempLower;
        const tempCelsius = kelvinToCelsius(tempKelvin);

        let dewPointCelsius: number | undefined;
        if (data.dewPoint) {
            const dewLower = data.dewPoint[lowerIndex];
            const dewUpper = data.dewPoint[upperIndex];
            const dewKelvin = needsInterpolation
                ? interpolateValue(dewLower, dewUpper, fraction)
                : dewLower;
            if (dewKelvin !== null && dewKelvin !== undefined && !isNaN(dewKelvin)) {
                dewPointCelsius = kelvinToCelsius(dewKelvin);
            }
        }

        // Cloud base from ECMWF model (cbase field) with interpolation
        // Note: Windy states "On large areas, forecast model is NOT ABLE TO CALCULATE CLOUD BASE"
        // If not available, we show N/A rather than an estimated value
        let cloudBase: number | undefined;
        let cloudBaseDisplay: string | undefined;
        if (data.cbase && Array.isArray(data.cbase) && data.cbase.length > 0) {
            const cbaseLower = data.cbase[lowerIndex];
            const cbaseUpper = data.cbase[upperIndex];
            
            let cbaseValue: number | null;
            if (needsInterpolation) {
                // When interpolation is needed (fraction between 0 and 1), use the interpolation function
                cbaseValue = interpolateValue(cbaseLower, cbaseUpper, fraction);
            } else {
                // When interpolation is NOT needed, check which timestamp we're exactly on
                // If fraction is 1.0, we're exactly on the upper timestamp, use upper value
                // If fraction is 0.0, we're exactly on the lower timestamp, use lower value
                if (fraction >= 1.0) {
                    // Exactly on upper timestamp
                    if (cbaseUpper !== null && cbaseUpper !== undefined && !isNaN(cbaseUpper) && cbaseUpper > 0) {
                        cbaseValue = cbaseUpper;
                    } else {
                        cbaseValue = null;
                    }
                } else {
                    // Exactly on lower timestamp (fraction === 0)
                    if (cbaseLower !== null && cbaseLower !== undefined && !isNaN(cbaseLower) && cbaseLower > 0) {
                        cbaseValue = cbaseLower;
                    } else {
                        cbaseValue = null;
                    }
                }
            }

            if (cbaseValue !== null && cbaseValue !== undefined && !isNaN(cbaseValue) && cbaseValue > 0) {
                // Store raw value in meters
                cloudBase = cbaseValue;
                // Format with rounded value (no decimals) in feet
                const cloudBaseFeet = metersToFeet(cloudBase);
                cloudBaseDisplay = `${Math.round(cloudBaseFeet)} ft`;
            }
        }
        // If cbase is not available, cloudBase remains undefined (shown as N/A in UI)

        // Debug: log what we're getting vs what Windy shows
        if (enableLogging) {
            console.log('[VFR] Cloud base debug:', {
                waypoint: waypointName || 'Unknown',
                lat, lon,
                product,
                windyTimestamp: new Date(windyTimestamp).toISOString(),
                effectiveTimestamp: new Date(effectiveTimestamp).toISOString(),
                lowerIndex,
                upperIndex,
                fraction: fraction.toFixed(3),
                needsInterpolation,
                forecastTimeLower: new Date(data.ts[lowerIndex]).toISOString(),
                forecastTimeUpper: new Date(data.ts[upperIndex]).toISOString(),
                rawCbaseLower: data.cbase ? data.cbase[lowerIndex] : 'N/A',
                rawCbaseUpper: data.cbase ? data.cbase[upperIndex] : 'N/A',
                interpolatedCbase: cloudBase,
                cloudBaseDisplay,
            });

            // Log full cbase table if available
            if (data.cbase && Array.isArray(data.cbase) && data.cbase.length > 0) {
                console.log('[VFR] Full cbase table:', {
                    waypoint: waypointName || 'Unknown',
                    timestamps: data.ts.map((ts: number) => new Date(ts).toISOString()),
                    cbaseValues: data.cbase.map((cb: number | null | undefined, idx: number) => ({
                        index: idx,
                        timestamp: new Date(data.ts[idx]).toISOString(),
                        cbase: cb !== null && cb !== undefined && !isNaN(cb) ? cb : null,
                        cbaseFeet: cb !== null && cb !== undefined && !isNaN(cb) ? metersToFeet(cb) : null,
                    })),
                    totalPoints: data.cbase.length,
                });
            } else {
                console.log('[VFR] cbase table:', {
                    waypoint: waypointName || 'Unknown',
                    message: 'Not available for this location',
                });
            }
        }

        // Interpolate wind values
        const windLower = data.wind[lowerIndex] || 0;
        const windUpper = data.wind[upperIndex] || 0;
        const windMs = needsInterpolation
            ? interpolateValue(windLower, windUpper, fraction) ?? 0
            : windLower;

        const windDirLower = data.windDir[lowerIndex] || 0;
        const windDirUpper = data.windDir[upperIndex] || 0;
        // Wind direction interpolation needs special handling for wrap-around
        let windDir = windDirLower;
        if (needsInterpolation) {
            let diff = windDirUpper - windDirLower;
            if (diff > 180) diff -= 360;
            if (diff < -180) diff += 360;
            windDir = windDirLower + diff * fraction;
            if (windDir < 0) windDir += 360;
            if (windDir >= 360) windDir -= 360;
        }

        const weather: WaypointWeather = {
            windSpeed: msToKnots(windMs),
            windDir,
            windGust: data.gust ? msToKnots(needsInterpolation
                ? interpolateValue(data.gust[lowerIndex], data.gust[upperIndex], fraction) ?? 0
                : data.gust[lowerIndex] || 0) : undefined,
            windAltitude: altitude, // Store the altitude at which wind was fetched
            temperature: tempCelsius,
            dewPoint: dewPointCelsius,
            pressure: data.pressure ? (needsInterpolation
                ? (interpolateValue(data.pressure[lowerIndex], data.pressure[upperIndex], fraction) ?? 0) / 100
                : data.pressure[lowerIndex] / 100) : undefined, // Pa to hPa
            cloudBase,
            cloudBaseDisplay,
            humidity: data.rh ? (needsInterpolation
                ? interpolateValue(data.rh[lowerIndex], data.rh[upperIndex], fraction) ?? undefined
                : data.rh[lowerIndex]) : undefined,
            visibility: data.rh ? estimateVisibility(needsInterpolation
                ? interpolateValue(data.rh[lowerIndex], data.rh[upperIndex], fraction) ?? 0
                : data.rh[lowerIndex] || 0) : undefined,
            precipitation: data.mm ? (needsInterpolation
                ? interpolateValue(data.mm[lowerIndex], data.mm[upperIndex], fraction) ?? undefined
                : data.mm[lowerIndex]) : undefined,
            timestamp: data.ts[lowerIndex],
        };

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

    // Fetch weather for all waypoints in parallel
    const promises = waypoints.map(async (wp, index) => {
        // Calculate target time for this waypoint
        let targetTime: number | undefined;

        if (departureTime) {
            // Add cumulative ETE to departure time
            targetTime = departureTime + (cumulativeEteMinutes * 60 * 1000);
        }

        // Add this waypoint's ETE to cumulative for next waypoint
        cumulativeEteMinutes += wp.ete || 0;

        const weather = await fetchWaypointWeather(wp.lat, wp.lon, pluginName, targetTime, wp.name, altitude, enableLogging);
        if (weather) {
            weatherMap.set(wp.id, weather);
        }
    });

    await Promise.all(promises);

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
    // Note: weather.cloudBase is in meters, but thresholds.cloudBase is in feet
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
