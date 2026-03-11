/**
 * Weather interpolation module
 * Handles extracting weather data at specific timestamps from cached forecast data.
 * Extracted from weatherService.ts for improved maintainability.
 */

import { metersToFeet, msToKnots, kelvinToCelsius } from '../utils/units';
import {
    getInterpolationIndices,
    interpolateValue,
    interpolateWindDirection,
    CLEAR_SKY_METERS,
} from './weatherHelpers';
import {
    getAllWindLevelsFromMeteogram,
    getWindAtAltitudeFromMeteogram,
    type LevelWind,
} from './verticalWindService';
import { estimateVisibility } from './pointForecastService';
import { logger } from './logger';
import type { WaypointWeather, FullForecastData } from './weatherService';

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
        // Always use ECMWF cbase — meteogram is hardcoded to ECMWF
        const cbaseData = meteogramData?.cbase || pointForecastData.cbase;

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
