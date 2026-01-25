/**
 * VFR Condition Threshold Types and Presets
 * Provides customizable thresholds for VFR/MVFR/IFR condition evaluation
 */

/**
 * A single threshold with poor and marginal limits
 * - poor: Threshold for POOR (red) condition
 * - marginal: Threshold for MARGINAL (yellow) condition
 */
export interface ConditionThreshold {
    poor: number;
    marginal: number;
}

/**
 * Complete set of VFR condition thresholds
 * All 9 threshold fields for condition evaluation
 */
export interface VfrConditionThresholds {
    // Weather thresholds
    /** Cloud base above ground level in feet - "less than" rule */
    cloudBaseAgl: ConditionThreshold;
    /** Visibility in kilometers - "less than" rule */
    visibility: ConditionThreshold;
    /** Precipitation in mm - "greater than" rule */
    precipitation: ConditionThreshold;

    // Terminal wind thresholds (departure/arrival only)
    /** Surface wind speed in knots - "greater than" rule */
    surfaceWindSpeed: ConditionThreshold;
    /** Surface gust speed in knots - "greater than" rule */
    surfaceGusts: ConditionThreshold;
    /** Crosswind component in knots - "greater than" rule */
    crosswind: ConditionThreshold;
    /** Tailwind component in knots - "greater than" rule */
    tailwind: ConditionThreshold;

    // Clearance thresholds
    /** Terrain clearance in feet - "less than" rule */
    terrainClearance: ConditionThreshold;
    /** Cloud clearance in feet - "less than" rule */
    cloudClearance: ConditionThreshold;
}

/**
 * Preset type for condition thresholds
 * - 'standard': Default VFR thresholds suitable for most pilots
 * - 'conservative': Stricter thresholds for less experienced pilots or demanding conditions
 * - 'custom': User-defined thresholds
 */
export type ConditionPreset = 'standard' | 'conservative' | 'custom';

/**
 * Standard VFR thresholds
 * These are the default values used in the current implementation
 */
export const STANDARD_THRESHOLDS: VfrConditionThresholds = {
    // Weather thresholds
    cloudBaseAgl: { poor: 1500, marginal: 2000 },
    visibility: { poor: 5, marginal: 8 },
    precipitation: { poor: 5, marginal: 2 },

    // Terminal wind thresholds
    surfaceWindSpeed: { poor: 25, marginal: 20 },
    surfaceGusts: { poor: 35, marginal: 30 },
    crosswind: { poor: 20, marginal: 15 },
    tailwind: { poor: 15, marginal: 10 },

    // Clearance thresholds
    terrainClearance: { poor: 500, marginal: 1000 },
    cloudClearance: { poor: 200, marginal: 500 },
};

/**
 * Conservative VFR thresholds
 * Stricter values for less experienced pilots or more demanding conditions
 *
 * For "less than" rules (cloudBaseAgl, visibility, terrainClearance, cloudClearance):
 *   Higher thresholds = more restrictive (triggers earlier)
 *
 * For "greater than" rules (precipitation, winds):
 *   Lower thresholds = more restrictive (triggers earlier)
 */
export const CONSERVATIVE_THRESHOLDS: VfrConditionThresholds = {
    // Weather thresholds - higher minimums
    cloudBaseAgl: { poor: 2000, marginal: 3000 },
    visibility: { poor: 8, marginal: 12 },
    precipitation: { poor: 3, marginal: 1 },

    // Terminal wind thresholds - lower maximums
    surfaceWindSpeed: { poor: 20, marginal: 15 },
    surfaceGusts: { poor: 28, marginal: 22 },
    crosswind: { poor: 15, marginal: 10 },
    tailwind: { poor: 10, marginal: 5 },

    // Clearance thresholds - higher minimums
    terrainClearance: { poor: 1000, marginal: 1500 },
    cloudClearance: { poor: 500, marginal: 1000 },
};

/**
 * Fields that use "less than" comparison (value < threshold = poor/marginal)
 * For these, marginal must be >= poor (higher is more restrictive)
 */
const LESS_THAN_FIELDS: (keyof VfrConditionThresholds)[] = [
    'cloudBaseAgl',
    'visibility',
    'terrainClearance',
    'cloudClearance',
];

/**
 * Fields that use "greater than" comparison (value > threshold = poor/marginal)
 * For these, marginal must be <= poor (lower is more restrictive)
 */
const GREATER_THAN_FIELDS: (keyof VfrConditionThresholds)[] = [
    'precipitation',
    'surfaceWindSpeed',
    'surfaceGusts',
    'crosswind',
    'tailwind',
];

/**
 * Validates that thresholds are logically consistent
 *
 * For "less than" rules: marginal >= poor (e.g., ceiling 2000ft marginal >= 1500ft poor)
 * For "greater than" rules: marginal <= poor (e.g., wind 20kt marginal <= 25kt poor)
 *
 * @param thresholds - The thresholds to validate
 * @returns true if all thresholds are valid, false otherwise
 */
export function validateThresholds(thresholds: VfrConditionThresholds): boolean {
    // Validate "less than" fields: marginal >= poor
    for (const field of LESS_THAN_FIELDS) {
        const threshold = thresholds[field];
        if (threshold.marginal < threshold.poor) {
            return false;
        }
    }

    // Validate "greater than" fields: marginal <= poor
    for (const field of GREATER_THAN_FIELDS) {
        const threshold = thresholds[field];
        if (threshold.marginal > threshold.poor) {
            return false;
        }
    }

    return true;
}

/**
 * Gets the thresholds for a given preset
 *
 * @param preset - The preset to get thresholds for
 * @param customThresholds - Custom thresholds (required when preset is 'custom')
 * @returns The thresholds for the preset
 */
export function getThresholdsForPreset(
    preset: ConditionPreset,
    customThresholds?: VfrConditionThresholds
): VfrConditionThresholds {
    switch (preset) {
        case 'standard':
            return STANDARD_THRESHOLDS;
        case 'conservative':
            return CONSERVATIVE_THRESHOLDS;
        case 'custom':
            return customThresholds ?? STANDARD_THRESHOLDS;
        default:
            // Fallback for unknown presets (should not happen with TypeScript)
            return STANDARD_THRESHOLDS;
    }
}
