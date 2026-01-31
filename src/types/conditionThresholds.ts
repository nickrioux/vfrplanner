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

// ============================================
// Helicopter-Specific Thresholds
// ============================================

// Visibility conversions:
// 1 SM = 1.609 km
// 0.5 SM = 0.8 km
// 1.0 SM = 1.6 km
// 2.0 SM = 3.2 km

/**
 * Aircraft category type
 * - 'airplane': Standard fixed-wing aircraft (default)
 * - 'helicopter': Rotary-wing aircraft with different VFR minimums
 */
export type AircraftCategory = 'airplane' | 'helicopter';

/**
 * Regulatory region for VFR minimums
 * - 'canada': Transport Canada regulations
 * - 'usa': FAA regulations
 * - 'europe': EASA SERA regulations
 */
export type Region = 'canada' | 'usa' | 'europe';

/**
 * Helicopter thresholds for Canada (Transport Canada)
 * Minimum visibility: 1.0 SM (1.6 km) for day VFR
 * Lower cloud base and terrain clearance requirements than airplanes
 */
export const HELICOPTER_THRESHOLDS_CANADA: VfrConditionThresholds = {
    // Weather thresholds - lower for helicopters
    cloudBaseAgl: { poor: 500, marginal: 1000 },      // Lower ceiling acceptable
    visibility: { poor: 1.6, marginal: 3.2 },          // 1 SM poor / 2 SM marginal
    precipitation: { poor: 5, marginal: 2 },

    // Terminal wind thresholds - helicopters handle wind better
    surfaceWindSpeed: { poor: 30, marginal: 25 },
    surfaceGusts: { poor: 40, marginal: 35 },
    crosswind: { poor: 25, marginal: 20 },
    tailwind: { poor: 20, marginal: 15 },

    // Clearance thresholds - lower for helicopters
    terrainClearance: { poor: 300, marginal: 500 },
    cloudClearance: { poor: 200, marginal: 500 },
};

/**
 * Helicopter thresholds for USA (FAA)
 * Minimum visibility: 0.5 SM (0.8 km) for Class G day VFR
 * FAA allows lower visibility minimums than Canada
 */
export const HELICOPTER_THRESHOLDS_USA: VfrConditionThresholds = {
    // Weather thresholds - lower minimums per FAR 91.155
    cloudBaseAgl: { poor: 500, marginal: 1000 },
    visibility: { poor: 0.8, marginal: 1.6 },          // 0.5 SM poor / 1 SM marginal
    precipitation: { poor: 5, marginal: 2 },

    // Terminal wind thresholds
    surfaceWindSpeed: { poor: 30, marginal: 25 },
    surfaceGusts: { poor: 40, marginal: 35 },
    crosswind: { poor: 25, marginal: 20 },
    tailwind: { poor: 20, marginal: 15 },

    // Clearance thresholds
    terrainClearance: { poor: 300, marginal: 500 },
    cloudClearance: { poor: 200, marginal: 500 },
};

/**
 * Helicopter thresholds for Europe (EASA SERA)
 * Minimum visibility: 800m (0.8 km) for day VFR at speeds up to 50kt
 * EASA has speed-visibility relationships but we use the minimum
 * Reference: EASA SERA.5010
 */
export const HELICOPTER_THRESHOLDS_EUROPE: VfrConditionThresholds = {
    // Weather thresholds - EASA SERA minimums
    cloudBaseAgl: { poor: 500, marginal: 1000 },
    visibility: { poor: 0.8, marginal: 1.5 },          // 800m poor / 1500m marginal
    precipitation: { poor: 5, marginal: 2 },

    // Terminal wind thresholds
    surfaceWindSpeed: { poor: 30, marginal: 25 },
    surfaceGusts: { poor: 40, marginal: 35 },
    crosswind: { poor: 25, marginal: 20 },
    tailwind: { poor: 20, marginal: 15 },

    // Clearance thresholds
    terrainClearance: { poor: 300, marginal: 500 },
    cloudClearance: { poor: 200, marginal: 500 },
};

/**
 * Map of helicopter thresholds by region
 */
const HELICOPTER_THRESHOLDS_BY_REGION: Record<Region, VfrConditionThresholds> = {
    canada: HELICOPTER_THRESHOLDS_CANADA,
    usa: HELICOPTER_THRESHOLDS_USA,
    europe: HELICOPTER_THRESHOLDS_EUROPE,
};

/**
 * Gets the appropriate thresholds based on aircraft category, region, and preset
 *
 * For airplanes: Uses the base preset thresholds (standard, conservative, or custom)
 * For helicopters: Uses region-specific helicopter thresholds, but respects custom thresholds if set
 *
 * @param category - Aircraft category (airplane or helicopter)
 * @param region - Regulatory region (canada, usa, europe)
 * @param basePreset - Base condition preset (standard, conservative, custom)
 * @param customThresholds - Custom thresholds (used when preset is 'custom')
 * @returns The appropriate VFR condition thresholds
 */
export function getThresholdsForAircraft(
    category: AircraftCategory = 'airplane',
    region: Region = 'canada',
    basePreset: ConditionPreset = 'standard',
    customThresholds?: VfrConditionThresholds
): VfrConditionThresholds {
    // If custom preset is selected, use custom thresholds regardless of aircraft type
    if (basePreset === 'custom' && customThresholds) {
        return customThresholds;
    }

    // For airplanes (or undefined category), use the standard preset thresholds
    if (!category || category === 'airplane') {
        return getThresholdsForPreset(basePreset, customThresholds);
    }

    // For helicopters, use region-specific thresholds
    // Ensure region has a valid value
    const safeRegion = region || 'canada';

    // But if conservative is selected, use the stricter of helicopter or conservative
    if (basePreset === 'conservative') {
        const helicopterThresholds = HELICOPTER_THRESHOLDS_BY_REGION[safeRegion];
        // For conservative helicopter, we'll use helicopter thresholds
        // but user can customize if they want stricter
        return helicopterThresholds;
    }

    // Standard helicopter thresholds for the region
    return HELICOPTER_THRESHOLDS_BY_REGION[safeRegion];
}
