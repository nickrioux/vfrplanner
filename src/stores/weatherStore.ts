/**
 * Weather Store - Centralized state for weather data and fetching status
 * Extracted from plugin.svelte to improve separation of concerns
 */

import { writable, derived, get, type Writable, type Readable } from 'svelte/store';
import type { WaypointWeather, WeatherAlert, ForecastTimeRange } from '../services/weatherService';
import type { ElevationPoint } from '../services/elevationService';
import type { VFRWindow, MinimumConditionLevel } from '../types/vfrWindow';

/**
 * Weather state interface
 */
export interface WeatherState {
    /** Weather data keyed by waypoint ID */
    weatherData: Map<string, WaypointWeather>;
    /** Weather alerts keyed by waypoint ID */
    weatherAlerts: Map<string, WeatherAlert[]>;
    /** Loading state for weather fetch */
    isLoadingWeather: boolean;
    /** Error message from weather fetch */
    weatherError: string | null;
    /** Warning about weather model (e.g., non-ECMWF model) */
    weatherModelWarning: string | null;
    /** Forecast time range from API */
    forecastRange: ForecastTimeRange | null;
    /** Terrain elevation profile along route */
    elevationProfile: ElevationPoint[];
    /** Whether to adjust forecast for flight time at each waypoint */
    adjustForecastForFlightTime: boolean;
}

/**
 * VFR Window search state interface
 */
export interface VFRWindowState {
    /** Found VFR windows */
    windows: VFRWindow[] | null;
    /** Whether currently searching for windows */
    isSearching: boolean;
    /** Search progress (0-100) */
    progress: number;
    /** Minimum condition level for search */
    minCondition: MinimumConditionLevel;
    /** Error message from search */
    error: string | null;
}

/**
 * Departure time state interface
 */
export interface DepartureTimeState {
    /** Selected departure time (ms timestamp) */
    time: number;
    /** Whether to sync with Windy's timeline */
    syncWithWindy: boolean;
    /** Flag to prevent feedback loops when updating from Windy */
    isUpdatingFromWindy: boolean;
    /** Flag to prevent feedback loops when updating to Windy */
    isUpdatingToWindy: boolean;
}

// Initial states
const initialWeatherState: WeatherState = {
    weatherData: new Map(),
    weatherAlerts: new Map(),
    isLoadingWeather: false,
    weatherError: null,
    weatherModelWarning: null,
    forecastRange: null,
    elevationProfile: [],
    adjustForecastForFlightTime: true,
};

const initialVFRWindowState: VFRWindowState = {
    windows: null,
    isSearching: false,
    progress: 0,
    minCondition: 'marginal',
    error: null,
};

const initialDepartureTimeState: DepartureTimeState = {
    time: Date.now(),
    syncWithWindy: true,
    isUpdatingFromWindy: false,
    isUpdatingToWindy: false,
};

/**
 * Create the weather store
 */
function createWeatherStore() {
    const { subscribe, set, update }: Writable<WeatherState> = writable(initialWeatherState);

    return {
        subscribe,

        /**
         * Set weather data for all waypoints
         */
        setWeatherData: (data: Map<string, WaypointWeather>) => {
            update(state => ({ ...state, weatherData: data }));
        },

        /**
         * Set weather alerts for all waypoints
         */
        setWeatherAlerts: (alerts: Map<string, WeatherAlert[]>) => {
            update(state => ({ ...state, weatherAlerts: alerts }));
        },

        /**
         * Set loading state
         */
        setLoading: (isLoading: boolean) => {
            update(state => ({ ...state, isLoadingWeather: isLoading }));
        },

        /**
         * Set error message
         */
        setError: (error: string | null) => {
            update(state => ({ ...state, weatherError: error }));
        },

        /**
         * Set model warning
         */
        setModelWarning: (warning: string | null) => {
            update(state => ({ ...state, weatherModelWarning: warning }));
        },

        /**
         * Set forecast time range
         */
        setForecastRange: (range: ForecastTimeRange | null) => {
            update(state => ({ ...state, forecastRange: range }));
        },

        /**
         * Set elevation profile
         */
        setElevationProfile: (profile: ElevationPoint[]) => {
            update(state => ({ ...state, elevationProfile: profile }));
        },

        /**
         * Set adjust forecast for flight time option
         */
        setAdjustForecastForFlightTime: (adjust: boolean) => {
            update(state => ({ ...state, adjustForecastForFlightTime: adjust }));
        },

        /**
         * Clear all weather data (reset)
         */
        reset: () => {
            set({
                ...initialWeatherState,
                // Preserve user preferences
                adjustForecastForFlightTime: get({ subscribe }).adjustForecastForFlightTime,
            });
        },

        /**
         * Get current state (non-reactive)
         */
        getState: (): WeatherState => get({ subscribe }),
    };
}

