/**
 * Weather API types for Windy integration
 * Provides type safety for external API responses
 */

/**
 * Raw Windy point forecast data
 * Contains wind, temperature, and other meteorological data indexed by level
 * Keys follow patterns like: wind_u-surface, wind_v-850h, temp-500h, etc.
 */
export type WindyPointForecastData = Record<string, number[]>;

/**
 * Raw Windy meteogram data
 * Contains extended data arrays for multiple parameters
 * Keys follow patterns like: windU-850h, windV-850h, cbase_octas, etc.
 */
export type WindyMeteogramData = Record<string, number[]> | null;

/**
 * Known pressure level keys in Windy API
 */
export type PressureLevelSuffix =
    | 'surface'
    | '1000h'
    | '950h'
    | '925h'
    | '900h'
    | '850h'
    | '700h'
    | '500h'
    | '300h'
    | '200h'
    | '150h';

/**
 * Wind component key patterns
 */
export interface WindKeyPair {
    uKey: string;
    vKey: string;
}

/**
 * Windy API response structure for point forecast
 */
export interface WindyPointForecastResponse {
    ts: number[];
    data: WindyPointForecastData;
    model: string;
    source: string;
    refTime?: string;
}

/**
 * Windy API response for meteogram data
 */
export interface WindyMeteogramResponse {
    data: WindyMeteogramData;
    ts?: number[];
    hours?: number[];
}

/**
 * Parsed session data for type-safe restoration
 */
export interface SessionFlightPlanData {
    id: string;
    name: string;
    departureTime?: number;
    waypoints: Array<{
        id: string;
        name: string;
        type: string;
        lat: number;
        lon: number;
        altitude?: number;
        elevation?: number;
        comment?: string;
        countryCode?: string;
        frequency?: number;
        runways?: unknown[];
        eta?: number;
        distance?: number;
        bearing?: number;
        ete?: number;
        groundSpeed?: number;
        windDir?: number;
        windSpeed?: number;
        temperature?: number;
    }>;
    aircraft: {
        airspeed: number;
        defaultAltitude: number;
    };
    totals: {
        distance: number;
        ete: number;
        averageGroundSpeed?: number;
        averageHeadwind?: number;
    };
    sourceFile?: string;
    sourceFormat?: string;
}

/**
 * Type guard to check if data is valid point forecast data
 */
export function isPointForecastData(data: unknown): data is WindyPointForecastData {
    if (!data || typeof data !== 'object') return false;
    return Object.values(data).every(v => Array.isArray(v) && v.every(n => typeof n === 'number'));
}

/**
 * Type guard to check if data is valid meteogram data
 */
export function isMeteogramData(data: unknown): data is WindyMeteogramData {
    if (data === null) return true;
    if (!data || typeof data !== 'object') return false;
    return Object.values(data).every(v => Array.isArray(v) && v.every(n => typeof n === 'number'));
}
