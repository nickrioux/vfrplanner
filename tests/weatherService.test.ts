/**
 * Tests for weather service
 * Tests the modular weather service components
 */

import {
    createMockPointForecast,
    createMockMeteogramData,
    createMockWaypointWeather,
    createMockVerticalWinds,
    createMockFullForecast,
    getBaseTimestamp,
    createTimestamps,
} from './helpers/weatherMocks';

// Import altitude service functions
import {
    PRESSURE_LEVELS,
    METEOGRAM_PRESSURE_LEVELS,
    altitudeToPressureLevel,
    getBracketingPressureLevels,
    getAltitudeForPressureLevel,
} from '../src/services/altitudeToWindService';

// Import vertical wind service functions
import {
    getAllWindLevelsFromMeteogram,
    getWindAtAltitudeFromMeteogram,
    findWindKeyPairs,
    type LevelWind,
} from '../src/services/verticalWindService';

// Import point forecast service functions
import {
    estimateVisibility,
} from '../src/services/pointForecastService';

// Import forecast cache
import {
    ForecastCache,
    getCacheKey,
    CACHE_TTL_MS,
    MAX_CACHE_ENTRIES,
} from '../src/services/forecastCache';

describe('Altitude to Wind Service', () => {
    describe('PRESSURE_LEVELS', () => {
        it('should have surface level at 0 feet', () => {
            const surface = PRESSURE_LEVELS.find(p => p.level === 'surface');
            expect(surface).toBeDefined();
            expect(surface?.altitudeFeet).toBe(0);
        });

        it('should be sorted by altitude ascending', () => {
            for (let i = 1; i < PRESSURE_LEVELS.length; i++) {
                expect(PRESSURE_LEVELS[i].altitudeFeet).toBeGreaterThan(
                    PRESSURE_LEVELS[i - 1].altitudeFeet
                );
            }
        });

        it('should have common VFR levels', () => {
            const levels = PRESSURE_LEVELS.map(p => p.level);
            expect(levels).toContain('850h'); // ~5000ft
            expect(levels).toContain('700h'); // ~10000ft
        });
    });

    describe('METEOGRAM_PRESSURE_LEVELS', () => {
        it('should have more levels than PRESSURE_LEVELS', () => {
            expect(METEOGRAM_PRESSURE_LEVELS.length).toBeGreaterThan(
                PRESSURE_LEVELS.length - 1 // Exclude surface
            );
        });

        it('should include 925h level for low altitude flight', () => {
            const level = METEOGRAM_PRESSURE_LEVELS.find(p => p.level === '925h');
            expect(level).toBeDefined();
            expect(level?.altitudeFeet).toBe(2500);
        });
    });

    describe('altitudeToPressureLevel', () => {
        it('should return surface for low altitudes', () => {
            expect(altitudeToPressureLevel(0)).toBe('surface');
            expect(altitudeToPressureLevel(300)).toBe('surface');
            expect(altitudeToPressureLevel(499)).toBe('surface');
        });

        it('should return 950h for 1600-3300ft', () => {
            expect(altitudeToPressureLevel(2000)).toBe('950h');
            expect(altitudeToPressureLevel(3000)).toBe('950h');
        });

        it('should return 850h for 5000-10000ft', () => {
            expect(altitudeToPressureLevel(5000)).toBe('850h');
            expect(altitudeToPressureLevel(7500)).toBe('850h');
            expect(altitudeToPressureLevel(9999)).toBe('850h');
        });

        it('should return 700h for 10000-18000ft', () => {
            expect(altitudeToPressureLevel(10000)).toBe('700h');
            expect(altitudeToPressureLevel(15000)).toBe('700h');
        });

        it('should return 500h for 18000-30000ft', () => {
            expect(altitudeToPressureLevel(18000)).toBe('500h');
            expect(altitudeToPressureLevel(25000)).toBe('500h');
        });
    });

    describe('getBracketingPressureLevels', () => {
        it('should return null for negative altitude', () => {
            expect(getBracketingPressureLevels(-100)).toBeNull();
        });

        it('should return surface and 1000h for low altitudes', () => {
            const result = getBracketingPressureLevels(200);
            expect(result).not.toBeNull();
            expect(result?.lower.level).toBe('surface');
            expect(result?.upper.level).toBe('1000h');
        });

        it('should interpolate correctly between 850h and 700h', () => {
            const result = getBracketingPressureLevels(7500);
            expect(result).not.toBeNull();
            expect(result?.lower.level).toBe('850h');
            expect(result?.upper.level).toBe('700h');
            // 7500ft is halfway between 5000ft (850h) and 10000ft (700h)
            expect(result?.fraction).toBeCloseTo(0.5, 1);
        });

        it('should handle exact boundary values', () => {
            const result = getBracketingPressureLevels(5000);
            expect(result).not.toBeNull();
            // At 5000ft (850h level), we're at the upper boundary of 900h-850h bracket
            expect(result?.lower.level).toBe('900h');
            expect(result?.upper.level).toBe('850h');
            // Fraction should be 1 since we're at the exact upper boundary
            expect(result?.fraction).toBe(1);
        });
    });

    describe('getAltitudeForPressureLevel', () => {
        it('should return altitude for known levels', () => {
            expect(getAltitudeForPressureLevel('850h')).toBe(5000);
            expect(getAltitudeForPressureLevel('700h')).toBe(10000);
            expect(getAltitudeForPressureLevel('500h')).toBe(18000);
        });

        it('should return undefined for unknown levels', () => {
            expect(getAltitudeForPressureLevel('unknown')).toBeUndefined();
            expect(getAltitudeForPressureLevel('')).toBeUndefined();
        });
    });
});

