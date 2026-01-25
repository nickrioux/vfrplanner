/**
 * Plugin settings types
 */

import type { VfrConditionThresholds, ConditionPreset } from './conditionThresholds';
import { STANDARD_THRESHOLDS } from './conditionThresholds';

export type WindowMode = 'panel' | 'floating';

export interface FloatingWindowState {
    x: number;
    y: number;
    width: number;
    height: number;
    minimized: boolean;
}

export interface PluginSettings {
    // Aircraft defaults
    defaultAirspeed: number; // TAS in knots
    defaultAltitude: number; // feet MSL

    // Display options
    showLabels: boolean;

    // Window mode
    windowMode: WindowMode; // 'panel' = rhpane, 'floating' = overlay window
    floatingWindow: FloatingWindowState; // Position and size for floating mode

    // VFR Window options
    includeNightFlights: boolean; // Include night hours when searching for VFR windows
    maxVFRWindows: number; // Maximum number of VFR windows to find

    // Import options
    autoTerrainElevation: boolean; // Auto-set terrain elevation for departure/arrival on import

    // AirportDB integration
    airportdbApiKey: string; // API key from airportdb.io

    // Debug options
    enableLogging: boolean;

    // Terrain profile options
    terrainSampleInterval: number; // NM between terrain elevation samples (1-10)

    // Units (for future use)
    distanceUnit: 'nm' | 'km' | 'mi';
    altitudeUnit: 'ft' | 'm';
    speedUnit: 'kt' | 'kmh' | 'mph';

    // VFR Condition thresholds
    conditionPreset: ConditionPreset;
    customThresholds: VfrConditionThresholds;
}

export const DEFAULT_FLOATING_WINDOW: FloatingWindowState = {
    x: 100,
    y: 100,
    width: 420,
    height: 600,
    minimized: false,
};

export const DEFAULT_SETTINGS: PluginSettings = {
    defaultAirspeed: 100,
    defaultAltitude: 3000,
    showLabels: false,
    windowMode: 'panel', // Default to standard rhpane mode
    floatingWindow: { ...DEFAULT_FLOATING_WINDOW },
    includeNightFlights: false, // By default, only show VFR windows during daylight hours
    maxVFRWindows: 10, // Find up to 10 VFR windows by default
    autoTerrainElevation: true, // Auto-set terrain elevation for departure/arrival
    airportdbApiKey: '', // User must provide their own API key
    enableLogging: false,
    terrainSampleInterval: 5, // Sample every 5 NM by default
    distanceUnit: 'nm',
    altitudeUnit: 'ft',
    speedUnit: 'kt',
    conditionPreset: 'standard',
    customThresholds: { ...STANDARD_THRESHOLDS },
};
