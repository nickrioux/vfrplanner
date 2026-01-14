/**
 * Plugin settings types
 */

export interface PluginSettings {
    // Aircraft defaults
    defaultAirspeed: number; // TAS in knots
    defaultAltitude: number; // feet MSL

    // Display options
    showLabels: boolean;
    allowDrag: boolean;

    // Debug options
    enableLogging: boolean;

    // Terrain profile options
    terrainSampleInterval: number; // NM between terrain elevation samples (1-10)

    // Units (for future use)
    distanceUnit: 'nm' | 'km' | 'mi';
    altitudeUnit: 'ft' | 'm';
    speedUnit: 'kt' | 'kmh' | 'mph';
}

export const DEFAULT_SETTINGS: PluginSettings = {
    defaultAirspeed: 100,
    defaultAltitude: 3000,
    showLabels: false,
    allowDrag: true,
    enableLogging: true,
    terrainSampleInterval: 5, // Sample every 5 NM by default
    distanceUnit: 'nm',
    altitudeUnit: 'ft',
    speedUnit: 'kt',
};
