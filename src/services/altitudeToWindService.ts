/**
 * Altitude to pressure level conversion service
 * Provides mappings between altitude (feet MSL) and atmospheric pressure levels
 */

/**
 * Pressure level definition with altitude mapping
 */
export interface PressureLevel {
    level: string;
    altitudeFeet: number;
}

/**
 * Pressure level definitions with approximate altitudes (used for point forecast API)
 * Standard atmosphere approximations for VFR flight planning
 */
export const PRESSURE_LEVELS: readonly PressureLevel[] = [
    { level: 'surface', altitudeFeet: 0 },
    { level: '1000h', altitudeFeet: 330 },
    { level: '950h', altitudeFeet: 1600 },
    { level: '900h', altitudeFeet: 3300 },
    { level: '850h', altitudeFeet: 5000 },
    { level: '700h', altitudeFeet: 10000 },
    { level: '500h', altitudeFeet: 18000 },
    { level: '300h', altitudeFeet: 30000 },
    { level: '200h', altitudeFeet: 39000 },
] as const;

/**
 * Meteogram pressure levels with approximate altitudes in feet
 * These are the levels available from getMeteogramForecastData with extended: 'true'
 * Includes all standard pressure levels from surface to stratosphere
 */
export const METEOGRAM_PRESSURE_LEVELS: readonly PressureLevel[] = [
    { level: '1000h', altitudeFeet: 330 },
    { level: '975h', altitudeFeet: 1000 },
    { level: '950h', altitudeFeet: 1600 },
    { level: '925h', altitudeFeet: 2500 },
    { level: '900h', altitudeFeet: 3300 },
    { level: '850h', altitudeFeet: 5000 },
    { level: '800h', altitudeFeet: 6200 },
    { level: '700h', altitudeFeet: 10000 },
    { level: '600h', altitudeFeet: 14000 },
    { level: '500h', altitudeFeet: 18000 },
    { level: '400h', altitudeFeet: 23500 },
    { level: '300h', altitudeFeet: 30000 },
    { level: '250h', altitudeFeet: 34000 },
    { level: '200h', altitudeFeet: 39000 },
    { level: '150h', altitudeFeet: 45000 },
    { level: '100h', altitudeFeet: 53000 },
] as const;

/**
 * Convert altitude in feet MSL to approximate pressure level (hPa)
 * Uses standard atmosphere model
 * @param altitudeFeet - Altitude in feet MSL
 * @returns Pressure level string (e.g., "850h") or "surface" for low altitudes
 */
export function altitudeToPressureLevel(altitudeFeet: number): string {
    if (altitudeFeet < 500) {
        return 'surface';
    }

    // Find the appropriate level
    for (let i = PRESSURE_LEVELS.length - 1; i >= 0; i--) {
        if (altitudeFeet >= PRESSURE_LEVELS[i].altitudeFeet) {
            return PRESSURE_LEVELS[i].level;
        }
    }

    return 'surface';
}

/**
 * Result of finding bracketing pressure levels for altitude interpolation
 */
export interface BracketingLevels {
    lower: PressureLevel;
    upper: PressureLevel;
    fraction: number; // 0-1, how far between lower and upper
}

/**
 * Get the two pressure levels that bracket the target altitude for interpolation
 * @param altitudeFeet - Target altitude in feet MSL
 * @returns Object with lower and upper pressure levels and their altitudes, plus interpolation fraction
 */
export function getBracketingPressureLevels(altitudeFeet: number): BracketingLevels | null {
    if (altitudeFeet < 0) {
        return null;
    }

    // If below lowest level, use surface only
    if (altitudeFeet < PRESSURE_LEVELS[1].altitudeFeet) {
        return {
            lower: PRESSURE_LEVELS[0],
            upper: PRESSURE_LEVELS[1],
            fraction: altitudeFeet / PRESSURE_LEVELS[1].altitudeFeet
        };
    }

    // Find the two levels that bracket the altitude
    for (let i = 1; i < PRESSURE_LEVELS.length; i++) {
        const lower = PRESSURE_LEVELS[i - 1];
        const upper = PRESSURE_LEVELS[i];

        if (altitudeFeet >= lower.altitudeFeet && altitudeFeet <= upper.altitudeFeet) {
            const altitudeRange = upper.altitudeFeet - lower.altitudeFeet;
            const fraction = altitudeRange > 0
                ? (altitudeFeet - lower.altitudeFeet) / altitudeRange
                : 0;

            return { lower, upper, fraction };
        }
    }

    // Above highest level, use highest two levels
    const last = PRESSURE_LEVELS[PRESSURE_LEVELS.length - 1];
    const secondLast = PRESSURE_LEVELS[PRESSURE_LEVELS.length - 2];
    return {
        lower: secondLast,
        upper: last,
        fraction: 1.0 // At or above highest level
    };
}

/**
 * Get the altitude for a given pressure level from meteogram data
 * @param level - Pressure level string (e.g., "850h")
 * @returns Altitude in feet, or undefined if level not found
 */
export function getAltitudeForPressureLevel(level: string): number | undefined {
    const levelInfo = METEOGRAM_PRESSURE_LEVELS.find(pl => pl.level === level);
    return levelInfo?.altitudeFeet;
}
