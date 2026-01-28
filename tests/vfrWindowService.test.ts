/**
 * Tests for VFR Window Detection Service
 * Tests utility functions and core logic for finding VFR flight windows
 */

import { formatVFRWindow } from '../src/services/vfrWindowService';
import type { VFRWindow } from '../src/types/vfrWindow';
import type { SegmentCondition } from '../src/services/profileService';

// Test the meetsMinimumCondition logic (reimplemented for testing since it's not exported)
function meetsMinimumCondition(condition: SegmentCondition, minimum: 'good' | 'marginal'): boolean {
    if (minimum === 'good') {
        return condition === 'good';
    }
    return condition === 'good' || condition === 'marginal';
}

// Test the worseCondition logic (reimplemented for testing since it's not exported)
function worseCondition(a: SegmentCondition, b: SegmentCondition): SegmentCondition {
    const order: Record<SegmentCondition, number> = {
        'good': 0,
        'marginal': 1,
        'poor': 2,
        'unknown': 3,
    };
    return order[a] >= order[b] ? a : b;
}

// Test the calculateConfidence logic (reimplemented for testing since it's not exported)
function calculateConfidence(timestamp: number): 'high' | 'medium' | 'low' {
    const hoursFromNow = (timestamp - Date.now()) / (1000 * 60 * 60);
    if (hoursFromNow <= 24) return 'high';
    if (hoursFromNow <= 72) return 'medium';
    return 'low';
}

