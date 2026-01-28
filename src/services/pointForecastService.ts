/**
 * Point forecast service
 * Handles weather model detection and point forecast data fetching
 */

import { getPointForecastData } from '@windy/fetch';
import store from '@windy/store';
import type { DataHash, WeatherDataPayload } from '@windy/interfaces';
import type { Products } from '@windy/rootScope';
import type { HttpPayload } from '@windy/http';
import { logger } from './logger';

/**
 * Check if the current Windy model is ECMWF
 * ECMWF provides the most complete data including altitude winds and cloud ceiling
 */
export function isEcmwfModel(): boolean {
    const product = store.get('product') as Products;
    return product === 'ecmwf' || product === 'ecmwfWaves' || product === 'ecmwfAifs';
}

/**
 * Get the current weather model name for display
 */
export function getCurrentModelName(): string {
    const product = store.get('product') as Products;
    const modelNames: Record<string, string> = {
        'ecmwf': 'ECMWF',
        'ecmwfWaves': 'ECMWF Waves',
        'ecmwfAifs': 'ECMWF AIFS',
        'gfs': 'GFS',
        'icon': 'ICON',
        'iconEu': 'ICON-EU',
        'iconD2': 'ICON-D2',
        'nam': 'NAM',
        'namConus': 'NAM CONUS',
        'namAlaska': 'NAM Alaska',
        'namHawaii': 'NAM Hawaii',
    };
    return modelNames[product] || product?.toUpperCase() || 'Unknown';
}

/**
 * Estimate visibility from relative humidity (rough approximation)
 * @param humidity - Relative humidity in percent
 * @returns Estimated visibility in km
 */
export function estimateVisibility(humidity: number): number {
    // Very rough estimate - high humidity = lower visibility
    if (humidity >= 100) return 0.5;
    if (humidity >= 95) return 2;
    if (humidity >= 90) return 5;
    if (humidity >= 80) return 10;
    return 20;
}

/**
 * Fetch ECMWF point forecast specifically for cbase (ceiling) data
 * This ensures ceiling data always comes from ECMWF regardless of selected model
 * @param lat - Latitude
 * @param lon - Longitude
 * @param enableLogging - Enable debug logging
 * @returns Cloud base data array and timestamps, or null on error
 */
export async function fetchEcmwfCbase(
    lat: number,
    lon: number,
    enableLogging: boolean = false
): Promise<{ cbaseData: number[]; timestamps: number[] } | null> {
    try {
        const response: HttpPayload<WeatherDataPayload<DataHash>> = await getPointForecastData(
            'ecmwf' as Products,
            { lat, lon },
            {},
            {}
        );

        const data = response.data?.data;
        if (!data) {
            return null;
        }

        const cbaseData = data['cbase-surface'] || data.cbase;
        const timestamps = data.ts || data['ts-surface'];

        if (!cbaseData || !Array.isArray(cbaseData) || cbaseData.length === 0) {
            if (enableLogging) {
                logger.debug(`[Weather] No ECMWF cbase data available`);
            }
            return null;
        }

        if (enableLogging) {
            logger.debug(`[Weather] Fetched ECMWF cbase: ${cbaseData.length} values`);
        }

        return { cbaseData, timestamps: timestamps || [] };
    } catch (error) {
        if (enableLogging) {
            logger.error(`[Weather] Failed to fetch ECMWF cbase:`, error);
        }
        return null;
    }
}

/**
 * Forecast time range information
 */
export interface ForecastTimeRange {
    start: number;  // timestamp ms
    end: number;    // timestamp ms
    timestamps: number[];  // all available timestamps
}

/**
 * Get the available forecast time range from Windy
 * @param lat - Latitude
 * @param lon - Longitude
 * @returns Forecast time range or null on error
 */
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
        logger.error('Failed to get forecast time range:', error);
        return null;
    }
}

/**
 * Get current weather product from Windy store
 * @returns Current product/model name
 */
export function getCurrentProduct(): Products {
    return store.get('product') as Products;
}
