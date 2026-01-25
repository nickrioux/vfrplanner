/**
 * VFR Condition Evaluation Rules
 * Table-based approach for condition assessment
 * Replaces dense if-else chains with declarative rules
 */

import type { SegmentCondition } from './profileService';
import type { VfrConditionThresholds } from '../types/conditionThresholds';

export { STANDARD_THRESHOLDS, CONSERVATIVE_THRESHOLDS } from '../types/conditionThresholds';

/**
 * A single validation rule for VFR condition assessment
 */
export interface VFRConditionRule {
    /** Unique identifier for the rule */
    id: string;
    /** Human-readable name for the condition being checked */
    name: string;
    /** Whether this rule only applies to terminal (departure/arrival) waypoints */
    terminalOnly: boolean;
    /** Whether this rule should be skipped for terminal waypoints */
    skipForTerminal: boolean;
    /** Threshold for POOR condition (red) */
    poorThreshold: number;
    /** Threshold for MARGINAL condition (yellow) */
    marginalThreshold: number;
    /** Comparison operator: 'lt' (less than), 'gt' (greater than) */
    operator: 'lt' | 'gt';
    /** Function to extract the value to check from criteria */
    getValue: (criteria: ConditionCriteria) => number | undefined;
    /** Message format for poor condition (use {value} for the actual value) */
    poorMessage: string;
    /** Message format for marginal condition (use {value} for the actual value) */
    marginalMessage: string;
}

/**
 * Criteria values used for condition evaluation
 */
export interface ConditionCriteria {
    windSpeed: number;
    gustSpeed?: number;
    cloudBaseAGL: number;
    visibility: number;
    precipitation: number;
    terrainClearance: number;
    cloudClearance: number;
    // Terminal-specific (surface wind)
    terminalWindSpeed?: number;
    terminalWindDir?: number;
    crosswindKt?: number;
    headwindKt?: number;
}

/**
 * VFR condition rules table
 * Each rule defines thresholds for poor and marginal conditions
 */
export const VFR_CONDITION_RULES: VFRConditionRule[] = [
    // Terminal wind rules (departure/arrival only)
    {
        id: 'terminal-wind-speed',
        name: 'Surface Wind Speed',
        terminalOnly: true,
        skipForTerminal: false,
        poorThreshold: 25,
        marginalThreshold: 20,
        operator: 'gt',
        getValue: (c) => c.terminalWindSpeed,
        poorMessage: 'High surface wind ({value}kt)',
        marginalMessage: 'Elevated surface wind ({value}kt)',
    },
    {
        id: 'terminal-gust',
        name: 'Surface Gusts',
        terminalOnly: true,
        skipForTerminal: false,
        poorThreshold: 35,
        marginalThreshold: 30,
        operator: 'gt',
        getValue: (c) => c.gustSpeed,
        poorMessage: 'High gusts ({value}kt)',
        marginalMessage: 'Elevated gusts ({value}kt)',
    },
    {
        id: 'crosswind',
        name: 'Crosswind Component',
        terminalOnly: true,
        skipForTerminal: false,
        poorThreshold: 20,
        marginalThreshold: 15,
        operator: 'gt',
        getValue: (c) => c.crosswindKt,
        poorMessage: 'High crosswind ({value}kt)',
        marginalMessage: 'Crosswind ({value}kt)',
    },
    {
        id: 'tailwind',
        name: 'Tailwind Component',
        terminalOnly: true,
        skipForTerminal: false,
        poorThreshold: -15,
        marginalThreshold: -10,
        operator: 'lt',
        getValue: (c) => c.headwindKt,
        poorMessage: 'Strong tailwind ({value}kt)',
        marginalMessage: 'Tailwind ({value}kt)',
    },

    // Weather rules (all waypoints)
    {
        id: 'cloud-base-agl',
        name: 'Cloud Base AGL',
        terminalOnly: false,
        skipForTerminal: false,
        poorThreshold: 1500,
        marginalThreshold: 2000,
        operator: 'lt',
        getValue: (c) => c.cloudBaseAGL < 999999 ? c.cloudBaseAGL : undefined,
        poorMessage: 'Low ceiling ({value}ft AGL)',
        marginalMessage: 'Marginal ceiling ({value}ft AGL)',
    },
    {
        id: 'visibility',
        name: 'Visibility',
        terminalOnly: false,
        skipForTerminal: false,
        poorThreshold: 5,
        marginalThreshold: 8,
        operator: 'lt',
        getValue: (c) => c.visibility,
        poorMessage: 'Low visibility ({value}km)',
        marginalMessage: 'Reduced visibility ({value}km)',
    },
    {
        id: 'precipitation',
        name: 'Precipitation',
        terminalOnly: false,
        skipForTerminal: false,
        poorThreshold: 5,
        marginalThreshold: 2,
        operator: 'gt',
        getValue: (c) => c.precipitation,
        poorMessage: 'Heavy precipitation ({value}mm)',
        marginalMessage: 'Moderate precipitation ({value}mm)',
    },

    // Terrain/clearance rules (en-route only)
    {
        id: 'terrain-clearance',
        name: 'Terrain Clearance',
        terminalOnly: false,
        skipForTerminal: true,
        poorThreshold: 500,
        marginalThreshold: 1000,
        operator: 'lt',
        getValue: (c) => c.terrainClearance,
        poorMessage: 'Low terrain clearance ({value}ft)',
        marginalMessage: 'Marginal terrain clearance ({value}ft)',
    },
    {
        id: 'cloud-clearance',
        name: 'Cloud Clearance',
        terminalOnly: false,
        skipForTerminal: false,
        poorThreshold: 200,
        marginalThreshold: 500,
        operator: 'lt',
        getValue: (c) => c.cloudClearance < 999999 ? c.cloudClearance : undefined,
        poorMessage: 'Insufficient cloud clearance ({value}ft)',
        marginalMessage: 'Marginal cloud clearance ({value}ft)',
    },
];

