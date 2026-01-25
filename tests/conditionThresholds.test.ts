/**
 * Tests for VFR Condition Thresholds
 * Validates threshold types, presets, and validation functions
 */

import {
    STANDARD_THRESHOLDS,
    CONSERVATIVE_THRESHOLDS,
    validateThresholds,
    getThresholdsForPreset,
    type VfrConditionThresholds,
    type ConditionPreset,
} from '../src/types/conditionThresholds';

describe('Condition Thresholds', () => {
    describe('STANDARD_THRESHOLDS', () => {
        it('should have all required threshold fields', () => {
            const requiredFields: (keyof VfrConditionThresholds)[] = [
                'cloudBaseAgl',
                'visibility',
                'precipitation',
                'surfaceWindSpeed',
                'surfaceGusts',
                'crosswind',
                'tailwind',
                'terrainClearance',
                'cloudClearance',
            ];

            for (const field of requiredFields) {
                expect(STANDARD_THRESHOLDS).toHaveProperty(field);
                expect(STANDARD_THRESHOLDS[field]).toHaveProperty('poor');
                expect(STANDARD_THRESHOLDS[field]).toHaveProperty('marginal');
                expect(typeof STANDARD_THRESHOLDS[field].poor).toBe('number');
                expect(typeof STANDARD_THRESHOLDS[field].marginal).toBe('number');
            }
        });

        it('should have correct standard threshold values', () => {
            // Weather thresholds
            expect(STANDARD_THRESHOLDS.cloudBaseAgl).toEqual({ poor: 1500, marginal: 2000 });
            expect(STANDARD_THRESHOLDS.visibility).toEqual({ poor: 5, marginal: 8 });
            expect(STANDARD_THRESHOLDS.precipitation).toEqual({ poor: 5, marginal: 2 });

            // Terminal wind thresholds
            expect(STANDARD_THRESHOLDS.surfaceWindSpeed).toEqual({ poor: 25, marginal: 20 });
            expect(STANDARD_THRESHOLDS.surfaceGusts).toEqual({ poor: 35, marginal: 30 });
            expect(STANDARD_THRESHOLDS.crosswind).toEqual({ poor: 20, marginal: 15 });
            expect(STANDARD_THRESHOLDS.tailwind).toEqual({ poor: 15, marginal: 10 });

            // Clearance thresholds
            expect(STANDARD_THRESHOLDS.terrainClearance).toEqual({ poor: 500, marginal: 1000 });
            expect(STANDARD_THRESHOLDS.cloudClearance).toEqual({ poor: 200, marginal: 500 });
        });
    });

    describe('CONSERVATIVE_THRESHOLDS', () => {
        it('should have all required threshold fields', () => {
            const requiredFields: (keyof VfrConditionThresholds)[] = [
                'cloudBaseAgl',
                'visibility',
                'precipitation',
                'surfaceWindSpeed',
                'surfaceGusts',
                'crosswind',
                'tailwind',
                'terrainClearance',
                'cloudClearance',
            ];

            for (const field of requiredFields) {
                expect(CONSERVATIVE_THRESHOLDS).toHaveProperty(field);
                expect(CONSERVATIVE_THRESHOLDS[field]).toHaveProperty('poor');
                expect(CONSERVATIVE_THRESHOLDS[field]).toHaveProperty('marginal');
            }
        });

        it('should have more restrictive values than standard for "less than" rules', () => {
            // For "less than" rules (cloudBaseAgl, visibility, terrainClearance, cloudClearance)
            // Higher values are MORE restrictive (triggers poor/marginal sooner)
            expect(CONSERVATIVE_THRESHOLDS.cloudBaseAgl.poor).toBeGreaterThanOrEqual(
                STANDARD_THRESHOLDS.cloudBaseAgl.poor
            );
            expect(CONSERVATIVE_THRESHOLDS.cloudBaseAgl.marginal).toBeGreaterThanOrEqual(
                STANDARD_THRESHOLDS.cloudBaseAgl.marginal
            );

            expect(CONSERVATIVE_THRESHOLDS.visibility.poor).toBeGreaterThanOrEqual(
                STANDARD_THRESHOLDS.visibility.poor
            );
            expect(CONSERVATIVE_THRESHOLDS.visibility.marginal).toBeGreaterThanOrEqual(
                STANDARD_THRESHOLDS.visibility.marginal
            );

            expect(CONSERVATIVE_THRESHOLDS.terrainClearance.poor).toBeGreaterThanOrEqual(
                STANDARD_THRESHOLDS.terrainClearance.poor
            );
            expect(CONSERVATIVE_THRESHOLDS.terrainClearance.marginal).toBeGreaterThanOrEqual(
                STANDARD_THRESHOLDS.terrainClearance.marginal
            );

            expect(CONSERVATIVE_THRESHOLDS.cloudClearance.poor).toBeGreaterThanOrEqual(
                STANDARD_THRESHOLDS.cloudClearance.poor
            );
            expect(CONSERVATIVE_THRESHOLDS.cloudClearance.marginal).toBeGreaterThanOrEqual(
                STANDARD_THRESHOLDS.cloudClearance.marginal
            );
        });

        it('should have more restrictive values than standard for "greater than" rules', () => {
            // For "greater than" rules (precipitation, wind speeds)
            // Lower values are MORE restrictive (triggers poor/marginal sooner)
            expect(CONSERVATIVE_THRESHOLDS.precipitation.poor).toBeLessThanOrEqual(
                STANDARD_THRESHOLDS.precipitation.poor
            );
            expect(CONSERVATIVE_THRESHOLDS.precipitation.marginal).toBeLessThanOrEqual(
                STANDARD_THRESHOLDS.precipitation.marginal
            );

            expect(CONSERVATIVE_THRESHOLDS.surfaceWindSpeed.poor).toBeLessThanOrEqual(
                STANDARD_THRESHOLDS.surfaceWindSpeed.poor
            );
            expect(CONSERVATIVE_THRESHOLDS.surfaceWindSpeed.marginal).toBeLessThanOrEqual(
                STANDARD_THRESHOLDS.surfaceWindSpeed.marginal
            );

            expect(CONSERVATIVE_THRESHOLDS.surfaceGusts.poor).toBeLessThanOrEqual(
                STANDARD_THRESHOLDS.surfaceGusts.poor
            );
            expect(CONSERVATIVE_THRESHOLDS.surfaceGusts.marginal).toBeLessThanOrEqual(
                STANDARD_THRESHOLDS.surfaceGusts.marginal
            );

            expect(CONSERVATIVE_THRESHOLDS.crosswind.poor).toBeLessThanOrEqual(
                STANDARD_THRESHOLDS.crosswind.poor
            );
            expect(CONSERVATIVE_THRESHOLDS.crosswind.marginal).toBeLessThanOrEqual(
                STANDARD_THRESHOLDS.crosswind.marginal
            );

            expect(CONSERVATIVE_THRESHOLDS.tailwind.poor).toBeLessThanOrEqual(
                STANDARD_THRESHOLDS.tailwind.poor
            );
            expect(CONSERVATIVE_THRESHOLDS.tailwind.marginal).toBeLessThanOrEqual(
                STANDARD_THRESHOLDS.tailwind.marginal
            );
        });
    });

    describe('validateThresholds', () => {
        it('should return true for valid STANDARD_THRESHOLDS', () => {
            expect(validateThresholds(STANDARD_THRESHOLDS)).toBe(true);
        });

        it('should return true for valid CONSERVATIVE_THRESHOLDS', () => {
            expect(validateThresholds(CONSERVATIVE_THRESHOLDS)).toBe(true);
        });

        it('should return true for valid custom thresholds', () => {
            const validCustom: VfrConditionThresholds = {
                cloudBaseAgl: { poor: 2000, marginal: 3000 },
                visibility: { poor: 6, marginal: 10 },
                precipitation: { poor: 4, marginal: 1 },
                surfaceWindSpeed: { poor: 20, marginal: 15 },
                surfaceGusts: { poor: 30, marginal: 25 },
                crosswind: { poor: 18, marginal: 12 },
                tailwind: { poor: 12, marginal: 8 },
                terrainClearance: { poor: 800, marginal: 1500 },
                cloudClearance: { poor: 300, marginal: 700 },
            };
            expect(validateThresholds(validCustom)).toBe(true);
        });

        it('should return false when marginal < poor for "less than" rules', () => {
            // For cloudBaseAgl, marginal should be >= poor
            const invalid: VfrConditionThresholds = {
                ...STANDARD_THRESHOLDS,
                cloudBaseAgl: { poor: 2000, marginal: 1500 }, // Invalid: marginal < poor
            };
            expect(validateThresholds(invalid)).toBe(false);
        });

        it('should return false when marginal > poor for "greater than" rules', () => {
            // For surfaceWindSpeed, marginal should be <= poor
            const invalid: VfrConditionThresholds = {
                ...STANDARD_THRESHOLDS,
                surfaceWindSpeed: { poor: 20, marginal: 25 }, // Invalid: marginal > poor
            };
            expect(validateThresholds(invalid)).toBe(false);
        });

        it('should return false for invalid visibility thresholds', () => {
            const invalid: VfrConditionThresholds = {
                ...STANDARD_THRESHOLDS,
                visibility: { poor: 10, marginal: 5 }, // Invalid: marginal < poor
            };
            expect(validateThresholds(invalid)).toBe(false);
        });

        it('should return false for invalid precipitation thresholds', () => {
            const invalid: VfrConditionThresholds = {
                ...STANDARD_THRESHOLDS,
                precipitation: { poor: 2, marginal: 5 }, // Invalid: marginal > poor
            };
            expect(validateThresholds(invalid)).toBe(false);
        });

        it('should return false for invalid terrainClearance thresholds', () => {
            const invalid: VfrConditionThresholds = {
                ...STANDARD_THRESHOLDS,
                terrainClearance: { poor: 1500, marginal: 1000 }, // Invalid: marginal < poor
            };
            expect(validateThresholds(invalid)).toBe(false);
        });

        it('should return false for invalid cloudClearance thresholds', () => {
            const invalid: VfrConditionThresholds = {
                ...STANDARD_THRESHOLDS,
                cloudClearance: { poor: 800, marginal: 500 }, // Invalid: marginal < poor
            };
            expect(validateThresholds(invalid)).toBe(false);
        });

        it('should return false for invalid crosswind thresholds', () => {
            const invalid: VfrConditionThresholds = {
                ...STANDARD_THRESHOLDS,
                crosswind: { poor: 10, marginal: 15 }, // Invalid: marginal > poor
            };
            expect(validateThresholds(invalid)).toBe(false);
        });

        it('should return false for invalid tailwind thresholds', () => {
            const invalid: VfrConditionThresholds = {
                ...STANDARD_THRESHOLDS,
                tailwind: { poor: 8, marginal: 12 }, // Invalid: marginal > poor
            };
            expect(validateThresholds(invalid)).toBe(false);
        });

        it('should return false for invalid surfaceGusts thresholds', () => {
            const invalid: VfrConditionThresholds = {
                ...STANDARD_THRESHOLDS,
                surfaceGusts: { poor: 25, marginal: 30 }, // Invalid: marginal > poor
            };
            expect(validateThresholds(invalid)).toBe(false);
        });
    });

    describe('getThresholdsForPreset', () => {
        it('should return STANDARD_THRESHOLDS for "standard" preset', () => {
            const result = getThresholdsForPreset('standard');
            expect(result).toEqual(STANDARD_THRESHOLDS);
        });

        it('should return CONSERVATIVE_THRESHOLDS for "conservative" preset', () => {
            const result = getThresholdsForPreset('conservative');
            expect(result).toEqual(CONSERVATIVE_THRESHOLDS);
        });

        it('should return custom thresholds for "custom" preset when provided', () => {
            const customThresholds: VfrConditionThresholds = {
                cloudBaseAgl: { poor: 2500, marginal: 3500 },
                visibility: { poor: 8, marginal: 12 },
                precipitation: { poor: 3, marginal: 1 },
                surfaceWindSpeed: { poor: 18, marginal: 12 },
                surfaceGusts: { poor: 28, marginal: 22 },
                crosswind: { poor: 15, marginal: 10 },
                tailwind: { poor: 10, marginal: 5 },
                terrainClearance: { poor: 1000, marginal: 2000 },
                cloudClearance: { poor: 500, marginal: 1000 },
            };

            const result = getThresholdsForPreset('custom', customThresholds);
            expect(result).toEqual(customThresholds);
        });

        it('should return STANDARD_THRESHOLDS for "custom" preset when custom thresholds not provided', () => {
            const result = getThresholdsForPreset('custom');
            expect(result).toEqual(STANDARD_THRESHOLDS);
        });

        it('should handle unknown preset by returning STANDARD_THRESHOLDS', () => {
            // TypeScript would catch this, but test runtime behavior
            const result = getThresholdsForPreset('unknown' as ConditionPreset);
            expect(result).toEqual(STANDARD_THRESHOLDS);
        });
    });
});