describe('Vertical Wind Service', () => {
    describe('findWindKeyPairs', () => {
        it('should find wind U/V key pairs', () => {
            const data = createMockMeteogramData();
            const pairs = findWindKeyPairs(data);

            expect(pairs.size).toBeGreaterThan(0);
        });

        it('should handle different key formats', () => {
            const data = {
                'windU-850h': [5, 6, 7],
                'windV-850h': [3, 4, 5],
                'windU-700h': [8, 9, 10],
                'windV-700h': [5, 6, 7],
            };
            const pairs = findWindKeyPairs(data);

            expect(pairs.has('850h')).toBe(true);
            expect(pairs.has('700h')).toBe(true);
        });

        it('should return empty map for null data', () => {
            const pairs = findWindKeyPairs(null);
            expect(pairs.size).toBe(0);
        });
    });

    describe('getAllWindLevelsFromMeteogram', () => {
        it('should extract wind levels from meteogram data', () => {
            const data = createMockMeteogramData();
            const winds = getAllWindLevelsFromMeteogram(data, 0, false);

            expect(winds.length).toBeGreaterThan(0);
        });

        it('should sort winds by altitude ascending', () => {
            const data = createMockMeteogramData();
            const winds = getAllWindLevelsFromMeteogram(data, 0, false);

            for (let i = 1; i < winds.length; i++) {
                expect(winds[i].altitudeFeet).toBeGreaterThanOrEqual(
                    winds[i - 1].altitudeFeet
                );
            }
        });

        it('should calculate wind speed from U/V components', () => {
            const data = {
                'windU-850h': [3, 4, 5],  // 3 m/s eastward
                'windV-850h': [4, 5, 6],  // 4 m/s northward
            };
            const winds = getAllWindLevelsFromMeteogram(data, 0, false);

            // Speed = sqrt(3^2 + 4^2) = 5 m/s = ~9.7 kt
            const wind850 = winds.find(w => w.level === '850h');
            expect(wind850).toBeDefined();
            expect(wind850?.windSpeed).toBeCloseTo(9.7, 0);
        });

        it('should return empty array for null data', () => {
            const winds = getAllWindLevelsFromMeteogram(null, 0, false);
            expect(winds).toEqual([]);
        });
    });

    describe('getWindAtAltitudeFromMeteogram', () => {
        it('should return null for null data', () => {
            const result = getWindAtAltitudeFromMeteogram(null, 5000, 0, false);
            expect(result).toBeNull();
        });

        it('should return wind at exact level altitude', () => {
            const data = createMockMeteogramData();
            const result = getWindAtAltitudeFromMeteogram(data, 5000, 0, false);

            expect(result).not.toBeNull();
            expect(result?.level).toContain('850');
        });

        it('should interpolate between levels', () => {
            const data = createMockMeteogramData();
            // 7500ft is between 850h (5000ft) and 700h (10000ft)
            const result = getWindAtAltitudeFromMeteogram(data, 7500, 0, false);

            expect(result).not.toBeNull();
            expect(result?.level).toContain('-'); // Indicates interpolation
        });
    });
});

describe('Point Forecast Service', () => {
    describe('estimateVisibility', () => {
        it('should return low visibility for high humidity', () => {
            expect(estimateVisibility(100)).toBe(0.5);
            expect(estimateVisibility(95)).toBe(2);
            expect(estimateVisibility(90)).toBe(5);
        });

        it('should return moderate visibility for moderate humidity', () => {
            expect(estimateVisibility(80)).toBe(10);
        });

        it('should return high visibility for low humidity', () => {
            expect(estimateVisibility(50)).toBe(20);
            expect(estimateVisibility(30)).toBe(20);
        });
    });
});

