/**
 * Tests for Airport Fallback Service
 */

import {
    getAirportByIcao,
    hasAirport,
    searchAirports,
    getFallbackMeta,
    getAirportCount,
    isAvailable,
} from '../src/services/airportFallbackService';

describe('airportFallbackService', () => {
    describe('isAvailable', () => {
        it('returns true when data is loaded', () => {
            expect(isAvailable()).toBe(true);
        });
    });

    describe('getFallbackMeta', () => {
        it('returns metadata with expected fields', () => {
            const meta = getFallbackMeta();
            expect(meta.source).toBe('OurAirports');
            expect(meta.count).toBeGreaterThan(0);
            expect(meta.regions.canada).toBeDefined();
            expect(meta.regions.us).toBeDefined();
        });
    });

    describe('getAirportCount', () => {
        it('returns a positive number', () => {
            expect(getAirportCount()).toBeGreaterThan(100);
        });
    });

    describe('hasAirport', () => {
        it('returns true for known Canadian airport', () => {
            expect(hasAirport('CYUL')).toBe(true);
        });

        it('returns true for known US airport in coverage', () => {
            expect(hasAirport('KJFK')).toBe(true);
        });

        it('returns false for airport outside coverage', () => {
            // LAX is in California, not in NE US
            expect(hasAirport('KLAX')).toBe(false);
        });

        it('handles lowercase input', () => {
            expect(hasAirport('cyul')).toBe(true);
        });

        it('handles whitespace', () => {
            expect(hasAirport('  CYUL  ')).toBe(true);
        });
    });

    describe('getAirportByIcao', () => {
        it('returns airport data for valid ICAO', () => {
            const apt = getAirportByIcao('CYUL');
            expect(apt).not.toBeNull();
            expect(apt!.icao).toBe('CYUL');
            expect(apt!.name).toContain('Montreal');
            expect(apt!.lat).toBeCloseTo(45.47, 1);
            expect(apt!.lon).toBeCloseTo(-73.74, 1);
            expect(apt!.elevation).toBeGreaterThan(0);
            expect(apt!.type).toBe('large_airport');
            expect(apt!.region).toBe('CA-QC');
        });

        it('returns runways for major airports', () => {
            const apt = getAirportByIcao('CYUL');
            expect(apt).not.toBeNull();
            expect(apt!.runways.length).toBeGreaterThan(0);

            const rwy = apt!.runways[0];
            expect(rwy.lowEnd.ident).toBeDefined();
            expect(rwy.highEnd.ident).toBeDefined();
            expect(rwy.lengthFt).toBeGreaterThan(0);
            expect(rwy.lowEnd.headingTrue).toBeGreaterThanOrEqual(0);
            expect(rwy.lowEnd.headingTrue).toBeLessThan(360);
        });

        it('returns null for unknown ICAO', () => {
            expect(getAirportByIcao('ZZZZ')).toBeNull();
        });

        it('returns null for out-of-coverage airport', () => {
            expect(getAirportByIcao('KLAX')).toBeNull();
        });
    });

    describe('searchAirports', () => {
        it('returns airports matching prefix', () => {
            const results = searchAirports('CY');
            expect(results.length).toBeGreaterThan(0);
            expect(results.every(apt => apt.icao.startsWith('CY'))).toBe(true);
        });

        it('limits results to maxResults', () => {
            const results = searchAirports('C', 5);
            expect(results.length).toBeLessThanOrEqual(5);
        });

        it('returns empty array for no matches', () => {
            const results = searchAirports('ZZZ');
            expect(results).toEqual([]);
        });

        it('handles empty query', () => {
            const results = searchAirports('');
            expect(results).toEqual([]);
        });
    });
});
