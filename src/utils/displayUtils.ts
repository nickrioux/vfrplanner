/**
 * Display utility functions for VFR Planner
 * Color schemes, icons, and visual formatting helpers
 */

import type { WaypointType, RunwayInfo } from '../types/flightPlan';
import type { SegmentCondition, BestRunwayResult } from '../services/profileService';
import { findBestRunway } from '../services/profileService';

/**
 * Segment condition colors for route visualization
 */
export const SEGMENT_COLORS = {
    good: '#4caf50',     // Green
    marginal: '#ff9800', // Orange/Yellow
    poor: '#f44336',     // Red
    unknown: '#757575',  // Gray
} as const;

/**
 * Waypoint marker colors by type
 */
export const MARKER_COLORS = {
    AIRPORT: '#e74c3c',
    VOR: '#3498db',
    NDB: '#9b59b6',
    INT: '#2ecc71',
    'INT-VRP': '#2ecc71',
    'USER WAYPOINT': '#f39c12',
} as const;

/**
 * Waypoint icons by type
 */
export const WAYPOINT_ICONS = {
    AIRPORT: '🛫',
    VOR: '📡',
    NDB: '📻',
    INT: '📍',
    'INT-VRP': '📍',
    'USER WAYPOINT': '📌',
} as const;

/**
 * Get segment color based on VFR condition
 */
export function getSegmentColor(condition?: SegmentCondition): string {
    switch (condition) {
        case 'good':
            return SEGMENT_COLORS.good;
        case 'marginal':
            return SEGMENT_COLORS.marginal;
        case 'poor':
            return SEGMENT_COLORS.poor;
        case 'unknown':
        default:
            return SEGMENT_COLORS.unknown;
    }
}

/**
 * Get waypoint icon emoji by type
 */
export function getWaypointIcon(type: WaypointType): string {
    switch (type) {
        case 'AIRPORT': return WAYPOINT_ICONS.AIRPORT;
        case 'VOR': return WAYPOINT_ICONS.VOR;
        case 'NDB': return WAYPOINT_ICONS.NDB;
        case 'INT':
        case 'INT-VRP': return WAYPOINT_ICONS.INT;
        case 'USER WAYPOINT':
        default: return WAYPOINT_ICONS['USER WAYPOINT'];
    }
}

/**
 * Get marker color by waypoint type
 */
export function getMarkerColor(type: WaypointType): string {
    switch (type) {
        case 'AIRPORT': return MARKER_COLORS.AIRPORT;
        case 'VOR': return MARKER_COLORS.VOR;
        case 'NDB': return MARKER_COLORS.NDB;
        case 'INT':
        case 'INT-VRP': return MARKER_COLORS.INT;
        case 'USER WAYPOINT':
        default: return MARKER_COLORS['USER WAYPOINT'];
    }
}

/**
 * Get best runway for given wind conditions
 */
export function getBestRunway(
    runways: RunwayInfo[],
    windDir: number,
    windSpeed: number,
    gustSpeed?: number
): BestRunwayResult | null {
    return findBestRunway(runways, windDir, windSpeed, gustSpeed);
}