/**
 * Build VFR condition rules from custom thresholds
 * Creates the same rule structure as VFR_CONDITION_RULES but with values from the provided thresholds
 *
 * @param thresholds - Custom threshold values to use
 * @returns Array of VFR condition rules with the custom thresholds
 */
export function buildRulesFromThresholds(thresholds: VfrConditionThresholds): VFRConditionRule[] {
    return [
        // Terminal wind rules (departure/arrival only)
        {
            id: 'terminal-wind-speed',
            name: 'Surface Wind Speed',
            terminalOnly: true,
            skipForTerminal: false,
            poorThreshold: thresholds.surfaceWindSpeed.poor,
            marginalThreshold: thresholds.surfaceWindSpeed.marginal,
            operator: 'gt',
            getValue: (c) => c.terminalWindSpeed,
            poorMessage: 'High surface wind ({value}kt)',
            marginalMessage: 'Elevated surface wind ({value}kt)',
        },
        {
            id: 'terminal-gust',
            name: 'Surface Gusts',
            terminalOnly: true,
            skipForTerminal: false,
            poorThreshold: thresholds.surfaceGusts.poor,
            marginalThreshold: thresholds.surfaceGusts.marginal,
            operator: 'gt',
            getValue: (c) => c.gustSpeed,
            poorMessage: 'High gusts ({value}kt)',
            marginalMessage: 'Elevated gusts ({value}kt)',
        },
        {
            id: 'crosswind',
            name: 'Crosswind Component',
            terminalOnly: true,
            skipForTerminal: false,
            poorThreshold: thresholds.crosswind.poor,
            marginalThreshold: thresholds.crosswind.marginal,
            operator: 'gt',
            getValue: (c) => c.crosswindKt,
            poorMessage: 'High crosswind ({value}kt)',
            marginalMessage: 'Crosswind ({value}kt)',
        },
        {
            id: 'tailwind',
            name: 'Tailwind Component',
            terminalOnly: true,
            skipForTerminal: false,
            // Negate thresholds: stored as positive but rules use negative for lt comparison
            poorThreshold: -thresholds.tailwind.poor,
            marginalThreshold: -thresholds.tailwind.marginal,
            operator: 'lt',
            getValue: (c) => c.headwindKt,
            poorMessage: 'Strong tailwind ({value}kt)',
            marginalMessage: 'Tailwind ({value}kt)',
        },

        // Weather rules (all waypoints)
        {
            id: 'cloud-base-agl',
            name: 'Cloud Base AGL',
            terminalOnly: false,
            skipForTerminal: false,
            poorThreshold: thresholds.cloudBaseAgl.poor,
            marginalThreshold: thresholds.cloudBaseAgl.marginal,
            operator: 'lt',
            getValue: (c) => c.cloudBaseAGL < 999999 ? c.cloudBaseAGL : undefined,
            poorMessage: 'Low ceiling ({value}ft AGL)',
            marginalMessage: 'Marginal ceiling ({value}ft AGL)',
        },
        {
            id: 'visibility',
            name: 'Visibility',
            terminalOnly: false,
            skipForTerminal: false,
            poorThreshold: thresholds.visibility.poor,
            marginalThreshold: thresholds.visibility.marginal,
            operator: 'lt',
            getValue: (c) => c.visibility,
            poorMessage: 'Low visibility ({value}km)',
            marginalMessage: 'Reduced visibility ({value}km)',
        },
        {
            id: 'precipitation',
            name: 'Precipitation',
            terminalOnly: false,
            skipForTerminal: false,
            poorThreshold: thresholds.precipitation.poor,
            marginalThreshold: thresholds.precipitation.marginal,
            operator: 'gt',
            getValue: (c) => c.precipitation,
            poorMessage: 'Heavy precipitation ({value}mm)',
            marginalMessage: 'Moderate precipitation ({value}mm)',
        },

        // Terrain/clearance rules (en-route only)
        {
            id: 'terrain-clearance',
            name: 'Terrain Clearance',
            terminalOnly: false,
            skipForTerminal: true,
            poorThreshold: thresholds.terrainClearance.poor,
            marginalThreshold: thresholds.terrainClearance.marginal,
            operator: 'lt',
            getValue: (c) => c.terrainClearance,
            poorMessage: 'Low terrain clearance ({value}ft)',
            marginalMessage: 'Marginal terrain clearance ({value}ft)',
        },
        {
            id: 'cloud-clearance',
            name: 'Cloud Clearance',
            terminalOnly: false,
            skipForTerminal: false,
            poorThreshold: thresholds.cloudClearance.poor,
            marginalThreshold: thresholds.cloudClearance.marginal,
            operator: 'lt',
            getValue: (c) => c.cloudClearance < 999999 ? c.cloudClearance : undefined,
            poorMessage: 'Insufficient cloud clearance ({value}ft)',
            marginalMessage: 'Marginal cloud clearance ({value}ft)',
        },
    ];
}