describe('Forecast Cache', () => {
    let cache: ForecastCache;

    beforeEach(() => {
        cache = new ForecastCache();
    });

    describe('getCacheKey', () => {
        it('should generate consistent keys', () => {
            expect(getCacheKey(47.5, -122.3)).toBe('47.5000,-122.3000');
            // toFixed(4) rounds 47.12345 to 47.1234 (banker's rounding)
            expect(getCacheKey(47.12345, -122.67890)).toBe('47.1234,-122.6789');
        });
    });

    describe('set and get', () => {
        it('should store and retrieve forecast data', () => {
            const forecast = createMockFullForecast(47.5, -122.3);
            cache.set(47.5, -122.3, forecast);

            const retrieved = cache.get(47.5, -122.3);
            expect(retrieved).not.toBeNull();
            expect(retrieved?.lat).toBe(47.5);
            expect(retrieved?.lon).toBe(-122.3);
        });

        it('should return null for non-existent location', () => {
            const result = cache.get(0, 0);
            expect(result).toBeNull();
        });
    });

    describe('has', () => {
        it('should return true for cached location', () => {
            const forecast = createMockFullForecast();
            cache.set(47.5, -122.3, forecast);

            expect(cache.has(47.5, -122.3)).toBe(true);
        });

        it('should return false for non-cached location', () => {
            expect(cache.has(0, 0)).toBe(false);
        });
    });

    describe('size', () => {
        it('should track cache size', () => {
            expect(cache.size).toBe(0);

            cache.set(47.5, -122.3, createMockFullForecast(47.5, -122.3));
            expect(cache.size).toBe(1);

            cache.set(45.5, -122.5, createMockFullForecast(45.5, -122.5));
            expect(cache.size).toBe(2);
        });
    });

    describe('clear', () => {
        it('should remove all cached data', () => {
            cache.set(47.5, -122.3, createMockFullForecast(47.5, -122.3));
            cache.set(45.5, -122.5, createMockFullForecast(45.5, -122.5));
            expect(cache.size).toBe(2);

            cache.clear();
            expect(cache.size).toBe(0);
        });
    });

    describe('constants', () => {
        it('should have correct TTL', () => {
            expect(CACHE_TTL_MS).toBe(5 * 60 * 1000); // 5 minutes
        });

        it('should have correct max entries', () => {
            expect(MAX_CACHE_ENTRIES).toBe(100);
        });
    });
});

describe('Weather Mock Helpers', () => {
    describe('createMockPointForecast', () => {
        it('should create valid point forecast data', () => {
            const data = createMockPointForecast();

            expect(data['ts']).toBeDefined();
            expect(data['wind_u-surface']).toBeDefined();
            expect(data['wind_v-surface']).toBeDefined();
            expect(data['temp-surface']).toBeDefined();
        });

        it('should allow overrides', () => {
            const data = createMockPointForecast({
                'wind_u-surface': [10, 11, 12, 13],
            });

            expect(data['wind_u-surface']).toEqual([10, 11, 12, 13]);
        });
    });

    describe('createMockMeteogramData', () => {
        it('should create valid meteogram data', () => {
            const data = createMockMeteogramData();

            expect(data).not.toBeNull();
            expect(data?.['ts']).toBeDefined();
            expect(data?.['windU-850h']).toBeDefined();
            expect(data?.['windV-850h']).toBeDefined();
        });
    });

    describe('createMockWaypointWeather', () => {
        it('should create weather with all properties', () => {
            const weather = createMockWaypointWeather();

            expect(weather.windSpeed).toBeDefined();
            expect(weather.windDir).toBeDefined();
            expect(weather.temperature).toBeDefined();
            expect(weather.timestamp).toBeDefined();
        });

        it('should allow overrides', () => {
            const weather = createMockWaypointWeather({
                windSpeed: 25,
                temperature: 20,
            });

            expect(weather.windSpeed).toBe(25);
            expect(weather.temperature).toBe(20);
        });
    });

    describe('createMockVerticalWinds', () => {
        it('should create array of wind levels', () => {
            const winds = createMockVerticalWinds();

            expect(winds.length).toBeGreaterThan(0);
            expect(winds[0].level).toBeDefined();
            expect(winds[0].altitudeFeet).toBeDefined();
            expect(winds[0].windSpeed).toBeDefined();
            expect(winds[0].windDir).toBeDefined();
        });
    });

    describe('createMockFullForecast', () => {
        it('should create complete forecast data', () => {
            const forecast = createMockFullForecast(47.5, -122.3);

            expect(forecast.lat).toBe(47.5);
            expect(forecast.lon).toBe(-122.3);
            expect(forecast.timestamps.length).toBeGreaterThan(0);
            expect(forecast.pointForecastData).toBeDefined();
            expect(forecast.meteogramData).toBeDefined();
            expect(forecast.verticalWinds.length).toBeGreaterThan(0);
        });
    });

    describe('getBaseTimestamp', () => {
        it('should return a valid timestamp', () => {
            const ts = getBaseTimestamp();
            expect(typeof ts).toBe('number');
            expect(ts).toBeGreaterThan(0);
        });
    });

    describe('createTimestamps', () => {
        it('should create array of timestamps', () => {
            const timestamps = createTimestamps(4);

            expect(timestamps.length).toBe(4);
            // Check intervals
            for (let i = 1; i < timestamps.length; i++) {
                expect(timestamps[i] - timestamps[i - 1]).toBe(3600000); // 1 hour
            }
        });

        it('should use custom interval', () => {
            const timestamps = createTimestamps(3, 1800000); // 30 min

            expect(timestamps.length).toBe(3);
            expect(timestamps[1] - timestamps[0]).toBe(1800000);
        });
    });
});
