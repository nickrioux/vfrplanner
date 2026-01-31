/**
 * Settings Store - Centralized state for plugin settings
 * Provides reactive settings management with session persistence
 */

import { writable, get, type Writable } from 'svelte/store';
import type { PluginSettings } from '../types/settings';
import { DEFAULT_SETTINGS } from '../types/settings';
import type { VfrConditionThresholds, ConditionPreset } from '../types/conditionThresholds';
import { getThresholdsForPreset } from '../types/conditionThresholds';

/**
 * Settings state interface
 */
export interface SettingsState extends PluginSettings {
    // Settings are flat - no nested state needed
}

/**
 * Create the settings store
 */
function createSettingsStore() {
    const { subscribe, set, update }: Writable<SettingsState> = writable({ ...DEFAULT_SETTINGS });

    return {
        subscribe,

        /**
         * Get current state synchronously
         */
        getState: (): SettingsState => get({ subscribe }),

        /**
         * Reset to default settings
         */
        reset: () => {
            set({ ...DEFAULT_SETTINGS });
        },

        /**
         * Load settings from saved data (e.g., session storage)
         */
        loadSettings: (savedSettings: Partial<PluginSettings>) => {
            update(state => ({
                ...DEFAULT_SETTINGS,
                ...savedSettings,
            }));
        },

        /**
         * Update one or more settings
         */
        updateSettings: (updates: Partial<PluginSettings>) => {
            update(state => ({
                ...state,
                ...updates,
            }));
        },

        /**
         * Update default airspeed
         */
        setDefaultAirspeed: (airspeed: number) => {
            update(state => ({ ...state, defaultAirspeed: airspeed }));
        },

        /**
         * Update default altitude
         */
        setDefaultAltitude: (altitude: number) => {
            update(state => ({ ...state, defaultAltitude: altitude }));
        },

        /**
         * Toggle show labels
         */
        setShowLabels: (show: boolean) => {
            update(state => ({ ...state, showLabels: show }));
        },

        /**
         * Set AirportDB API key
         */
        setAirportDbApiKey: (apiKey: string) => {
            update(state => ({ ...state, airportdbApiKey: apiKey }));
        },

        /**
         * Toggle logging
         */
        setEnableLogging: (enable: boolean) => {
            update(state => ({ ...state, enableLogging: enable }));
        },

        /**
         * Set auto terrain elevation
         */
        setAutoTerrainElevation: (enable: boolean) => {
            update(state => ({ ...state, autoTerrainElevation: enable }));
        },

        /**
         * Set condition preset
         */
        setConditionPreset: (preset: ConditionPreset) => {
            update(state => ({
                ...state,
                conditionPreset: preset,
                // If not custom, update thresholds to match preset
                customThresholds: preset !== 'custom'
                    ? { ...getThresholdsForPreset(preset) }
                    : state.customThresholds,
            }));
        },

        /**
         * Set custom thresholds (also sets preset to 'custom')
         */
        setCustomThresholds: (thresholds: VfrConditionThresholds) => {
            update(state => ({
                ...state,
                conditionPreset: 'custom',
                customThresholds: thresholds,
            }));
        },

        /**
         * Set terrain sample interval
         */
        setTerrainSampleInterval: (interval: number) => {
            update(state => ({ ...state, terrainSampleInterval: interval }));
        },

        /**
         * Set include night flights for VFR window search
         */
        setIncludeNightFlights: (include: boolean) => {
            update(state => ({ ...state, includeNightFlights: include }));
        },

        /**
         * Set max VFR windows
         */
        setMaxVFRWindows: (max: number) => {
            update(state => ({ ...state, maxVFRWindows: max }));
        },

        /**
         * Set aircraft category
         */
        setAircraftCategory: (category: PluginSettings['aircraftCategory']) => {
            update(state => ({ ...state, aircraftCategory: category }));
        },

        /**
         * Set region
         */
        setRegion: (region: PluginSettings['region']) => {
            update(state => ({ ...state, region: region }));
        },
    };
}

// Export singleton instance
export const settingsStore = createSettingsStore();

// Re-export DEFAULT_SETTINGS for convenience
export { DEFAULT_SETTINGS };
