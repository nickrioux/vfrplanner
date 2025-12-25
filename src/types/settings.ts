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
    enableLogging: false,
    distanceUnit: 'nm',
    altitudeUnit: 'ft',
    speedUnit: 'kt',
};
