/**
 * Unit tests for meetsMinimumCondition logic
 * This tests the core logic that determines if a condition is acceptable
 */

import type { SegmentCondition } from '../src/services/profileService';

type MinimumConditionLevel = 'good' | 'marginal';

// Copy of the function from vfrWindowService.ts for testing
function meetsMinimumCondition(condition: SegmentCondition, minimum: MinimumConditionLevel): boolean {
    if (minimum === 'good') {
        return condition === 'good';
    }
    // minimum === 'marginal'
    return condition === 'good' || condition === 'marginal';
}

describe('meetsMinimumCondition', () => {
    describe('when minimum is "good"', () => {
        it('accepts "good" condition', () => {
            expect(meetsMinimumCondition('good', 'good')).toBe(true);
        });

        it('rejects "marginal" condition', () => {
            expect(meetsMinimumCondition('marginal', 'good')).toBe(false);
        });

        it('rejects "poor" condition', () => {
            expect(meetsMinimumCondition('poor', 'good')).toBe(false);
        });

        it('rejects "unknown" condition', () => {
            expect(meetsMinimumCondition('unknown', 'good')).toBe(false);
        });
    });

    describe('when minimum is "marginal"', () => {
        it('accepts "good" condition', () => {
            expect(meetsMinimumCondition('good', 'marginal')).toBe(true);
        });

        it('accepts "marginal" condition', () => {
            expect(meetsMinimumCondition('marginal', 'marginal')).toBe(true);
        });

        it('rejects "poor" condition', () => {
            expect(meetsMinimumCondition('poor', 'marginal')).toBe(false);
        });

        it('rejects "unknown" condition', () => {
            expect(meetsMinimumCondition('unknown', 'marginal')).toBe(false);
        });
    });

    describe('acceptability comparison', () => {
        it('"marginal" minimum accepts more conditions than "good" minimum', () => {
            const conditions: SegmentCondition[] = ['good', 'marginal', 'poor', 'unknown'];

            const acceptedByGood = conditions.filter(c => meetsMinimumCondition(c, 'good'));
            const acceptedByMarginal = conditions.filter(c => meetsMinimumCondition(c, 'marginal'));

            expect(acceptedByGood).toHaveLength(1); // only 'good'
            expect(acceptedByMarginal).toHaveLength(2); // 'good' and 'marginal'
            expect(acceptedByMarginal.length).toBeGreaterThan(acceptedByGood.length);
        });

        it('any condition accepted by "good" minimum is also accepted by "marginal" minimum', () => {
            const conditions: SegmentCondition[] = ['good', 'marginal', 'poor', 'unknown'];

            for (const condition of conditions) {
                if (meetsMinimumCondition(condition, 'good')) {
                    expect(meetsMinimumCondition(condition, 'marginal')).toBe(true);
                }
            }
        });
    });
});
