/**
 * Plugin settings types
 */

import type { VfrConditionThresholds, ConditionPreset, AircraftCategory, Region } from './conditionThresholds';
import { STANDARD_THRESHOLDS } from './conditionThresholds';
import type { LLMProvider } from './llm';

export interface AircraftPerformance {
    cruiseTAS: number;        // True Airspeed in knots
    cruiseAltitude: number;   // Cruise altitude ft MSL
    rateOfClimb: number;      // fpm
    rateOfDescent: number;    // fpm
    climbSpeed: number;       // KIAS
    descentSpeed: number;     // KIAS
}

export const DEFAULT_AIRCRAFT_PERFORMANCE: AircraftPerformance = {
    cruiseTAS: 100,
    cruiseAltitude: 3000,
    rateOfClimb: 500,
    rateOfDescent: 500,
    climbSpeed: 80,
    descentSpeed: 90,
};

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

    // Route weather sampling
    weatherSampleEnabled: boolean;    // Opt-in route weather sampling
    weatherSampleInterval: number;    // NM between samples (5-50)
    weatherSampleShowDots: boolean;   // Debug: show sample points on map

    // Aircraft category and region
    aircraftCategory: AircraftCategory;
    region: Region;

    // Aircraft performance
    aircraftPerformance: AircraftPerformance;

    // LLM / AI settings
    llmEnabled: boolean;
    llmApiKey: string;
    llmModel: string;  // model ID or 'openrouter/auto' for auto-routing
    llmProvider: LLMProvider;
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
    weatherSampleEnabled: false,
    weatherSampleInterval: 15,
    weatherSampleShowDots: false,
    aircraftCategory: 'airplane',
    region: 'canada',
    aircraftPerformance: { ...DEFAULT_AIRCRAFT_PERFORMANCE },

    // LLM / AI defaults
    llmEnabled: false,
    llmApiKey: '',
    llmModel: 'openrouter/auto',
    llmProvider: 'openrouter',
};
