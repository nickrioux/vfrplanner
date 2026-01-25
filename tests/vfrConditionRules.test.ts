/**
 * Unit tests for VFR condition evaluation rules
 */
import {
    evaluateRule,
    evaluateAllRules,
    VFR_CONDITION_RULES,
    VFR_THRESHOLDS,
    buildRulesFromThresholds,
    STANDARD_THRESHOLDS,
    CONSERVATIVE_THRESHOLDS,
    type ConditionCriteria,
} from '../src/services/vfrConditionRules';

describe('VFR Condition Rules', () => {
    // Good conditions baseline
    const goodConditions: ConditionCriteria = {
        windSpeed: 10,
        gustSpeed: 15,
        cloudBaseAGL: 5000,
        visibility: 15,
        precipitation: 0,
        terrainClearance: 2000,
        cloudClearance: 3000,
        terminalWindSpeed: 10,
        terminalWindDir: 270,
        crosswindKt: 5,
        headwindKt: 8,
    };

    describe('evaluateRule', () => {
        const windSpeedRule = VFR_CONDITION_RULES.find(r => r.id === 'terminal-wind-speed')!;
        const ceilingRule = VFR_CONDITION_RULES.find(r => r.id === 'cloud-base-agl')!;
        const terrainRule = VFR_CONDITION_RULES.find(r => r.id === 'terrain-clearance')!;

        describe('terminal wind speed rule', () => {
            it('returns good for low wind', () => {
                const result = evaluateRule(windSpeedRule, { ...goodConditions, terminalWindSpeed: 15 }, true);
                expect(result.condition).toBe('good');
            });

            it('returns marginal for elevated wind', () => {
                const result = evaluateRule(windSpeedRule, { ...goodConditions, terminalWindSpeed: 22 }, true);
                expect(result.condition).toBe('marginal');
                expect(result.message).toContain('22');
            });

            it('returns poor for high wind', () => {
                const result = evaluateRule(windSpeedRule, { ...goodConditions, terminalWindSpeed: 30 }, true);
                expect(result.condition).toBe('poor');
                expect(result.message).toContain('30');
            });

            it('skips for non-terminal waypoints', () => {
                const result = evaluateRule(windSpeedRule, { ...goodConditions, terminalWindSpeed: 30 }, false);
                expect(result.condition).toBe('good');
            });
        });

        describe('ceiling rule', () => {
            it('returns good for high ceiling', () => {
                const result = evaluateRule(ceilingRule, { ...goodConditions, cloudBaseAGL: 5000 }, false);
                expect(result.condition).toBe('good');
            });

            it('returns marginal for moderate ceiling', () => {
                const result = evaluateRule(ceilingRule, { ...goodConditions, cloudBaseAGL: 1800 }, false);
                expect(result.condition).toBe('marginal');
            });

            it('returns poor for low ceiling', () => {
                const result = evaluateRule(ceilingRule, { ...goodConditions, cloudBaseAGL: 1000 }, false);
                expect(result.condition).toBe('poor');
            });

            it('returns good for clear sky (very high value)', () => {
                const result = evaluateRule(ceilingRule, { ...goodConditions, cloudBaseAGL: 999999 }, false);
                expect(result.condition).toBe('good');
            });
        });

        describe('terrain clearance rule', () => {
            it('returns good for adequate clearance', () => {
                const result = evaluateRule(terrainRule, { ...goodConditions, terrainClearance: 2000 }, false);
                expect(result.condition).toBe('good');
            });

            it('returns marginal for reduced clearance', () => {
                const result = evaluateRule(terrainRule, { ...goodConditions, terrainClearance: 800 }, false);
                expect(result.condition).toBe('marginal');
            });

            it('returns poor for dangerous clearance', () => {
                const result = evaluateRule(terrainRule, { ...goodConditions, terrainClearance: 300 }, false);
                expect(result.condition).toBe('poor');
            });

            it('skips for terminal waypoints', () => {
                const result = evaluateRule(terrainRule, { ...goodConditions, terrainClearance: 300 }, true);
                expect(result.condition).toBe('good');
            });
        });
    });

    describe('evaluateAllRules', () => {
        it('returns good for excellent conditions', () => {
            const result = evaluateAllRules(goodConditions, false);
            expect(result.condition).toBe('good');
            expect(result.reasons).toHaveLength(0);
        });

        it('returns poor when any condition is poor', () => {
            const criteria: ConditionCriteria = {
                ...goodConditions,
                visibility: 3, // Poor visibility
            };
            const result = evaluateAllRules(criteria, false);
            expect(result.condition).toBe('poor');
            expect(result.reasons.length).toBeGreaterThan(0);
        });

        it('returns marginal when conditions are marginal but not poor', () => {
            const criteria: ConditionCriteria = {
                ...goodConditions,
                visibility: 7, // Marginal visibility
            };
            const result = evaluateAllRules(criteria, false);
            expect(result.condition).toBe('marginal');
            expect(result.reasons.length).toBeGreaterThan(0);
        });

        it('collects multiple reasons for poor conditions', () => {
            const criteria: ConditionCriteria = {
                ...goodConditions,
                visibility: 3, // Poor
                cloudBaseAGL: 1000, // Poor
                precipitation: 10, // Poor
            };
            const result = evaluateAllRules(criteria, false);
            expect(result.condition).toBe('poor');
            expect(result.reasons.length).toBe(3);
        });

        it('applies terminal-specific rules at terminals', () => {
            const criteria: ConditionCriteria = {
                ...goodConditions,
                terminalWindSpeed: 30, // High wind
                crosswindKt: 25, // High crosswind
            };
            const result = evaluateAllRules(criteria, true);
            expect(result.condition).toBe('poor');
            expect(result.reasons.some(r => r.includes('wind'))).toBe(true);
        });

        it('skips terminal rules for non-terminal waypoints', () => {
            const criteria: ConditionCriteria = {
                ...goodConditions,
                terminalWindSpeed: 30, // Would be poor at terminal
            };
            const result = evaluateAllRules(criteria, false);
            expect(result.condition).toBe('good');
        });

        it('skips terrain clearance for terminal waypoints', () => {
            const criteria: ConditionCriteria = {
                ...goodConditions,
                terrainClearance: 100, // Would be poor en-route
            };
            const result = evaluateAllRules(criteria, true);
            // Terrain clearance is skipped for terminals
            expect(result.reasons.every(r => !r.includes('terrain'))).toBe(true);
        });
    });

    describe('VFR_CONDITION_RULES', () => {
        it('has all expected rule IDs', () => {
            const ruleIds = VFR_CONDITION_RULES.map(r => r.id);
            expect(ruleIds).toContain('terminal-wind-speed');
            expect(ruleIds).toContain('terminal-gust');
            expect(ruleIds).toContain('crosswind');
            expect(ruleIds).toContain('tailwind');
            expect(ruleIds).toContain('cloud-base-agl');
            expect(ruleIds).toContain('visibility');
            expect(ruleIds).toContain('precipitation');
            expect(ruleIds).toContain('terrain-clearance');
            expect(ruleIds).toContain('cloud-clearance');
        });

        it('has consistent thresholds (marginal > poor for "lt" rules)', () => {
            const ltRules = VFR_CONDITION_RULES.filter(r => r.operator === 'lt');
            for (const rule of ltRules) {
                expect(rule.marginalThreshold).toBeGreaterThanOrEqual(rule.poorThreshold);
            }
        });

        it('has consistent thresholds (marginal < poor for "gt" rules)', () => {
            const gtRules = VFR_CONDITION_RULES.filter(r => r.operator === 'gt');
            for (const rule of gtRules) {
                expect(rule.marginalThreshold).toBeLessThanOrEqual(rule.poorThreshold);
            }
        });

        it('has unique rule IDs', () => {
            const ruleIds = VFR_CONDITION_RULES.map(r => r.id);
            const uniqueIds = new Set(ruleIds);
            expect(uniqueIds.size).toBe(ruleIds.length);
        });
    });

    describe('VFR_THRESHOLDS', () => {
        it('has wind thresholds matching rules', () => {
            const rule = VFR_CONDITION_RULES.find(r => r.id === 'terminal-wind-speed')!;
            expect(VFR_THRESHOLDS.wind.poor).toBe(rule.poorThreshold);
            expect(VFR_THRESHOLDS.wind.marginal).toBe(rule.marginalThreshold);
        });

        it('has ceiling thresholds matching rules', () => {
            const rule = VFR_CONDITION_RULES.find(r => r.id === 'cloud-base-agl')!;
            expect(VFR_THRESHOLDS.ceiling.poor).toBe(rule.poorThreshold);
            expect(VFR_THRESHOLDS.ceiling.marginal).toBe(rule.marginalThreshold);
        });

        it('has visibility thresholds matching rules', () => {
            const rule = VFR_CONDITION_RULES.find(r => r.id === 'visibility')!;
            expect(VFR_THRESHOLDS.visibility.poor).toBe(rule.poorThreshold);
            expect(VFR_THRESHOLDS.visibility.marginal).toBe(rule.marginalThreshold);
        });
    });

    describe('buildRulesFromThresholds', () => {
        it('builds rules with standard thresholds matching VFR_CONDITION_RULES', () => {
            const rules = buildRulesFromThresholds(STANDARD_THRESHOLDS);
            const windRule = rules.find(r => r.id === 'terminal-wind-speed')!;
            expect(windRule.poorThreshold).toBe(25);
            expect(windRule.marginalThreshold).toBe(20);
        });

        it('builds rules with conservative thresholds', () => {
            const rules = buildRulesFromThresholds(CONSERVATIVE_THRESHOLDS);
            const windRule = rules.find(r => r.id === 'terminal-wind-speed')!;
            expect(windRule.poorThreshold).toBe(20);
            expect(windRule.marginalThreshold).toBe(15);
        });

        it('builds all 9 rules', () => {
            const rules = buildRulesFromThresholds(STANDARD_THRESHOLDS);
            expect(rules).toHaveLength(9);
        });

        it('negates tailwind thresholds correctly', () => {
            const rules = buildRulesFromThresholds(STANDARD_THRESHOLDS);
            const tailwindRule = rules.find(r => r.id === 'tailwind')!;
            // Standard tailwind: poor=15, marginal=10 stored as positive
            // But rules use negative values for lt comparison
            expect(tailwindRule.poorThreshold).toBe(-15);
            expect(tailwindRule.marginalThreshold).toBe(-10);
        });

        it('builds rules with all expected IDs', () => {
            const rules = buildRulesFromThresholds(STANDARD_THRESHOLDS);
            const ruleIds = rules.map(r => r.id);
            expect(ruleIds).toContain('terminal-wind-speed');
            expect(ruleIds).toContain('terminal-gust');
            expect(ruleIds).toContain('crosswind');
            expect(ruleIds).toContain('tailwind');
            expect(ruleIds).toContain('cloud-base-agl');
            expect(ruleIds).toContain('visibility');
            expect(ruleIds).toContain('precipitation');
            expect(ruleIds).toContain('terrain-clearance');
            expect(ruleIds).toContain('cloud-clearance');
        });
    });

    describe('evaluateAllRules with custom thresholds', () => {
        it('uses custom thresholds when provided', () => {
            const customThresholds: typeof STANDARD_THRESHOLDS = {
                ...STANDARD_THRESHOLDS,
                visibility: { poor: 10, marginal: 15 }, // Much stricter
            };
            const criteria: ConditionCriteria = {
                ...goodConditions,
                visibility: 12, // Would be good with standard (marginal=8), marginal with custom (marginal=15)
            };
            const result = evaluateAllRules(criteria, false, customThresholds);
            expect(result.condition).toBe('marginal');
        });

        it('uses default rules when thresholds not provided', () => {
            const criteria: ConditionCriteria = {
                ...goodConditions,
                visibility: 12, // Good with standard thresholds (marginal=8)
            };
            const result = evaluateAllRules(criteria, false);
            expect(result.condition).toBe('good');
        });

        it('uses conservative thresholds correctly', () => {
            const criteria: ConditionCriteria = {
                ...goodConditions,
                visibility: 10, // Good with standard (marginal=8), marginal with conservative (marginal=12)
            };
            const result = evaluateAllRules(criteria, false, CONSERVATIVE_THRESHOLDS);
            expect(result.condition).toBe('marginal');
        });
    });

    describe('Edge cases', () => {
        it('handles undefined optional values gracefully', () => {
            const criteria: ConditionCriteria = {
                windSpeed: 10,
                cloudBaseAGL: 999999,
                visibility: 15,
                precipitation: 0,
                terrainClearance: 2000,
                cloudClearance: 999999,
                // Optional values omitted
            };
            const result = evaluateAllRules(criteria, false);
            expect(result.condition).toBe('good');
        });

        it('handles tailwind (negative headwind) correctly', () => {
            const tailwindRule = VFR_CONDITION_RULES.find(r => r.id === 'tailwind')!;

            // Strong tailwind (headwind = -15)
            const poorResult = evaluateRule(tailwindRule, { ...goodConditions, headwindKt: -16 }, true);
            expect(poorResult.condition).toBe('poor');

            // Moderate tailwind (headwind = -10)
            const marginalResult = evaluateRule(tailwindRule, { ...goodConditions, headwindKt: -12 }, true);
            expect(marginalResult.condition).toBe('marginal');

            // Headwind (positive value)
            const goodResult = evaluateRule(tailwindRule, { ...goodConditions, headwindKt: 10 }, true);
            expect(goodResult.condition).toBe('good');
        });
    });
});
