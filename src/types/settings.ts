/**
 * Plugin settings types
 */

import type { VfrConditionThresholds, ConditionPreset, AircraftCategory, Region } from './conditionThresholds';
import { STANDARD_THRESHOLDS } from './conditionThresholds';

// Re-export aircraft/region types for convenience
export type { AircraftCategory, Region };

export interface PluginSettings {
    // Aircraft defaults
    defaultAirspeed: number; // TAS in knots
    defaultAltitude: number; // feet MSL

    // Display options
    showLabels: boolean;

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

    // Aircraft category and region
    aircraftCategory: AircraftCategory;
    region: Region;
}

export const DEFAULT_SETTINGS: PluginSettings = {
    defaultAirspeed: 100,
    defaultAltitude: 3000,
    showLabels: false,
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
    aircraftCategory: 'airplane',
    region: 'canada',
};
