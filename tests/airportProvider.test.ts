/**
 * Tests for Airport Provider
 */

import {
    createAirportProvider,
    isFallbackDataAvailable,
    type IAirportProvider,
    type AirportSearchResult,
} from '../src/services/airportProvider';

describe('airportProvider', () => {
    describe('createAirportProvider', () => {
        it('returns fallback provider when no API key', () => {
            const provider = createAirportProvider();
            expect(provider.isUsingFallback()).toBe(true);
            expect(provider.getSourceName()).toContain('Offline');
        });

        it('returns fallback provider for empty API key', () => {
            const provider = createAirportProvider('');
            expect(provider.isUsingFallback()).toBe(true);
        });

        it('returns fallback provider for whitespace API key', () => {
            const provider = createAirportProvider('   ');
            expect(provider.isUsingFallback()).toBe(true);
        });

        it('returns AirportDB provider when API key provided', () => {
            const provider = createAirportProvider('test-api-key');
            expect(provider.isUsingFallback()).toBe(false);
            expect(provider.getSourceName()).toContain('AirportDB');
        });
    });

    describe('isFallbackDataAvailable', () => {
        it('returns true when fallback data is loaded', () => {
            expect(isFallbackDataAvailable()).toBe(true);
        });
    });

    describe('FallbackProvider', () => {
        let provider: IAirportProvider;

        beforeAll(() => {
            provider = createAirportProvider(); // No API key = fallback
        });

        it('returns coverage description', () => {
            const coverage = provider.getCoverageDescription();
            expect(coverage).toContain('North America');
            expect(coverage).toContain('Europe');
        });

        it('finds Canadian airport', async () => {
            const result = await provider.searchByIcao('CYUL');
            expect(result).not.toBeNull();
            expect(result!.icao).toBe('CYUL');
            expect(result!.source).toBe('fallback');
        });

        it('finds US airport in coverage area', async () => {
            const result = await provider.searchByIcao('KJFK');
            expect(result).not.toBeNull();
            expect(result!.icao).toBe('KJFK');
            expect(result!.source).toBe('fallback');
        });

        it('returns null for out-of-coverage airport', async () => {
            // VHHH (Hong Kong) is outside NA + Europe coverage
            const result = await provider.searchByIcao('VHHH');
            expect(result).toBeNull();
        });

        it('includes runway data', async () => {
            const result = await provider.searchByIcao('CYUL');
            expect(result).not.toBeNull();
            expect(result!.runways.length).toBeGreaterThan(0);
            expect(result!.runways[0].lowEnd).toBeDefined();
            expect(result!.runways[0].highEnd).toBeDefined();
        });
    });
});
