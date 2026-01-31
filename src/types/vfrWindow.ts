/**
 * VFR Flight Window Detection Types
 * Types for detecting and representing time windows with acceptable VFR conditions
 */

import type { SegmentCondition } from '../services/profileService';
import type { VfrConditionThresholds } from './conditionThresholds';

/**
 * Minimum acceptable condition level for VFR flight
 * - 'good': Only accept windows where all waypoints have good conditions
 * - 'marginal': Accept windows where conditions are marginal or better
 */
export type MinimumConditionLevel = 'good' | 'marginal';

/**
 * Result of evaluating a single departure time
 */
export interface DepartureTimeEvaluation {
    /** The departure timestamp being evaluated (ms) */
    departureTime: number;
    /** Whether conditions are acceptable at this departure time */
    isAcceptable: boolean;
    /** The worst condition found across all waypoints */
    worstCondition: SegmentCondition;
    /** Name of the waypoint with the worst condition */
    limitingWaypoint?: string;
    /** Reasons for marginal/poor conditions at limiting waypoint */
    limitingReasons?: string[];
}

/**
 * A time window with acceptable VFR conditions
 */
export interface VFRWindow {
    /** Start of the window (departure time) in ms */
    startTime: number;
    /** End of the window (latest acceptable departure time) in ms */
    endTime: number;
    /** Duration of the window in minutes */
    duration: number;
    /** Worst condition encountered during this window */
    worstCondition: SegmentCondition;
    /** Confidence level based on forecast distance */
    confidence: 'high' | 'medium' | 'low';
}

/**
 * Result of a VFR window search operation
 */
export interface VFRWindowSearchResult {
    /** Found VFR windows, sorted by start time */
    windows: VFRWindow[];
    /** The time range that was searched */
    searchRange: { start: number; end: number };
    /** The minimum condition level used for search */
    minimumCondition: MinimumConditionLevel;
    /** Total flight duration in minutes (minimum window size) */
    flightDuration: number;
    /** Reason search was limited (e.g., "Forecast ends at...") */
    limitedBy?: string;
    /** Detailed CSV data if collectDetailedData was enabled */
    csvData?: VFRWindowCSVData;
}

/**
 * Options for VFR window search
 */
export interface VFRWindowSearchOptions {
    /** Minimum acceptable condition level */
    minimumCondition: MinimumConditionLevel;
    /** Maximum concurrent weather fetches (default: 4) */
    maxConcurrent?: number;
    /** Maximum number of windows to find (default: 5) */
    maxWindows?: number;
    /** Start search from this time (default: forecast start) */
    startFrom?: number;
    /** Collect detailed data for CSV export */
    collectDetailedData?: boolean;
    /** Include night hours in search (default: false - daylight only) */
    includeNightFlights?: boolean;
    /** Route coordinates for sun position calculation (first waypoint lat/lon) */
    routeCoordinates?: { lat: number; lon: number };
    /** VFR condition thresholds (aircraft/region-specific) */
    thresholds?: VfrConditionThresholds;
}

/**
 * Detailed weather and condition data for a single waypoint at a specific time
 */
export interface WaypointEvaluationDetail {
    departureTime: number;
    departureTimeISO: string;
    waypointName: string;
    waypointIndex: number;
    arrivalTime: number;
    arrivalTimeISO: string;
    altitude: number;
    terrainElevation: number;
    windSpeed: number;
    windDir: number;
    windGust?: number;
    temperature: number;
    dewPoint?: number;
    cloudBase?: number;
    cloudBaseFt?: number;
    visibility?: number;
    condition: SegmentCondition;
    conditionReasons: string;
    isTerminal: boolean;
}

/**
 * CSV export data from VFR window search
 */
export interface VFRWindowCSVData {
    rows: WaypointEvaluationDetail[];
    generatedAt: string;
    searchRange: { start: string; end: string };
    minimumCondition: MinimumConditionLevel;
}
