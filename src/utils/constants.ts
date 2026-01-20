/**
 * Constants for VFR Planner
 * Centralizes magic numbers for maintainability
 */

// Time constants
export const MS_PER_SECOND = 1000;
export const MS_PER_MINUTE = 60 * MS_PER_SECOND;
export const MS_PER_HOUR = 60 * MS_PER_MINUTE;
export const MINUTES_PER_HOUR = 60;

// VFR Weather Minimums
export const VFR_MIN_VISIBILITY_KM = 5;
export const VFR_MIN_CEILING_FEET = 1500;
export const VFR_WIND_CAUTION_KNOTS = 25;
export const VFR_GUST_CAUTION_KNOTS = 35;
export const VFR_PRECIP_CAUTION_MM = 5;

// Aviation constants
export const EARTH_RADIUS_NM = 3440.065;
export const TYPICAL_CLOUD_THICKNESS_FEET = 3000;

// Forecast confidence thresholds (hours from now)
export const HIGH_CONFIDENCE_HOURS = 24;
export const MEDIUM_CONFIDENCE_HOURS = 72;

// Cache and timeout defaults
export const WEATHER_CACHE_INTERVAL_MS = MS_PER_HOUR;
export const DEFAULT_FORECAST_TIMEOUT_MS = 10 * MS_PER_SECOND;
export const DEFAULT_REQUEST_TIMEOUT_MS = 15 * MS_PER_SECOND;

// Search intervals
export const VFR_WINDOW_SCAN_INTERVAL_MS = MS_PER_HOUR;