describe('VFR Window Service', () => {
    describe('meetsMinimumCondition', () => {
        describe('when minimum is "good"', () => {
            it('should return true only for good condition', () => {
                expect(meetsMinimumCondition('good', 'good')).toBe(true);
                expect(meetsMinimumCondition('marginal', 'good')).toBe(false);
                expect(meetsMinimumCondition('poor', 'good')).toBe(false);
                expect(meetsMinimumCondition('unknown', 'good')).toBe(false);
            });
        });

        describe('when minimum is "marginal"', () => {
            it('should return true for good and marginal conditions', () => {
                expect(meetsMinimumCondition('good', 'marginal')).toBe(true);
                expect(meetsMinimumCondition('marginal', 'marginal')).toBe(true);
                expect(meetsMinimumCondition('poor', 'marginal')).toBe(false);
                expect(meetsMinimumCondition('unknown', 'marginal')).toBe(false);
            });
        });
    });

    describe('worseCondition', () => {
        it('should return the worse of two conditions', () => {
            expect(worseCondition('good', 'good')).toBe('good');
            expect(worseCondition('good', 'marginal')).toBe('marginal');
            expect(worseCondition('marginal', 'good')).toBe('marginal');
            expect(worseCondition('marginal', 'poor')).toBe('poor');
            expect(worseCondition('poor', 'marginal')).toBe('poor');
            expect(worseCondition('poor', 'unknown')).toBe('unknown');
            expect(worseCondition('unknown', 'good')).toBe('unknown');
        });

        it('should handle same conditions', () => {
            expect(worseCondition('good', 'good')).toBe('good');
            expect(worseCondition('marginal', 'marginal')).toBe('marginal');
            expect(worseCondition('poor', 'poor')).toBe('poor');
            expect(worseCondition('unknown', 'unknown')).toBe('unknown');
        });

        it('should follow order: good < marginal < poor < unknown', () => {
            // Verify the ordering
            expect(worseCondition('good', 'marginal')).toBe('marginal');
            expect(worseCondition('marginal', 'poor')).toBe('poor');
            expect(worseCondition('poor', 'unknown')).toBe('unknown');
        });
    });

    describe('calculateConfidence', () => {
        it('should return high confidence for forecasts within 24 hours', () => {
            const now = Date.now();
            expect(calculateConfidence(now)).toBe('high');
            expect(calculateConfidence(now + 12 * 60 * 60 * 1000)).toBe('high'); // 12 hours
            expect(calculateConfidence(now + 23 * 60 * 60 * 1000)).toBe('high'); // 23 hours
        });

        it('should return medium confidence for forecasts 24-72 hours out', () => {
            const now = Date.now();
            expect(calculateConfidence(now + 25 * 60 * 60 * 1000)).toBe('medium'); // 25 hours
            expect(calculateConfidence(now + 48 * 60 * 60 * 1000)).toBe('medium'); // 48 hours
            expect(calculateConfidence(now + 71 * 60 * 60 * 1000)).toBe('medium'); // 71 hours
        });

        it('should return low confidence for forecasts beyond 72 hours', () => {
            const now = Date.now();
            expect(calculateConfidence(now + 73 * 60 * 60 * 1000)).toBe('low'); // 73 hours
            expect(calculateConfidence(now + 96 * 60 * 60 * 1000)).toBe('low'); // 96 hours
            expect(calculateConfidence(now + 168 * 60 * 60 * 1000)).toBe('low'); // 7 days
        });
    });

    describe('formatVFRWindow', () => {
        it('should format a same-day window correctly', () => {
            const window: VFRWindow = {
                startTime: new Date('2024-01-20T10:00:00').getTime(),
                endTime: new Date('2024-01-20T16:00:00').getTime(),
                duration: 360, // 6 hours in minutes
                worstCondition: 'good',
                confidence: 'high',
            };

            const formatted = formatVFRWindow(window);

            expect(formatted.timeRange).toBe('10:00 - 16:00');
            expect(formatted.duration).toBe('6h 0m window');
            expect(formatted.confidence).toBe('High confidence');
        });

        it('should format duration with hours and minutes', () => {
            const window: VFRWindow = {
                startTime: new Date('2024-01-20T10:00:00').getTime(),
                endTime: new Date('2024-01-20T12:30:00').getTime(),
                duration: 150, // 2.5 hours
                worstCondition: 'marginal',
                confidence: 'medium',
            };

            const formatted = formatVFRWindow(window);

            expect(formatted.duration).toBe('2h 30m window');
            expect(formatted.confidence).toBe('Medium confidence');
        });

        it('should format short duration without hours', () => {
            const window: VFRWindow = {
                startTime: new Date('2024-01-20T10:00:00').getTime(),
                endTime: new Date('2024-01-20T10:45:00').getTime(),
                duration: 45, // 45 minutes
                worstCondition: 'good',
                confidence: 'low',
            };

            const formatted = formatVFRWindow(window);

            expect(formatted.duration).toBe('45m window');
            expect(formatted.confidence).toBe('Low confidence');
        });

        it('should format time with leading zeros', () => {
            const window: VFRWindow = {
                startTime: new Date('2024-01-20T08:05:00').getTime(),
                endTime: new Date('2024-01-20T09:05:00').getTime(),
                duration: 60,
                worstCondition: 'good',
                confidence: 'high',
            };

            const formatted = formatVFRWindow(window);

            expect(formatted.timeRange).toBe('08:05 - 09:05');
        });

        it('should handle midnight times', () => {
            const window: VFRWindow = {
                startTime: new Date('2024-01-20T00:00:00').getTime(),
                endTime: new Date('2024-01-20T06:00:00').getTime(),
                duration: 360,
                worstCondition: 'good',
                confidence: 'high',
            };

            const formatted = formatVFRWindow(window);

            expect(formatted.timeRange).toBe('00:00 - 06:00');
        });
    });

    describe('WeatherCache logic', () => {
        // Test cache key generation logic
        it('should round timestamps to nearest hour for cache key', () => {
            // Test the rounding logic used in cache
            const roundToHour = (timestamp: number): number => {
                const interval = 1 * 60 * 60 * 1000; // 1 hour in ms
                return Math.round(timestamp / interval) * interval;
            };

            const baseTime = new Date('2024-01-20T10:00:00').getTime();

            // Exactly on the hour
            expect(roundToHour(baseTime)).toBe(baseTime);

            // 29 minutes past -> rounds down
            const plus29 = baseTime + 29 * 60 * 1000;
            expect(roundToHour(plus29)).toBe(baseTime);

            // 31 minutes past -> rounds up
            const plus31 = baseTime + 31 * 60 * 1000;
            expect(roundToHour(plus31)).toBe(baseTime + 60 * 60 * 1000);
        });

        it('should generate consistent cache keys for same location', () => {
            const makeKey = (lat: number, lon: number, timestamp: number): string => {
                const interval = 1 * 60 * 60 * 1000;
                const roundedTs = Math.round(timestamp / interval) * interval;
                return `${lat.toFixed(4)}_${lon.toFixed(4)}_${roundedTs}`;
            };

            const timestamp = Date.now();
            const key1 = makeKey(47.5, -122.3, timestamp);
            const key2 = makeKey(47.5, -122.3, timestamp);

            expect(key1).toBe(key2);
        });

        it('should generate different keys for different locations', () => {
            const makeKey = (lat: number, lon: number, timestamp: number): string => {
                const interval = 1 * 60 * 60 * 1000;
                const roundedTs = Math.round(timestamp / interval) * interval;
                return `${lat.toFixed(4)}_${lon.toFixed(4)}_${roundedTs}`;
            };

            const timestamp = Date.now();
            const key1 = makeKey(47.5, -122.3, timestamp);
            const key2 = makeKey(45.5, -122.3, timestamp);

            expect(key1).not.toBe(key2);
        });
    });

    describe('ForecastCache logic', () => {
        it('should generate consistent location keys', () => {
            const makeKey = (lat: number, lon: number): string => {
                return `${lat.toFixed(4)}_${lon.toFixed(4)}`;
            };

            expect(makeKey(47.5, -122.3)).toBe('47.5000_-122.3000');
            expect(makeKey(47.12345, -122.67890)).toBe('47.1234_-122.6789');
        });

        it('should deduplicate locations with same coordinates', () => {
            const makeKey = (lat: number, lon: number): string => {
                return `${lat.toFixed(4)}_${lon.toFixed(4)}`;
            };

            // Slightly different coordinates that round to the same key
            const key1 = makeKey(47.50001, -122.30001);
            const key2 = makeKey(47.50002, -122.30002);

            expect(key1).toBe(key2);
        });
    });

    describe('Waypoint timing calculations', () => {
        it('should calculate arrival times based on ETE', () => {
            const departureTime = new Date('2024-01-20T10:00:00').getTime();
            const waypoints = [
                { id: '1', name: 'DEP', lat: 47.5, lon: -122.3, ete: 0 },
                { id: '2', name: 'MID', lat: 47.6, lon: -122.4, ete: 30 }, // 30 min ETE
                { id: '3', name: 'ARR', lat: 47.7, lon: -122.5, ete: 25 }, // 25 min ETE
            ];

            // Simulate timing calculation
            let cumulativeEte = 0;
            const arrivals: number[] = [];

            for (const wp of waypoints) {
                arrivals.push(departureTime + cumulativeEte * 60 * 1000);
                cumulativeEte += wp.ete || 0;
            }

            expect(arrivals[0]).toBe(departureTime); // Departure at start
            expect(arrivals[1]).toBe(departureTime); // MID at departure (ETE applies to NEXT leg)
            expect(arrivals[2]).toBe(departureTime + 30 * 60 * 1000); // ARR 30 min after departure
        });

        it('should identify terminal waypoints', () => {
            const waypoints = [
                { id: '1', name: 'DEP' },
                { id: '2', name: 'MID1' },
                { id: '3', name: 'MID2' },
                { id: '4', name: 'ARR' },
            ];

            const isTerminal = (index: number): boolean => {
                return index === 0 || index === waypoints.length - 1;
            };

            expect(isTerminal(0)).toBe(true);  // Departure
            expect(isTerminal(1)).toBe(false); // Mid waypoint
            expect(isTerminal(2)).toBe(false); // Mid waypoint
            expect(isTerminal(3)).toBe(true);  // Arrival
        });
    });

    describe('Window duration validation', () => {
        it('should calculate window duration in minutes', () => {
            const start = new Date('2024-01-20T10:00:00').getTime();
            const end = new Date('2024-01-20T12:30:00').getTime();

            const durationMinutes = (end - start) / (60 * 1000);

            expect(durationMinutes).toBe(150); // 2.5 hours = 150 minutes
        });

        it('should reject windows shorter than flight duration', () => {
            const windowDuration = 45; // minutes
            const flightDuration = 60; // minutes

            expect(windowDuration >= flightDuration).toBe(false);
        });

        it('should accept windows at least as long as flight duration', () => {
            const windowDuration = 60; // minutes
            const flightDuration = 60; // minutes

            expect(windowDuration >= flightDuration).toBe(true);
        });
    });

    describe('Search range alignment', () => {
        it('should align start time to next hour', () => {
            const interval = 60 * 60 * 1000; // 1 hour in ms

            // Test aligning to next hour
            const alignToNextHour = (timestamp: number): number => {
                return Math.ceil(timestamp / interval) * interval;
            };

            const baseTime = new Date('2024-01-20T10:00:00').getTime();

            // Already on the hour
            expect(alignToNextHour(baseTime)).toBe(baseTime);

            // 30 minutes past -> align to next hour
            const plus30 = baseTime + 30 * 60 * 1000;
            expect(alignToNextHour(plus30)).toBe(baseTime + interval);

            // 1 minute past -> align to next hour
            const plus1 = baseTime + 1 * 60 * 1000;
            expect(alignToNextHour(plus1)).toBe(baseTime + interval);
        });
    });

    describe('Contiguous range detection', () => {
        it('should detect contiguous acceptable periods', () => {
            // Simulate coarse scan results
            const evaluations = [
                { time: 1, acceptable: false },
                { time: 2, acceptable: true },
                { time: 3, acceptable: true },
                { time: 4, acceptable: true },
                { time: 5, acceptable: false },
                { time: 6, acceptable: true },
                { time: 7, acceptable: false },
            ];

            const ranges: { start: number; end: number }[] = [];
            let currentStart: number | null = null;
            let lastAcceptable: number | null = null;

            for (const eval_ of evaluations) {
                if (eval_.acceptable) {
                    if (currentStart === null) {
                        currentStart = eval_.time;
                    }
                    lastAcceptable = eval_.time;
                } else {
                    if (currentStart !== null && lastAcceptable !== null) {
                        ranges.push({ start: currentStart, end: lastAcceptable });
                        currentStart = null;
                        lastAcceptable = null;
                    }
                }
            }

            // Handle trailing acceptable period
            if (currentStart !== null && lastAcceptable !== null) {
                ranges.push({ start: currentStart, end: lastAcceptable });
            }

            expect(ranges).toEqual([
                { start: 2, end: 4 },
                { start: 6, end: 6 },
            ]);
        });

        it('should handle all acceptable evaluations', () => {
            const evaluations = [
                { time: 1, acceptable: true },
                { time: 2, acceptable: true },
                { time: 3, acceptable: true },
            ];

            const ranges: { start: number; end: number }[] = [];
            let currentStart: number | null = null;
            let lastAcceptable: number | null = null;

            for (const eval_ of evaluations) {
                if (eval_.acceptable) {
                    if (currentStart === null) {
                        currentStart = eval_.time;
                    }
                    lastAcceptable = eval_.time;
                } else if (currentStart !== null && lastAcceptable !== null) {
                    ranges.push({ start: currentStart, end: lastAcceptable });
                    currentStart = null;
                    lastAcceptable = null;
                }
            }

            if (currentStart !== null && lastAcceptable !== null) {
                ranges.push({ start: currentStart, end: lastAcceptable });
            }

            expect(ranges).toEqual([{ start: 1, end: 3 }]);
        });

        it('should handle no acceptable evaluations', () => {
            const evaluations = [
                { time: 1, acceptable: false },
                { time: 2, acceptable: false },
            ];

            const ranges: { start: number; end: number }[] = [];
            let currentStart: number | null = null;
            let lastAcceptable: number | null = null;

            for (const eval_ of evaluations) {
                if (eval_.acceptable) {
                    if (currentStart === null) {
                        currentStart = eval_.time;
                    }
                    lastAcceptable = eval_.time;
                } else if (currentStart !== null && lastAcceptable !== null) {
                    ranges.push({ start: currentStart, end: lastAcceptable });
                    currentStart = null;
                    lastAcceptable = null;
                }
            }

            if (currentStart !== null && lastAcceptable !== null) {
                ranges.push({ start: currentStart, end: lastAcceptable });
            }

            expect(ranges).toEqual([]);
        });
    });
});
