/**
 * Mock helpers for weather service testing
 * Provides factory functions for creating test data with sensible defaults
 */

import type { WindyPointForecastData, WindyMeteogramData } from '../../src/types/weather';
import type { Waypoint } from '../../src/types/flightPlan';
import type {
    FullForecastData,
    WaypointWeather,
    LevelWind,
} from '../../src/services/weatherService';

// Default timestamps for testing (hourly intervals starting from a fixed point)
const BASE_TIMESTAMP = 1705312800000; // 2024-01-15T10:00:00Z

/**
 * Create mock point forecast data with customizable values
 */
export function createMockPointForecast(
    overrides: Partial<WindyPointForecastData> = {}
): WindyPointForecastData {
    const timestamps = [
        BASE_TIMESTAMP,
        BASE_TIMESTAMP + 3600000,
        BASE_TIMESTAMP + 7200000,
        BASE_TIMESTAMP + 10800000,
    ];

    return {
        'ts': timestamps,
        'wind_u-surface': [2.5, 3.0, 3.5, 4.0],
        'wind_v-surface': [1.5, 2.0, 2.5, 3.0],
        'wind_u-850h': [5.0, 6.0, 7.0, 8.0],
        'wind_v-850h': [3.0, 4.0, 5.0, 6.0],
        'wind_u-700h': [8.0, 9.0, 10.0, 11.0],
        'wind_v-700h': [5.0, 6.0, 7.0, 8.0],
        'wind_u-500h': [12.0, 13.0, 14.0, 15.0],
        'wind_v-500h': [8.0, 9.0, 10.0, 11.0],
        'gust-surface': [8.0, 10.0, 12.0, 14.0],
        'temp-surface': [288.15, 289.15, 290.15, 291.15],
        'temp-850h': [283.15, 284.15, 285.15, 286.15],
        'dewpoint-surface': [283.15, 284.15, 285.15, 286.15],
        'rh-surface': [75, 78, 80, 82],
        'past3hprecip-surface': [0, 0, 0.5, 1.0],
        'pressure-surface': [1013.25, 1012.50, 1012.00, 1011.50],
        'cbase-surface': [1500, 1400, 1200, 1000],
        ...overrides,
    };
}

/**
 * Create mock meteogram data with vertical wind profiles
 */
export function createMockMeteogramData(
    overrides: Partial<Record<string, number[]>> = {}
): WindyMeteogramData {
    const timestamps = [
        BASE_TIMESTAMP,
        BASE_TIMESTAMP + 3600000,
        BASE_TIMESTAMP + 7200000,
        BASE_TIMESTAMP + 10800000,
    ];

    return {
        'ts': timestamps,
        'windU-surface': [2.5, 3.0, 3.5, 4.0],
        'windV-surface': [1.5, 2.0, 2.5, 3.0],
        'windU-1000h': [3.0, 3.5, 4.0, 4.5],
        'windV-1000h': [2.0, 2.5, 3.0, 3.5],
        'windU-950h': [4.0, 4.5, 5.0, 5.5],
        'windV-950h': [2.5, 3.0, 3.5, 4.0],
        'windU-900h': [5.0, 5.5, 6.0, 6.5],
        'windV-900h': [3.0, 3.5, 4.0, 4.5],
        'windU-850h': [6.0, 6.5, 7.0, 7.5],
        'windV-850h': [4.0, 4.5, 5.0, 5.5],
        'windU-700h': [9.0, 9.5, 10.0, 10.5],
        'windV-700h': [6.0, 6.5, 7.0, 7.5],
        'windU-500h': [13.0, 13.5, 14.0, 14.5],
        'windV-500h': [9.0, 9.5, 10.0, 10.5],
        'temp-surface': [288.15, 289.15, 290.15, 291.15],
        'temp-850h': [283.15, 284.15, 285.15, 286.15],
        'cbase_octas': [1500, 1400, 1200, 1000],
        'rh-surface': [75, 78, 80, 82],
        'gust': [8.0, 10.0, 12.0, 14.0],
        ...overrides,
    };
}

/**
 * Create mock waypoint weather data
 */
export function createMockWaypointWeather(
    overrides: Partial<WaypointWeather> = {}
): WaypointWeather {
    return {
        windSpeed: 12,
        windDir: 270,
        windGust: 18,
        windAltitude: 5000,
        windLevel: '850h',
        surfaceWindSpeed: 8,
        surfaceWindDir: 260,
        temperature: 15,
        dewPoint: 10,
        pressure: 1013.25,
        cloudBase: 1500,
        cloudBaseDisplay: '4921 ft',
        visibility: 10,
        humidity: 75,
        precipitation: 0,
        timestamp: BASE_TIMESTAMP,
        ...overrides,
    };
}

