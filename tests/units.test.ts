/**
 * Unit tests for conversion utilities
 */
import {
    metersToFeet,
    feetToMeters,
    msToKnots,
    knotsToMs,
    nmToMeters,
    metersToNm,
    kelvinToCelsius,
    celsiusToKelvin,
} from '../src/utils/units';

describe('Unit Conversions', () => {
    describe('metersToFeet', () => {
        it('converts 0 meters to 0 feet', () => {
            expect(metersToFeet(0)).toBe(0);
        });

        it('converts 1 meter to approximately 3.28 feet', () => {
            expect(metersToFeet(1)).toBeCloseTo(3.28084, 4);
        });

        it('converts 1000 meters to approximately 3281 feet', () => {
            expect(metersToFeet(1000)).toBeCloseTo(3280.84, 1);
        });

        it('handles negative values', () => {
            expect(metersToFeet(-100)).toBeCloseTo(-328.084, 2);
        });
    });

    describe('feetToMeters', () => {
        it('converts 0 feet to 0 meters', () => {
            expect(feetToMeters(0)).toBe(0);
        });

        it('converts 1 foot to approximately 0.3048 meters', () => {
            expect(feetToMeters(1)).toBeCloseTo(0.3048, 4);
        });

        it('converts 3281 feet to approximately 1000 meters', () => {
            expect(feetToMeters(3280.84)).toBeCloseTo(1000, 0);
        });

        it('is inverse of metersToFeet', () => {
            const meters = 500;
            expect(feetToMeters(metersToFeet(meters))).toBeCloseTo(meters, 4);
        });
    });

    describe('msToKnots', () => {
        it('converts 0 m/s to 0 knots', () => {
            expect(msToKnots(0)).toBe(0);
        });

        it('converts 1 m/s to approximately 1.94 knots', () => {
            expect(msToKnots(1)).toBeCloseTo(1.94384, 4);
        });

        it('converts 10 m/s to approximately 19.4 knots', () => {
            expect(msToKnots(10)).toBeCloseTo(19.4384, 3);
        });
    });

    describe('knotsToMs', () => {
        it('converts 0 knots to 0 m/s', () => {
            expect(knotsToMs(0)).toBe(0);
        });

        it('converts 1 knot to approximately 0.514 m/s', () => {
            expect(knotsToMs(1)).toBeCloseTo(0.514444, 4);
        });

        it('is inverse of msToKnots', () => {
            const ms = 15;
            expect(knotsToMs(msToKnots(ms))).toBeCloseTo(ms, 4);
        });
    });

    describe('nmToMeters', () => {
        it('converts 0 NM to 0 meters', () => {
            expect(nmToMeters(0)).toBe(0);
        });

        it('converts 1 NM to 1852 meters', () => {
            expect(nmToMeters(1)).toBe(1852);
        });

        it('converts 10 NM to 18520 meters', () => {
            expect(nmToMeters(10)).toBe(18520);
        });
    });

    describe('metersToNm', () => {
        it('converts 0 meters to 0 NM', () => {
            expect(metersToNm(0)).toBe(0);
        });

        it('converts 1852 meters to 1 NM', () => {
            expect(metersToNm(1852)).toBe(1);
        });

        it('is inverse of nmToMeters', () => {
            const nm = 25;
            expect(metersToNm(nmToMeters(nm))).toBeCloseTo(nm, 5);
        });
    });

    describe('kelvinToCelsius', () => {
        it('converts 273.15 K to 0 C (freezing point)', () => {
            expect(kelvinToCelsius(273.15)).toBeCloseTo(0, 5);
        });

        it('converts 373.15 K to 100 C (boiling point)', () => {
            expect(kelvinToCelsius(373.15)).toBeCloseTo(100, 5);
        });

        it('converts 0 K to -273.15 C (absolute zero)', () => {
            expect(kelvinToCelsius(0)).toBeCloseTo(-273.15, 5);
        });
    });

    describe('celsiusToKelvin', () => {
        it('converts 0 C to 273.15 K', () => {
            expect(celsiusToKelvin(0)).toBeCloseTo(273.15, 5);
        });

        it('converts -273.15 C to 0 K (absolute zero)', () => {
            expect(celsiusToKelvin(-273.15)).toBeCloseTo(0, 5);
        });

        it('is inverse of kelvinToCelsius', () => {
            const celsius = 20;
            expect(kelvinToCelsius(celsiusToKelvin(celsius))).toBeCloseTo(celsius, 5);
        });
    });
});
