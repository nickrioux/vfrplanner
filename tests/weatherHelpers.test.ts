/**
 * Unit tests for weather helper functions
 */
import {
    getInterpolationIndices,
    interpolateValue,
    interpolateWindDirection,
    extractWeatherValue,
    formatCloudBaseDisplay,
    estimateVisibility,
    extractSurfaceWind,
    calculateWaypointArrivalTime,
    CLEAR_SKY_METERS,
    CLEAR_SKY_FEET,
} from '../src/services/weatherHelpers';

describe('Weather Helpers', () => {
    describe('getInterpolationIndices', () => {
        const timestamps = [1000, 2000, 3000, 4000, 5000];

        it('returns first index for target before first timestamp', () => {
            const result = getInterpolationIndices(timestamps, 500);
            expect(result.lowerIndex).toBe(0);
            expect(result.upperIndex).toBe(0);
            expect(result.needsInterpolation).toBe(false);
        });

        it('returns last index for target after last timestamp', () => {
            const result = getInterpolationIndices(timestamps, 6000);
            expect(result.lowerIndex).toBe(4);
            expect(result.upperIndex).toBe(4);
            expect(result.needsInterpolation).toBe(false);
        });

        it('finds correct bracketing indices for target in middle', () => {
            const result = getInterpolationIndices(timestamps, 2500);
            expect(result.lowerIndex).toBe(1);
            expect(result.upperIndex).toBe(2);
            expect(result.fraction).toBeCloseTo(0.5, 2);
            expect(result.needsInterpolation).toBe(true);
        });

        it('handles exact match on timestamp', () => {
            const result = getInterpolationIndices(timestamps, 3000);
            // When exactly on a timestamp, it falls in the bracket [2000, 3000]
            // with fraction 1.0, so lowerIndex=1, upperIndex=2
            expect(result.lowerIndex).toBe(1);
            expect(result.upperIndex).toBe(2);
            // Fraction is exactly 1.0, which means no interpolation needed
            expect(result.fraction).toBeCloseTo(1.0, 2);
        });

        it('handles empty timestamps array', () => {
            const result = getInterpolationIndices([], 1500);
            expect(result.lowerIndex).toBe(0);
            expect(result.upperIndex).toBe(0);
        });

        it('uses first timestamp as default when no target provided', () => {
            const result = getInterpolationIndices(timestamps);
            expect(result.lowerIndex).toBe(0);
            expect(result.needsInterpolation).toBe(false);
        });
    });

    describe('interpolateValue', () => {
        it('interpolates between two values', () => {
            expect(interpolateValue(0, 100, 0.5)).toBe(50);
            expect(interpolateValue(10, 20, 0.25)).toBe(12.5);
        });

        it('returns first value when fraction is 0', () => {
            expect(interpolateValue(10, 20, 0)).toBe(10);
        });

        it('returns second value when fraction is 1', () => {
            expect(interpolateValue(10, 20, 1)).toBe(20);
        });

        it('handles null first value', () => {
            expect(interpolateValue(null, 100, 0.5)).toBe(100);
        });

        it('handles null second value', () => {
            expect(interpolateValue(100, null, 0.5)).toBe(100);
        });

        it('returns null when both values are null', () => {
            expect(interpolateValue(null, null, 0.5)).toBeNull();
        });

        it('handles undefined values', () => {
            expect(interpolateValue(undefined, 100, 0.5)).toBe(100);
            expect(interpolateValue(100, undefined, 0.5)).toBe(100);
        });

        it('handles NaN values', () => {
            expect(interpolateValue(NaN, 100, 0.5)).toBe(100);
            expect(interpolateValue(100, NaN, 0.5)).toBe(100);
        });
    });

    describe('interpolateWindDirection', () => {
        it('interpolates between two directions', () => {
            expect(interpolateWindDirection(10, 20, 0.5)).toBeCloseTo(15, 1);
        });

        it('handles wraparound from 350 to 10', () => {
            const result = interpolateWindDirection(350, 10, 0.5);
            expect(result).toBeCloseTo(0, 1);
        });

        it('handles wraparound from 10 to 350', () => {
            const result = interpolateWindDirection(10, 350, 0.5);
            expect(result).toBeCloseTo(0, 1);
        });

        it('returns first direction when fraction is 0', () => {
            expect(interpolateWindDirection(90, 180, 0)).toBe(90);
        });

        it('returns second direction when fraction is 1', () => {
            expect(interpolateWindDirection(90, 180, 1)).toBe(180);
        });

        it('handles 180 degree difference', () => {
            const result = interpolateWindDirection(0, 180, 0.5);
            expect(result).toBeCloseTo(90, 1);
        });
    });

    describe('extractWeatherValue', () => {
        it('extracts value at lower index when no interpolation needed', () => {
            const data = [10, 20, 30, 40];
            const interp = { lowerIndex: 1, upperIndex: 1, fraction: 0, needsInterpolation: false };
            expect(extractWeatherValue(data, interp)).toBe(20);
        });

        it('interpolates value when needed', () => {
            const data = [10, 20, 30, 40];
            const interp = { lowerIndex: 1, upperIndex: 2, fraction: 0.5, needsInterpolation: true };
            expect(extractWeatherValue(data, interp)).toBe(25);
        });

        it('returns null for undefined data', () => {
            const interp = { lowerIndex: 0, upperIndex: 0, fraction: 0, needsInterpolation: false };
            expect(extractWeatherValue(undefined, interp)).toBeNull();
        });

        it('returns null for empty array', () => {
            const interp = { lowerIndex: 0, upperIndex: 0, fraction: 0, needsInterpolation: false };
            expect(extractWeatherValue([], interp)).toBeNull();
        });
    });

    describe('formatCloudBaseDisplay', () => {
        it('returns CLR for undefined cloud base', () => {
            expect(formatCloudBaseDisplay(undefined)).toBe('CLR');
        });

        it('returns CLR for clear sky value', () => {
            expect(formatCloudBaseDisplay(CLEAR_SKY_METERS)).toBe('CLR');
        });

        it('formats cloud base in feet', () => {
            const result = formatCloudBaseDisplay(1000); // 1000 meters
            expect(result).toMatch(/\d+ ft/);
        });

        it('formats low cloud base correctly', () => {
            const result = formatCloudBaseDisplay(300); // 300 meters ~ 984 feet
            expect(result).toMatch(/\d+ ft/);
        });
    });

    describe('estimateVisibility', () => {
        it('returns very low visibility for 100% humidity', () => {
            expect(estimateVisibility(100)).toBe(0.5);
        });

        it('returns low visibility for 95%+ humidity', () => {
            expect(estimateVisibility(95)).toBe(2);
            expect(estimateVisibility(99)).toBe(2);
        });

        it('returns moderate visibility for 90%+ humidity', () => {
            expect(estimateVisibility(90)).toBe(5);
            expect(estimateVisibility(94)).toBe(5);
        });

        it('returns good visibility for 80%+ humidity', () => {
            expect(estimateVisibility(80)).toBe(10);
            expect(estimateVisibility(89)).toBe(10);
        });

        it('returns excellent visibility for low humidity', () => {
            expect(estimateVisibility(50)).toBe(20);
            expect(estimateVisibility(0)).toBe(20);
        });
    });

    describe('extractSurfaceWind', () => {
        it('extracts and converts wind data', () => {
            // 10 m/s = ~19.4 knots
            const windData = [10, 15, 20];
            const windDirData = [90, 180, 270];
            const interp = { lowerIndex: 0, upperIndex: 0, fraction: 0, needsInterpolation: false };

            const result = extractSurfaceWind(windData, windDirData, interp);
            expect(result.speed).toBeCloseTo(19.4, 0);
            expect(result.direction).toBe(90);
        });

        it('returns default for missing data', () => {
            const interp = { lowerIndex: 0, upperIndex: 0, fraction: 0, needsInterpolation: false };

            const result = extractSurfaceWind(undefined, undefined, interp);
            expect(result.speed).toBe(0);
            expect(result.direction).toBe(0);
        });

        it('interpolates direction correctly', () => {
            const windData = [10, 10];
            const windDirData = [350, 10];
            const interp = { lowerIndex: 0, upperIndex: 1, fraction: 0.5, needsInterpolation: true };

            const result = extractSurfaceWind(windData, windDirData, interp);
            // Should interpolate through 0 degrees
            expect(result.direction).toBeCloseTo(0, 0);
        });
    });

    describe('calculateWaypointArrivalTime', () => {
        it('calculates arrival time correctly', () => {
            const departureTime = 1000000;
            const cumulativeEteMinutes = 30;

            const result = calculateWaypointArrivalTime(departureTime, cumulativeEteMinutes);
            expect(result).toBe(departureTime + 30 * 60 * 1000);
        });

        it('returns departure time for zero ETE', () => {
            const departureTime = 1000000;
            expect(calculateWaypointArrivalTime(departureTime, 0)).toBe(departureTime);
        });
    });

    describe('Constants', () => {
        it('has correct clear sky values', () => {
            expect(CLEAR_SKY_METERS).toBe(9144);
            expect(CLEAR_SKY_FEET).toBe(29999);
        });
    });
});
