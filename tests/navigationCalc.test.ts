/**
 * Unit tests for navigation calculations
 */
import {
    calculateBearing,
    calculateDistance,
    calculateHeadwindComponent,
    calculateGroundSpeed,
    formatDistance,
    formatBearing,
    formatEte,
    formatHeadwind,
} from '../src/services/navigationCalc';

describe('Navigation Calculations', () => {
    describe('calculateBearing', () => {
        it('calculates bearing from CYUL to CYHU (approximately east)', () => {
            // CYUL: 45.4706, -73.7408
            // CYHU: 45.5175, -73.4169
            const bearing = calculateBearing(45.4706, -73.7408, 45.5175, -73.4169);
            expect(bearing).toBeGreaterThan(60);
            expect(bearing).toBeLessThan(80);
        });

        it('calculates due north as approximately 0 degrees', () => {
            const bearing = calculateBearing(45.0, -73.0, 46.0, -73.0);
            expect(bearing).toBeCloseTo(0, 0);
        });

        it('calculates due south as approximately 180 degrees', () => {
            const bearing = calculateBearing(46.0, -73.0, 45.0, -73.0);
            expect(bearing).toBeCloseTo(180, 0);
        });

        it('calculates due east as approximately 90 degrees', () => {
            const bearing = calculateBearing(45.0, -73.0, 45.0, -72.0);
            expect(bearing).toBeCloseTo(90, 0);
        });

        it('calculates due west as approximately 270 degrees', () => {
            const bearing = calculateBearing(45.0, -73.0, 45.0, -74.0);
            expect(bearing).toBeCloseTo(270, 0);
        });
    });

    describe('calculateDistance', () => {
        it('calculates distance from CYUL to CYHU (approximately 13-17 NM)', () => {
            const distance = calculateDistance(45.4706, -73.7408, 45.5175, -73.4169);
            expect(distance).toBeGreaterThan(12);
            expect(distance).toBeLessThan(18);
        });

        it('calculates 0 distance for same point', () => {
            const distance = calculateDistance(45.0, -73.0, 45.0, -73.0);
            expect(distance).toBe(0);
        });

        it('calculates approximately 60 NM per degree latitude', () => {
            // 1 degree of latitude is approximately 60 NM
            const distance = calculateDistance(45.0, -73.0, 46.0, -73.0);
            expect(distance).toBeCloseTo(60, -1);
        });
    });

    describe('calculateHeadwindComponent', () => {
        it('calculates full headwind when flying into wind', () => {
            // Flying north (0 deg) with wind from north (0 deg) = full headwind
            const headwind = calculateHeadwindComponent(0, 0, 20);
            expect(headwind).toBeCloseTo(20, 1);
        });

        it('calculates full tailwind when wind is from behind', () => {
            // Flying north (0 deg) with wind from south (180 deg) = full tailwind
            const headwind = calculateHeadwindComponent(0, 180, 20);
            expect(headwind).toBeCloseTo(-20, 1);
        });

        it('calculates zero headwind with crosswind', () => {
            // Flying north (0 deg) with wind from east (90 deg) = no headwind
            const headwind = calculateHeadwindComponent(0, 90, 20);
            expect(headwind).toBeCloseTo(0, 1);
        });

        it('calculates partial headwind at 45 degrees', () => {
            // Flying north (0 deg) with wind from northeast (45 deg)
            const headwind = calculateHeadwindComponent(0, 45, 20);
            expect(headwind).toBeCloseTo(20 * Math.cos(Math.PI / 4), 1);
        });
    });

    describe('calculateGroundSpeed', () => {
        it('returns TAS when no wind', () => {
            const gs = calculateGroundSpeed(100, 0, 0, 0);
            expect(gs).toBe(100);
        });

        it('reduces speed with headwind', () => {
            const gs = calculateGroundSpeed(100, 0, 0, 20);
            expect(gs).toBe(80);
        });

        it('increases speed with tailwind', () => {
            const gs = calculateGroundSpeed(100, 0, 180, 20);
            expect(gs).toBe(120);
        });

        it('returns 0 when wind exceeds TAS', () => {
            const gs = calculateGroundSpeed(50, 0, 0, 60);
            expect(gs).toBe(0);
        });
    });

    describe('formatDistance', () => {
        it('formats distance with one decimal', () => {
            expect(formatDistance(15.5)).toBe('15.5 NM');
        });

        it('formats zero distance', () => {
            expect(formatDistance(0)).toBe('0.0 NM');
        });

        it('rounds to one decimal', () => {
            expect(formatDistance(15.555)).toBe('15.6 NM');
        });
    });

    describe('formatBearing', () => {
        it('formats bearing with leading zeros', () => {
            expect(formatBearing(5)).toBe('005°');
        });

        it('formats 90 degree bearing', () => {
            expect(formatBearing(90)).toBe('090°');
        });

        it('formats 270 degree bearing', () => {
            expect(formatBearing(270)).toBe('270°');
        });

        it('rounds bearing to nearest degree', () => {
            expect(formatBearing(90.6)).toBe('091°');
        });
    });

    describe('formatEte', () => {
        it('formats minutes only when less than an hour', () => {
            expect(formatEte(45)).toBe('45m');
        });

        it('formats hours and minutes', () => {
            expect(formatEte(90)).toBe('1h 30m');
        });

        it('formats zero minutes', () => {
            expect(formatEte(0)).toBe('0m');
        });

        it('pads minutes with leading zero', () => {
            expect(formatEte(65)).toBe('1h 05m');
        });
    });

    describe('formatHeadwind', () => {
        it('formats headwind', () => {
            expect(formatHeadwind(15)).toBe('HW 15 kt');
        });

        it('formats tailwind', () => {
            expect(formatHeadwind(-15)).toBe('TW 15 kt');
        });

        it('formats no wind', () => {
            expect(formatHeadwind(0)).toBe('No wind');
        });
    });
});