/**
 * Create mock vertical wind levels
 */
export function createMockVerticalWinds(): LevelWind[] {
    return [
        { level: 'surface', altitudeFeet: 0, windSpeed: 6, windDir: 260 },
        { level: '1000h', altitudeFeet: 330, windSpeed: 7, windDir: 265 },
        { level: '950h', altitudeFeet: 1600, windSpeed: 9, windDir: 268 },
        { level: '900h', altitudeFeet: 3300, windSpeed: 11, windDir: 270 },
        { level: '850h', altitudeFeet: 5000, windSpeed: 14, windDir: 272 },
        { level: '700h', altitudeFeet: 10000, windSpeed: 22, windDir: 275 },
        { level: '500h', altitudeFeet: 18000, windSpeed: 32, windDir: 280 },
    ];
}

/**
 * Create mock full forecast data for caching tests
 */
export function createMockFullForecast(
    lat: number = 47.5,
    lon: number = -122.3,
    overrides: Partial<FullForecastData> = {}
): FullForecastData {
    const timestamps = [
        BASE_TIMESTAMP,
        BASE_TIMESTAMP + 3600000,
        BASE_TIMESTAMP + 7200000,
        BASE_TIMESTAMP + 10800000,
    ];

    return {
        lat,
        lon,
        altitude: 5000,
        timestamps,
        meteogramTimestamps: timestamps,
        pointForecastData: createMockPointForecast(),
        meteogramData: createMockMeteogramData(),
        verticalWinds: createMockVerticalWinds(),
        fetchedAt: Date.now(),
        ...overrides,
    };
}

/**
 * Create mock waypoints for flight plan testing
 */
export function createMockWaypoints(count: number = 3): Waypoint[] {
    const airports = [
        { id: 'KSEA', name: 'Seattle-Tacoma Intl', lat: 47.4502, lon: -122.3088, elevation: 433 },
        { id: 'KPDX', name: 'Portland Intl', lat: 45.5887, lon: -122.5975, elevation: 31 },
        { id: 'KSFO', name: 'San Francisco Intl', lat: 37.6213, lon: -122.3790, elevation: 13 },
        { id: 'KLAX', name: 'Los Angeles Intl', lat: 33.9425, lon: -118.4081, elevation: 128 },
        { id: 'KDEN', name: 'Denver Intl', lat: 39.8561, lon: -104.6737, elevation: 5430 },
    ];

    return airports.slice(0, Math.min(count, airports.length)).map((airport, index) => ({
        id: airport.id,
        name: airport.name,
        type: 'AIRPORT' as const,
        lat: airport.lat,
        lon: airport.lon,
        elevation: airport.elevation,
        altitude: 5000,
        altitudeMode: 'msl' as const,
        distance: index > 0 ? 100 + index * 50 : undefined,
        bearing: index > 0 ? 180 + index * 30 : undefined,
    }));
}

/**
 * Create a mock waypoint with weather data
 */
export function createMockWaypointWithWeather(
    base: Partial<Waypoint> = {},
    weather: Partial<WaypointWeather> = {}
): Waypoint {
    const mockWeather = createMockWaypointWeather(weather);
    return {
        id: 'TEST',
        name: 'Test Waypoint',
        type: 'AIRPORT' as const,
        lat: 47.5,
        lon: -122.3,
        altitude: 5000,
        ...base,
        windSpeed: mockWeather.windSpeed,
        windDir: mockWeather.windDir,
        groundSpeed: 100, // Default ground speed
        temperature: mockWeather.temperature,
    };
}

/**
 * Create a flight plan with mock weather data
 */
export function createMockFlightPlanWithWeather(waypointCount: number = 3) {
    const waypoints = createMockWaypoints(waypointCount);

    // Add weather and navigation data to waypoints
    return waypoints.map((wp, index) => {
        const weather = createMockWaypointWeather({
            windSpeed: 10 + index * 2,
            windDir: 270 + index * 10,
            temperature: 15 - index * 2,
        });

        return {
            ...wp,
            windSpeed: weather.windSpeed,
            windDir: weather.windDir,
            temperature: weather.temperature,
            groundSpeed: 120 - index * 5, // Slight variation
            ete: index > 0 ? 30 + index * 10 : undefined,
        };
    });
}

/**
 * Get the base timestamp used in mock data
 */
export function getBaseTimestamp(): number {
    return BASE_TIMESTAMP;
}

/**
 * Create timestamps array for testing
 */
export function createTimestamps(count: number = 4, intervalMs: number = 3600000): number[] {
    return Array.from({ length: count }, (_, i) => BASE_TIMESTAMP + i * intervalMs);
}
