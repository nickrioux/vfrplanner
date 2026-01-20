/**
 * Unit conversion utilities for VFR Planner
 * Centralizes all conversion functions to avoid duplication
 */

// Conversion constants
const METERS_TO_FEET = 3.28084;
const FEET_TO_METERS = 0.3048;
const MS_TO_KNOTS = 1.94384;
const KNOTS_TO_MS = 0.514444;
const NM_TO_METERS = 1852;
const METERS_TO_NM = 1 / NM_TO_METERS;
const KELVIN_OFFSET = 273.15;

/**
 * Convert meters to feet
 */
export function metersToFeet(m: number): number {
    return m * METERS_TO_FEET;
}

/**
 * Convert feet to meters
 */
export function feetToMeters(feet: number): number {
    return feet * FEET_TO_METERS;
}

/**
 * Convert m/s to knots
 */
export function msToKnots(ms: number): number {
    return ms * MS_TO_KNOTS;
}

/**
 * Convert knots to m/s
 */
export function knotsToMs(knots: number): number {
    return knots * KNOTS_TO_MS;
}

/**
 * Convert nautical miles to meters
 */
export function nmToMeters(nm: number): number {
    return nm * NM_TO_METERS;
}

/**
 * Convert meters to nautical miles
 */
export function metersToNm(meters: number): number {
    return meters * METERS_TO_NM;
}

/**
 * Convert Kelvin to Celsius
 */
export function kelvinToCelsius(k: number): number {
    return k - KELVIN_OFFSET;
}

/**
 * Convert Celsius to Kelvin
 */
export function celsiusToKelvin(c: number): number {
    return c + KELVIN_OFFSET;
}