/**
 * Create the VFR window search store
 */
function createVFRWindowStore() {
    const { subscribe, set, update }: Writable<VFRWindowState> = writable(initialVFRWindowState);

    return {
        subscribe,

        /**
         * Set found windows
         */
        setWindows: (windows: VFRWindow[] | null) => {
            update(state => ({ ...state, windows }));
        },

        /**
         * Set searching state
         */
        setSearching: (isSearching: boolean) => {
            update(state => ({ ...state, isSearching }));
        },

        /**
         * Set search progress
         */
        setProgress: (progress: number) => {
            update(state => ({ ...state, progress }));
        },

        /**
         * Set minimum condition level
         */
        setMinCondition: (minCondition: MinimumConditionLevel) => {
            update(state => ({ ...state, minCondition }));
        },

        /**
         * Set error message
         */
        setError: (error: string | null) => {
            update(state => ({ ...state, error }));
        },

        /**
         * Reset search state
         */
        reset: () => {
            set({
                ...initialVFRWindowState,
                // Preserve user preference
                minCondition: get({ subscribe }).minCondition,
            });
        },

        /**
         * Get current state (non-reactive)
         */
        getState: (): VFRWindowState => get({ subscribe }),
    };
}

/**
 * Create the departure time store
 */
function createDepartureTimeStore() {
    const { subscribe, set, update }: Writable<DepartureTimeState> = writable(initialDepartureTimeState);

    return {
        subscribe,

        /**
         * Set departure time
         */
        setTime: (time: number) => {
            update(state => ({ ...state, time }));
        },

        /**
         * Set sync with Windy option
         */
        setSyncWithWindy: (sync: boolean) => {
            update(state => ({ ...state, syncWithWindy: sync }));
        },

        /**
         * Set updating from Windy flag
         */
        setUpdatingFromWindy: (updating: boolean) => {
            update(state => ({ ...state, isUpdatingFromWindy: updating }));
        },

        /**
         * Set updating to Windy flag
         */
        setUpdatingToWindy: (updating: boolean) => {
            update(state => ({ ...state, isUpdatingToWindy: updating }));
        },

        /**
         * Reset to current time
         */
        resetToNow: () => {
            update(state => ({ ...state, time: Date.now() }));
        },

        /**
         * Get current state (non-reactive)
         */
        getState: (): DepartureTimeState => get({ subscribe }),
    };
}

// Create singleton store instances
export const weatherStore = createWeatherStore();
export const vfrWindowStore = createVFRWindowStore();
export const departureTimeStore = createDepartureTimeStore();

// Derived stores for convenient access
export const weatherData: Readable<Map<string, WaypointWeather>> = derived(
    weatherStore,
    $state => $state.weatherData
);

export const weatherAlerts: Readable<Map<string, WeatherAlert[]>> = derived(
    weatherStore,
    $state => $state.weatherAlerts
);

export const isLoadingWeather: Readable<boolean> = derived(
    weatherStore,
    $state => $state.isLoadingWeather
);

export const weatherError: Readable<string | null> = derived(
    weatherStore,
    $state => $state.weatherError
);

export const forecastRange: Readable<ForecastTimeRange | null> = derived(
    weatherStore,
    $state => $state.forecastRange
);

export const elevationProfile: Readable<ElevationPoint[]> = derived(
    weatherStore,
    $state => $state.elevationProfile
);

export const hasAnyAlerts: Readable<boolean> = derived(
    weatherStore,
    $state => $state.weatherAlerts.size > 0
);

export const vfrWindows: Readable<VFRWindow[] | null> = derived(
    vfrWindowStore,
    $state => $state.windows
);

export const isSearchingWindows: Readable<boolean> = derived(
    vfrWindowStore,
    $state => $state.isSearching
);

export const departureTime: Readable<number> = derived(
    departureTimeStore,
    $state => $state.time
);
