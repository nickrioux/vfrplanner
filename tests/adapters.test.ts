/**
 * Unit tests for API adapters
 */

import {
    HttpApiAdapter,
    AirportDbAdapter,
    OpenAipAdapter,
    ElevationAdapter,
    DEFAULT_TIMEOUT,
    DEFAULT_RETRY_CONFIG,
} from '../src/adapters';
import type { ApiConfig, ApiResponse } from '../src/adapters';

// Mock fetch globally
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Reset mocks before each test
beforeEach(() => {
    mockFetch.mockReset();
});

describe('API Adapters', () => {
    describe('HttpApiAdapter (base class)', () => {
        // Create a concrete implementation for testing
        class TestAdapter extends HttpApiAdapter {
            constructor(config: ApiConfig) {
                super(config);
            }
            getName(): string {
                return 'TestAdapter';
            }
        }

        it('should initialize with default config values', () => {
            const adapter = new TestAdapter({
                baseUrl: 'https://api.example.com',
                authType: 'none',
            });

            expect(adapter.isReady()).toBe(true);
        });

        it('should require credentials for auth types other than none', () => {
            const adapter = new TestAdapter({
                baseUrl: 'https://api.example.com',
                authType: 'query-param',
                authParamName: 'apiKey',
            });

            expect(adapter.isReady()).toBe(false);
            adapter.setCredentials('test-key');
            expect(adapter.isReady()).toBe(true);
        });

        it('should make successful GET requests', async () => {
            const adapter = new TestAdapter({
                baseUrl: 'https://api.example.com',
                authType: 'none',
            });

            mockFetch.mockResolvedValueOnce({
                ok: true,
                status: 200,
                headers: new Map([['content-type', 'application/json']]),
                json: async () => ({ data: 'test' }),
            });

            const response = await adapter.get<{ data: string }>('/test');

            expect(response.success).toBe(true);
            expect(response.data).toEqual({ data: 'test' });
            expect(response.status).toBe(200);
            expect(mockFetch).toHaveBeenCalledTimes(1);
        });

        it('should handle error responses', async () => {
            const adapter = new TestAdapter({
                baseUrl: 'https://api.example.com',
                authType: 'none',
            });

            mockFetch.mockResolvedValueOnce({
                ok: false,
                status: 404,
                statusText: 'Not Found',
                headers: new Map([['content-type', 'application/json']]),
                json: async () => ({ message: 'Resource not found' }),
            });

            const response = await adapter.get('/not-found');

            expect(response.success).toBe(false);
            expect(response.status).toBe(404);
            expect(response.error?.message).toContain('Resource not found');
        });

        it('should add query param authentication', async () => {
            const adapter = new TestAdapter({
                baseUrl: 'https://api.example.com',
                authType: 'query-param',
                authParamName: 'apiKey',
            });
            adapter.setCredentials('my-secret-key');

            mockFetch.mockResolvedValueOnce({
                ok: true,
                status: 200,
                headers: new Map([['content-type', 'application/json']]),
                json: async () => ({}),
            });

            await adapter.get('/test');

            const calledUrl = mockFetch.mock.calls[0][0];
            expect(calledUrl).toContain('apiKey=my-secret-key');
        });

        it('should add bearer authentication header', async () => {
            const adapter = new TestAdapter({
                baseUrl: 'https://api.example.com',
                authType: 'bearer',
            });
            adapter.setCredentials('my-token');

            mockFetch.mockResolvedValueOnce({
                ok: true,
                status: 200,
                headers: new Map([['content-type', 'application/json']]),
                json: async () => ({}),
            });

            await adapter.get('/test');

            const calledOptions = mockFetch.mock.calls[0][1];
            expect(calledOptions.headers['Authorization']).toBe('Bearer my-token');
        });

        it('should retry on retryable status codes', async () => {
            const adapter = new TestAdapter({
                baseUrl: 'https://api.example.com',
                authType: 'none',
                maxRetries: 3,
                retryBaseDelay: 10, // Short delay for tests
            });

            // First two calls fail with 503, third succeeds
            mockFetch
                .mockResolvedValueOnce({
                    ok: false,
                    status: 503,
                    statusText: 'Service Unavailable',
                    headers: new Map(),
                    json: async () => ({}),
                })
                .mockResolvedValueOnce({
                    ok: false,
                    status: 503,
                    statusText: 'Service Unavailable',
                    headers: new Map(),
                    json: async () => ({}),
                })
                .mockResolvedValueOnce({
                    ok: true,
                    status: 200,
                    headers: new Map([['content-type', 'application/json']]),
                    json: async () => ({ success: true }),
                });

            const response = await adapter.get('/flaky');

            expect(response.success).toBe(true);
            expect(mockFetch).toHaveBeenCalledTimes(3);
        });

        it('should not retry on non-retryable status codes', async () => {
            const adapter = new TestAdapter({
                baseUrl: 'https://api.example.com',
                authType: 'none',
                maxRetries: 3,
            });

            mockFetch.mockResolvedValueOnce({
                ok: false,
                status: 400,
                statusText: 'Bad Request',
                headers: new Map(),
                json: async () => ({ message: 'Invalid input' }),
            });

            const response = await adapter.get('/bad-request');

            expect(response.success).toBe(false);
            expect(response.status).toBe(400);
            expect(mockFetch).toHaveBeenCalledTimes(1);
        });

        it('should handle network errors', async () => {
            const adapter = new TestAdapter({
                baseUrl: 'https://api.example.com',
                authType: 'none',
                maxRetries: 1,
            });

            mockFetch.mockRejectedValueOnce(new Error('Network error'));

            const response = await adapter.get('/network-fail');

            expect(response.success).toBe(false);
            expect(response.error?.code).toBe('NETWORK_ERROR');
        });

        it('should handle timeouts', async () => {
            const adapter = new TestAdapter({
                baseUrl: 'https://api.example.com',
                authType: 'none',
                timeout: 100,
                maxRetries: 1,
            });

            const abortError = new Error('Aborted');
            abortError.name = 'AbortError';
            mockFetch.mockRejectedValueOnce(abortError);

            const response = await adapter.get('/slow');

            expect(response.success).toBe(false);
            expect(response.error?.code).toBe('TIMEOUT');
        });

        it('should apply request interceptors', async () => {
            const adapter = new TestAdapter({
                baseUrl: 'https://api.example.com',
                authType: 'none',
            });

            adapter.addRequestInterceptor(async (url, options) => {
                return {
                    url: url + '&intercepted=true',
                    options: {
                        ...options,
                        headers: { ...options.headers, 'X-Custom': 'header' },
                    },
                };
            });

            mockFetch.mockResolvedValueOnce({
                ok: true,
                status: 200,
                headers: new Map([['content-type', 'application/json']]),
                json: async () => ({}),
            });

            await adapter.get('/test');

            const calledUrl = mockFetch.mock.calls[0][0];
            const calledOptions = mockFetch.mock.calls[0][1];
            expect(calledUrl).toContain('intercepted=true');
            expect(calledOptions.headers['X-Custom']).toBe('header');
        });
    });

    describe('AirportDbAdapter', () => {
        it('should initialize with API key', () => {
            const adapter = new AirportDbAdapter('test-api-key');
            expect(adapter.isReady()).toBe(true);
            expect(adapter.getName()).toBe('AirportDB');
        });

        it('should fail without API key', async () => {
            const adapter = new AirportDbAdapter();
            const response = await adapter.getAirport('CYUL');

            expect(response.success).toBe(false);
            expect(response.error?.code).toBe('NO_CREDENTIALS');
        });

        it('should validate ICAO codes', async () => {
            const adapter = new AirportDbAdapter('test-key');

            const response = await adapter.getAirport('invalid');
            expect(response.success).toBe(false);
            expect(response.error?.code).toBe('INVALID_ICAO');
        });

        it('should fetch airport data', async () => {
            const adapter = new AirportDbAdapter('test-key');

            const mockAirport = {
                id: '123',
                ident: 'CYUL',
                name: 'Montreal-Trudeau',
                latitude_deg: 45.47,
                longitude_deg: -73.74,
                elevation_ft: 118,
                type: 'large_airport',
                iso_country: 'CA',
                iso_region: 'CA-QC',
                municipality: 'Montreal',
                runways: [
                    {
                        id: '1',
                        length_ft: 11000,
                        width_ft: 200,
                        surface: 'ASP',
                        lighted: true,
                        closed: false,
                        le_ident: '06L',
                        le_heading_degT: 58,
                        le_displaced_threshold_ft: 0,
                        le_elevation_ft: 118,
                        he_ident: '24R',
                        he_heading_degT: 238,
                        he_displaced_threshold_ft: 0,
                        he_elevation_ft: 116,
                    },
                ],
                freqs: [
                    {
                        id: '1',
                        type: 'TWR',
                        description: 'Tower',
                        frequency_mhz: '119.1',
                    },
                ],
            };

            mockFetch.mockResolvedValueOnce({
                ok: true,
                status: 200,
                headers: new Map([['content-type', 'application/json']]),
                json: async () => mockAirport,
            });

            const response = await adapter.getAirport('CYUL');

            expect(response.success).toBe(true);
            expect(response.data?.ident).toBe('CYUL');
        });

        it('should normalize airport data', async () => {
            const adapter = new AirportDbAdapter('test-key');

            const mockAirport = {
                id: '123',
                ident: 'CYUL',
                iata_code: 'YUL',
                name: 'Montreal-Trudeau',
                latitude_deg: 45.47,
                longitude_deg: -73.74,
                elevation_ft: 118,
                type: 'large_airport',
                iso_country: 'CA',
                iso_region: 'CA-QC',
                municipality: 'Montreal',
                runways: [],
                freqs: [],
            };

            mockFetch.mockResolvedValueOnce({
                ok: true,
                status: 200,
                headers: new Map([['content-type', 'application/json']]),
                json: async () => mockAirport,
            });

            const response = await adapter.getAirportNormalized('CYUL');

            expect(response.success).toBe(true);
            expect(response.data?.icao).toBe('CYUL');
            expect(response.data?.iata).toBe('YUL');
            expect(response.data?.elevation).toBe(118);
        });
    });

    describe('OpenAipAdapter', () => {
        it('should initialize with API key', () => {
            const adapter = new OpenAipAdapter('test-api-key');
            expect(adapter.isReady()).toBe(true);
            expect(adapter.getName()).toBe('OpenAIP');
        });

        it('should fail without API key', async () => {
            const adapter = new OpenAipAdapter();
            const response = await adapter.searchAirports({ query: 'CYUL' });

            expect(response.success).toBe(false);
            expect(response.error?.code).toBe('NO_CREDENTIALS');
        });

        it('should search airports', async () => {
            const adapter = new OpenAipAdapter('test-key');

            const mockResponse = {
                items: [
                    {
                        _id: '123',
                        name: 'Montreal-Trudeau',
                        icaoCode: 'CYUL',
                        type: 0,
                        country: 'CA',
                        geometry: {
                            type: 'Point',
                            coordinates: [-73.74, 45.47],
                        },
                        elevation: { value: 36, unit: 1 }, // meters
                    },
                ],
                limit: 20,
                totalCount: 1,
                totalPages: 1,
                page: 1,
            };

            mockFetch.mockResolvedValueOnce({
                ok: true,
                status: 200,
                headers: new Map([['content-type', 'application/json']]),
                json: async () => mockResponse,
            });

            const response = await adapter.searchAirports({ query: 'Montreal' });

            expect(response.success).toBe(true);
            expect(response.data?.items).toHaveLength(1);
            expect(response.data?.pagination.totalCount).toBe(1);
        });

        it('should search nearby with position', async () => {
            const adapter = new OpenAipAdapter('test-key');

            mockFetch.mockResolvedValueOnce({
                ok: true,
                status: 200,
                headers: new Map([['content-type', 'application/json']]),
                json: async () => ({
                    items: [],
                    limit: 20,
                    totalCount: 0,
                    totalPages: 0,
                    page: 1,
                }),
            });

            await adapter.searchAirports({
                position: [-73.74, 45.47],
                distance: 50000,
            });

            const calledUrl = mockFetch.mock.calls[0][0];
            expect(calledUrl).toContain('pos=-73.74%2C45.47');
            expect(calledUrl).toContain('dist=50000');
            expect(calledUrl).toContain('sort=distance');
        });

        it('should convert elevation units', () => {
            const airportMeters = {
                _id: '1',
                name: 'Test',
                type: 0,
                country: 'CA',
                geometry: { type: 'Point' as const, coordinates: [0, 0] as [number, number] },
                elevation: { value: 100, unit: 1 }, // 100 meters
            };

            const airportFeet = {
                ...airportMeters,
                elevation: { value: 328, unit: 6 }, // 328 feet
            };

            expect(OpenAipAdapter.getElevationFeet(airportMeters)).toBe(328);
            expect(OpenAipAdapter.getElevationFeet(airportFeet)).toBe(328);
        });
    });

    describe('ElevationAdapter', () => {
        it('should initialize without credentials', () => {
            const adapter = new ElevationAdapter();
            expect(adapter.isReady()).toBe(true);
            expect(adapter.getName()).toBe('Elevation');
        });

        it('should get single elevation', async () => {
            const adapter = new ElevationAdapter();

            mockFetch.mockResolvedValueOnce({
                ok: true,
                status: 200,
                headers: new Map([['content-type', 'application/json']]),
                json: async () => ({ elevation: [250] }),
            });

            const response = await adapter.getElevation({
                latitude: 45.5,
                longitude: -73.6,
            });

            expect(response.success).toBe(true);
            expect(response.data).toBe(250);
        });

        it('should get batch elevations', async () => {
            const adapter = new ElevationAdapter();

            mockFetch.mockResolvedValueOnce({
                ok: true,
                status: 200,
                headers: new Map([['content-type', 'application/json']]),
                json: async () => ({ elevation: [100, 150, 200] }),
            });

            const response = await adapter.getElevations([
                { latitude: 45.5, longitude: -73.6 },
                { latitude: 45.6, longitude: -73.7 },
                { latitude: 45.7, longitude: -73.8 },
            ]);

            expect(response.success).toBe(true);
            expect(response.data?.points).toHaveLength(3);
            expect(response.data?.points[0].elevation).toBe(100);
            expect(response.data?.points[1].elevation).toBe(150);
            expect(response.data?.points[2].elevation).toBe(200);
        });

        it('should handle empty coordinate array', async () => {
            const adapter = new ElevationAdapter();

            const response = await adapter.getElevations([]);

            expect(response.success).toBe(true);
            expect(response.data?.points).toHaveLength(0);
            expect(mockFetch).not.toHaveBeenCalled();
        });

        it('should get route elevations', async () => {
            const adapter = new ElevationAdapter();

            // Mock will be called with sampled points
            mockFetch.mockResolvedValueOnce({
                ok: true,
                status: 200,
                headers: new Map([['content-type', 'application/json']]),
                json: async () => ({ elevation: [100, 120, 150, 180, 200] }),
            });

            const response = await adapter.getRouteElevations(
                [
                    { latitude: 45.5, longitude: -73.6 },
                    { latitude: 45.6, longitude: -73.7 },
                ],
                10000 // 10km intervals
            );

            expect(response.success).toBe(true);
            expect(response.data).toBeDefined();
        });

        it('should reject invalid routes', async () => {
            const adapter = new ElevationAdapter();

            const response = await adapter.getRouteElevations([
                { latitude: 45.5, longitude: -73.6 },
            ]);

            expect(response.success).toBe(false);
            expect(response.error?.code).toBe('INVALID_ROUTE');
        });
    });

    describe('Default Constants', () => {
        it('should have correct default timeout', () => {
            expect(DEFAULT_TIMEOUT).toBe(15000);
        });

        it('should have correct default retry config', () => {
            expect(DEFAULT_RETRY_CONFIG.maxAttempts).toBe(3);
            expect(DEFAULT_RETRY_CONFIG.baseDelay).toBe(1000);
            expect(DEFAULT_RETRY_CONFIG.maxDelay).toBe(10000);
            expect(DEFAULT_RETRY_CONFIG.retryableStatuses).toContain(503);
            expect(DEFAULT_RETRY_CONFIG.retryableStatuses).toContain(429);
        });
    });
});