/**
 * Result of evaluating a single rule
 */
export interface RuleEvaluationResult {
    ruleId: string;
    condition: SegmentCondition;
    message?: string;
    value?: number;
}

/**
 * Evaluate a single rule against criteria
 * @param rule - The rule to evaluate
 * @param criteria - The criteria values
 * @param isTerminal - Whether this is a terminal waypoint
 * @returns Evaluation result
 */
export function evaluateRule(
    rule: VFRConditionRule,
    criteria: ConditionCriteria,
    isTerminal: boolean
): RuleEvaluationResult {
    // Skip if rule doesn't apply to this waypoint type
    if (rule.terminalOnly && !isTerminal) {
        return { ruleId: rule.id, condition: 'good' };
    }
    if (rule.skipForTerminal && isTerminal) {
        return { ruleId: rule.id, condition: 'good' };
    }

    const value = rule.getValue(criteria);

    // Skip if no value available
    if (value === undefined) {
        return { ruleId: rule.id, condition: 'good' };
    }

    const formatMessage = (template: string): string =>
        template.replace('{value}', Math.round(Math.abs(value)).toString());

    // Check against thresholds based on operator
    if (rule.operator === 'lt') {
        if (value < rule.poorThreshold) {
            return {
                ruleId: rule.id,
                condition: 'poor',
                message: formatMessage(rule.poorMessage),
                value,
            };
        }
        if (value < rule.marginalThreshold) {
            return {
                ruleId: rule.id,
                condition: 'marginal',
                message: formatMessage(rule.marginalMessage),
                value,
            };
        }
    } else {
        // operator === 'gt'
        if (value > rule.poorThreshold) {
            return {
                ruleId: rule.id,
                condition: 'poor',
                message: formatMessage(rule.poorMessage),
                value,
            };
        }
        if (value > rule.marginalThreshold) {
            return {
                ruleId: rule.id,
                condition: 'marginal',
                message: formatMessage(rule.marginalMessage),
                value,
            };
        }
    }

    return { ruleId: rule.id, condition: 'good' };
}

/**
 * Evaluate all rules and aggregate results
 * @param criteria - The criteria values
 * @param isTerminal - Whether this is a terminal waypoint
 * @param rules - Optional custom rules (defaults to VFR_CONDITION_RULES)
 * @returns Aggregated condition and list of reasons
 */
export function evaluateAllRules(
    criteria: ConditionCriteria,
    isTerminal: boolean,
    rules: VFRConditionRule[] = VFR_CONDITION_RULES
): { condition: SegmentCondition; reasons: string[] } {
    const reasons: string[] = [];
    let hasPoor = false;
    let hasMarginal = false;

    for (const rule of rules) {
        const result = evaluateRule(rule, criteria, isTerminal);

        if (result.condition === 'poor') {
            hasPoor = true;
            if (result.message) {
                reasons.push(result.message);
            }
        } else if (result.condition === 'marginal') {
            hasMarginal = true;
            if (result.message) {
                reasons.push(result.message);
            }
        }
    }

    if (hasPoor) {
        return { condition: 'poor', reasons };
    }
    if (hasMarginal) {
        return { condition: 'marginal', reasons };
    }

    return { condition: 'good', reasons: [] };
}

/**
 * VFR condition thresholds (for reference and display)
 * These match the values in VFR_CONDITION_RULES
 */
export const VFR_THRESHOLDS = {
    wind: {
        poor: 25,       // kt
        marginal: 20,   // kt
    },
    gust: {
        poor: 35,       // kt
        marginal: 30,   // kt
    },
    crosswind: {
        poor: 20,       // kt
        marginal: 15,   // kt
    },
    tailwind: {
        poor: 15,       // kt (absolute value)
        marginal: 10,   // kt
    },
    ceiling: {
        poor: 1500,     // ft AGL
        marginal: 2000, // ft AGL
    },
    visibility: {
        poor: 5,        // km
        marginal: 8,    // km
    },
    precipitation: {
        poor: 5,        // mm
        marginal: 2,    // mm
    },
    terrainClearance: {
        poor: 500,      // ft
        marginal: 1000, // ft
    },
    cloudClearance: {
        poor: 200,      // ft
        marginal: 500,  // ft
    },
} as const;
