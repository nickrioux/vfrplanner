/**
 * Weather helper functions for the VFR Planner
 * Extracted from weatherService to improve maintainability
 */

import { metersToFeet, msToKnots } from '../utils/units';
import { MS_PER_MINUTE } from '../utils/constants';
import { logger } from './logger';

/** Default clear sky value in meters (29999 ft = ~9144 m) */
export const CLEAR_SKY_METERS = 9144;

/** Default clear sky value in feet */
export const CLEAR_SKY_FEET = 29999;

/**
 * Interpolation indices result
 */
export interface InterpolationResult {
    lowerIndex: number;
    upperIndex: number;
    fraction: number;
    needsInterpolation: boolean;
}

/**
 * Calculate interpolation indices for a target timestamp within a timestamp array
 * @param timestamps - Array of timestamps in ms
 * @param target - Target timestamp to find indices for
 * @returns Interpolation indices and fraction
 */
export function getInterpolationIndices(timestamps: number[], target?: number): InterpolationResult {
    if (!timestamps || timestamps.length === 0) {
        return { lowerIndex: 0, upperIndex: 0, fraction: 0, needsInterpolation: false };
    }

    const targetTime = target ?? timestamps[0];

    // If target is before first timestamp, use first value
    if (targetTime <= timestamps[0]) {
        return { lowerIndex: 0, upperIndex: 0, fraction: 0, needsInterpolation: false };
    }

    // If target is after last timestamp, use last value
    if (targetTime >= timestamps[timestamps.length - 1]) {
        const lastIdx = timestamps.length - 1;
        return { lowerIndex: lastIdx, upperIndex: lastIdx, fraction: 0, needsInterpolation: false };
    }

    // Find bracketing timestamps
    for (let i = 0; i < timestamps.length - 1; i++) {
        if (targetTime >= timestamps[i] && targetTime <= timestamps[i + 1]) {
            const timeDiff = timestamps[i + 1] - timestamps[i];
            const fraction = timeDiff > 0 ? (targetTime - timestamps[i]) / timeDiff : 0;
            return {
                lowerIndex: i,
                upperIndex: i + 1,
                fraction,
                needsInterpolation: fraction > 0 && fraction < 1,
            };
        }
    }

    // Fallback: find closest timestamp
    let closestIndex = 0;
    let closestDiff = Math.abs(timestamps[0] - targetTime);

    for (let i = 1; i < timestamps.length; i++) {
        const diff = Math.abs(timestamps[i] - targetTime);
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
 * Interpolate between two numeric values
 * @param value0 - Lower value
 * @param value1 - Upper value
 * @param fraction - Interpolation fraction (0-1)
 * @returns Interpolated value or null if both inputs invalid
 */
export function interpolateValue(
    value0: number | null | undefined,
    value1: number | null | undefined,
    fraction: number
): number | null {
    const v0Valid = value0 !== null && value0 !== undefined && !isNaN(value0);
    const v1Valid = value1 !== null && value1 !== undefined && !isNaN(value1);

    if (!v0Valid && !v1Valid) return null;
    if (!v0Valid) return value1 as number;
    if (!v1Valid) return value0 as number;

    return value0 + (value1 - value0) * fraction;
}

/**
 * Interpolate wind direction (handles 360° wraparound)
 * @param dir0 - Lower direction in degrees
 * @param dir1 - Upper direction in degrees
 * @param fraction - Interpolation fraction (0-1)
 * @returns Interpolated direction (0-360)
 */
export function interpolateWindDirection(dir0: number, dir1: number, fraction: number): number {
    if (fraction === 0) return dir0;
    if (fraction === 1) return dir1;

    let diff = dir1 - dir0;
    if (diff > 180) diff -= 360;
    if (diff < -180) diff += 360;

    let result = dir0 + diff * fraction;
    if (result < 0) result += 360;
    if (result >= 360) result -= 360;

    return result;
}

/**
 * Extract and interpolate a weather value from forecast data array
 * @param data - Array of forecast values
 * @param interp - Interpolation indices
 * @returns Interpolated value or null
 */
export function extractWeatherValue(
    data: number[] | undefined,
    interp: InterpolationResult
): number | null {
    if (!data || data.length === 0) return null;

    const lower = data[interp.lowerIndex];
    const upper = data[interp.upperIndex];

    if (interp.needsInterpolation) {
        return interpolateValue(lower, upper, interp.fraction);
    }

    return lower !== undefined && !isNaN(lower) ? lower : null;
}

/**
 * Format cloud base for display
 * @param cloudBaseMeters - Cloud base in meters AGL
 * @returns Formatted string (e.g., "3500 ft" or "CLR")
 */
export function formatCloudBaseDisplay(cloudBaseMeters: number | undefined): string {
    if (cloudBaseMeters === undefined) return 'CLR';

    const cloudBaseFeet = metersToFeet(cloudBaseMeters);
    if (cloudBaseFeet >= CLEAR_SKY_FEET - 1000) {
        return 'CLR';
    }

    return `${Math.round(cloudBaseFeet)} ft`;
}

/**
 * Estimate visibility from relative humidity (rough approximation)
 * @param humidity - Relative humidity percentage
 * @returns Estimated visibility in km
 */
export function estimateVisibility(humidity: number): number {
    if (humidity >= 100) return 0.5;
    if (humidity >= 95) return 2;
    if (humidity >= 90) return 5;
    if (humidity >= 80) return 10;
    return 20;
}

/**
 * Convert wind from m/s arrays to knots with interpolation
 * @param windData - Array of wind speeds in m/s
 * @param windDirData - Array of wind directions in degrees
 * @param interp - Interpolation indices
 * @returns Wind speed in knots and direction in degrees
 */
export function extractSurfaceWind(
    windData: number[] | undefined,
    windDirData: number[] | undefined,
    interp: InterpolationResult
): { speed: number; direction: number } {
    const defaultWind = { speed: 0, direction: 0 };

    if (!windData || !windDirData) return defaultWind;

    const windMs = extractWeatherValue(windData, interp);
    const windSpeedKt = windMs !== null ? msToKnots(windMs) : 0;

    const dirLower = windDirData[interp.lowerIndex] ?? 0;
    const dirUpper = windDirData[interp.upperIndex] ?? 0;

    const windDir = interp.needsInterpolation
        ? interpolateWindDirection(dirLower, dirUpper, interp.fraction)
        : dirLower;

    return { speed: windSpeedKt, direction: windDir };
}

/**
 * Calculate arrival time at a waypoint given departure time and cumulative ETE
 * @param departureTime - Departure timestamp in ms
 * @param cumulativeEteMinutes - Cumulative ETE in minutes
 * @returns Target timestamp in ms
 */
export function calculateWaypointArrivalTime(
    departureTime: number,
    cumulativeEteMinutes: number
): number {
    return departureTime + (cumulativeEteMinutes * MS_PER_MINUTE);
}

/**
 * Create a timeout promise for weather fetches
 * @param timeoutMs - Timeout duration in milliseconds
 * @param waypointName - Waypoint name for logging
 * @param enableLogging - Whether to log timeout warnings
 * @returns Promise that resolves to null after timeout
 */
export function createWeatherTimeout<T>(
    timeoutMs: number,
    waypointName?: string,
    enableLogging: boolean = false
): Promise<T | null> {
    return new Promise((resolve) => {
        setTimeout(() => {
            if (enableLogging && waypointName) {
                logger.warn(`Weather fetch timeout for waypoint ${waypointName}`);
            }
            resolve(null);
        }, timeoutMs);
    });
}
