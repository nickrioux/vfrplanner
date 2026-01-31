/**
 * Weather Controller - Business logic for weather fetching and VFR window detection
 * Extracted from plugin.svelte to improve separation of concerns
 */

import { get } from 'svelte/store';
import store from '@windy/store';
import type { Products } from '@windy/rootScope';

import { routeStore } from '../stores/routeStore';
import {
    weatherStore,
    vfrWindowStore,
    departureTimeStore,
} from '../stores/weatherStore';
import { settingsStore } from '../stores/settingsStore';

import {
    fetchFlightPlanWeather,
    checkWeatherAlerts,
    getForecastTimeRange,
    isEcmwfModel,
    getCurrentModelName,
    DEFAULT_ALERT_THRESHOLDS,
    type WaypointWeather,
    type WeatherAlert,
} from '../services/weatherService';

import { fetchRouteElevationProfile } from '../services/elevationService';
import { findVFRWindows, type VFRWindow } from '../services/vfrWindowService';
import { getActiveThresholds } from '../services/vfrConditionRules';
import { calculateGroundSpeed, calculateHeadwindComponent } from '../services/navigationCalc';
import { logger } from '../services/logger';

import type { PluginSettings } from '../types';
import type { Waypoint, FlightPlan } from '../types/flightPlan';

/**
 * Dependencies needed by the weather controller
 * These are injected to avoid tight coupling with plugin.svelte
 */
export interface WeatherControllerDeps {
    /** Plugin name for API calls */
    pluginName: string;
    /** Callback to update map layers after weather fetch */
    onMapUpdate?: () => void;
    /** Callback to save session after weather fetch */
    onSaveSession?: () => void;
}

let deps: WeatherControllerDeps | null = null;

/**
 * Initialize the weather controller with dependencies
 */
export function initWeatherController(dependencies: WeatherControllerDeps): void {
    deps = dependencies;
}

/**
 * Check if controller is initialized
 */
function ensureInitialized(): WeatherControllerDeps {
    if (!deps) {
        throw new Error('Weather controller not initialized. Call initWeatherController first.');
    }
    return deps;
}

/**
 * Fetch weather for the current flight plan
 * Main entry point for weather data fetching
 */
export async function fetchWeatherForRoute(): Promise<void> {
    const { pluginName, onMapUpdate, onSaveSession } = ensureInitialized();
    const settings = settingsStore.getState();

    const routeState = routeStore.getState();
    const { flightPlan } = routeState;

    if (!flightPlan) {
        logger.debug('[WeatherController] No flight plan, skipping weather fetch');
        return;
    }

    weatherStore.setLoading(true);
    weatherStore.setError(null);
    weatherStore.setModelWarning(null);

    // Check if ECMWF model is selected - inform user about data sources
    if (!isEcmwfModel()) {
        const modelName = getCurrentModelName();
        weatherStore.setModelWarning(
            `Using ${modelName} for surface data, ECMWF for ceiling and altitude winds.`
        );
    }

    try {
        // Get forecast time range if not already loaded
        const currentState = weatherStore.getState();
        let forecastRange = currentState.forecastRange;

        if (!forecastRange && flightPlan.waypoints.length > 0) {
            const firstWp = flightPlan.waypoints[0];
            forecastRange = await getForecastTimeRange(firstWp.lat, firstWp.lon);
            weatherStore.setForecastRange(forecastRange);

            // Initialize departure time
            if (forecastRange) {
                const depState = departureTimeStore.getState();
                if (depState.syncWithWindy) {
                    // If sync is enabled, use Windy's current timestamp
                    const windyTimestamp = store.get('timestamp') as number;
                    if (windyTimestamp) {
                        const clampedTime = Math.max(
                            forecastRange.start,
                            Math.min(windyTimestamp, forecastRange.end)
                        );
                        departureTimeStore.setTime(clampedTime);
                    } else {
                        // Fallback to now if Windy timestamp not available
                        const now = Date.now();
                        const clampedTime = Math.max(
                            forecastRange.start,
                            Math.min(now, forecastRange.end)
                        );
                        departureTimeStore.setTime(clampedTime);
                    }
                } else {
                    // If sync is disabled, use current time
                    const now = Date.now();
                    const clampedTime = Math.max(
                        forecastRange.start,
                        Math.min(now, forecastRange.end)
                    );
                    departureTimeStore.setTime(clampedTime);
                }
            }
        }

        // Get departure time for weather fetch
        const departureTime = departureTimeStore.getState().time;
        const adjustForFlightTime = weatherStore.getState().adjustForecastForFlightTime;

        // Use the planned altitude for wind data
        const plannedAltitude = flightPlan.aircraft.defaultAltitude;

        // Fetch weather with timeout
        const weatherFetchPromise = fetchFlightPlanWeather(
            flightPlan.waypoints,
            pluginName,
            departureTime,
            plannedAltitude,
            settings.enableLogging,
            adjustForFlightTime
        );

        const overallTimeout = new Promise<Map<string, WaypointWeather>>((_, reject) => {
            setTimeout(() => {
                reject(new Error('Weather fetch operation timed out after 60 seconds'));
            }, 60000);
        });

        const weatherData = await Promise.race([weatherFetchPromise, overallTimeout]);
        weatherStore.setWeatherData(weatherData);

        if (settings.enableLogging) {
            logger.debug(
                `[WeatherController] Weather fetch complete: ${weatherData.size} waypoints with weather data`
            );
            logWeatherDetails(weatherData, flightPlan);
        }

        // Check for alerts at each waypoint
        const weatherAlerts = calculateWeatherAlerts(
            weatherData,
            flightPlan.waypoints,
            plannedAltitude
        );
        weatherStore.setWeatherAlerts(weatherAlerts);

        // Fetch terrain elevation profile along the route
        await fetchElevationProfile(flightPlan, settings);

        // Recalculate navigation with wind corrections
        recalculateWithWind(flightPlan, weatherData, settings);

        // Notify plugin to update map layers
        onMapUpdate?.();
    } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to fetch weather';
        weatherStore.setError(errorMessage);
        logger.error('[WeatherController] Error fetching weather:', err);

        // Ensure weatherData is at least an empty Map on error
        const currentData = weatherStore.getState().weatherData;
        if (!currentData || currentData.size === 0) {
            weatherStore.setWeatherData(new Map());
        }
    } finally {
        weatherStore.setLoading(false);
    }
}

/**
 * Calculate weather alerts for all waypoints
 */
function calculateWeatherAlerts(
    weatherData: Map<string, WaypointWeather>,
    waypoints: Waypoint[],
    plannedAltitude: number
): Map<string, WeatherAlert[]> {
    const alerts = new Map<string, WeatherAlert[]>();
    const waypointCount = waypoints.length;

    weatherData.forEach((wx, waypointId) => {
        // Determine if this is a terminal waypoint (first or last)
        const waypointIndex = waypoints.findIndex(wp => wp.id === waypointId);
        const isTerminal = waypointIndex === 0 || waypointIndex === waypointCount - 1;
        const waypointAlerts = checkWeatherAlerts(
            wx,
            DEFAULT_ALERT_THRESHOLDS,
            plannedAltitude,
            isTerminal
        );
        if (waypointAlerts.length > 0) {
            alerts.set(waypointId, waypointAlerts);
        }
    });

    return alerts;
}

/**
 * Fetch elevation profile for the route
 */
async function fetchElevationProfile(
    flightPlan: FlightPlan,
    settings: PluginSettings
): Promise<void> {
    try {
        if (settings.enableLogging) {
            logger.debug(
                `[WeatherController] Fetching terrain elevation profile (sampling every ${settings.terrainSampleInterval} NM)...`
            );
        }
        const profile = await fetchRouteElevationProfile(
            flightPlan.waypoints,
            settings.terrainSampleInterval,
            settings.enableLogging
        );
        weatherStore.setElevationProfile(profile);

        if (settings.enableLogging) {
            logger.debug(`[WeatherController] Terrain profile: ${profile.length} elevation points`);
        }
    } catch (elevError) {
        logger.error('[WeatherController] Error fetching elevation profile:', elevError);
        weatherStore.setElevationProfile([]); // Continue without terrain data
    }
}

/**
 * Recalculate navigation with wind corrections
 */
function recalculateWithWind(
    flightPlan: FlightPlan,
    weatherData: Map<string, WaypointWeather>,
    settings: PluginSettings
): void {
    logger.debug('=== FLIGHT TIME CALCULATION WITH WIND ===');
    logger.debug(`TAS (True Airspeed): ${settings.defaultAirspeed} kt`);
    logger.debug(`Default Cruise Altitude: ${settings.defaultAltitude} ft`);
    logger.debug('NOTE: All tracks and wind directions are in TRUE NORTH reference');
    logger.debug('');

    // Debug: Show all wind data for each waypoint
    if (settings.enableLogging) {
        logWindDataByWaypoint(flightPlan.waypoints, weatherData);
    }

    // Recalculate ground speed for each leg with wind correction
    const updatedWaypoints = flightPlan.waypoints.map((wp, index) => {
        if (index === 0) return wp;

        const prevWp = flightPlan.waypoints[index - 1];
        const wx = weatherData.get(wp.id);

        if (wx && wp.bearing !== undefined) {
            // Calculate ground speed with wind correction
            const gs = calculateGroundSpeed(
                settings.defaultAirspeed,
                wp.bearing,
                wx.windDir,
                wx.windSpeed
            );

            // Recalculate ETE with ground speed
            const distance = wp.distance || 0;
            const ete = gs > 0 ? (distance / gs) * 60 : 0; // minutes

            if (settings.enableLogging) {
                const headwind = calculateHeadwindComponent(wp.bearing, wx.windDir, wx.windSpeed);
                logger.debug(`LEG ${index}: ${prevWp.name || 'WPT'} → ${wp.name || 'WPT'}`);
                logger.debug(`  Distance: ${distance.toFixed(1)} NM`);
                logger.debug(`  Track (TRUE): ${wp.bearing.toFixed(0)}°`);
                logger.debug(`  Wind (TRUE): ${wx.windDir.toFixed(0)}° @ ${wx.windSpeed.toFixed(0)} kt`);
                logger.debug(`  Headwind component: ${headwind.toFixed(0)} kt`);
                logger.debug(`  Ground Speed: ${gs.toFixed(0)} kt`);
                logger.debug(`  ETE: ${ete.toFixed(1)} min`);
            }

            return { ...wp, groundSpeed: gs, ete };
        }

        return wp;
    });

    // Update the route store with corrected waypoints
    const updates = new Map<string, Partial<Waypoint>>();
    updatedWaypoints.forEach((wp, index) => {
        if (index > 0 && wp.groundSpeed !== undefined) {
            updates.set(wp.id, { groundSpeed: wp.groundSpeed, ete: wp.ete });
        }
    });

    if (updates.size > 0) {
        routeStore.updateWaypoints(updates);
    }
}

/**
 * Log detailed weather data for debugging
 */
function logWeatherDetails(
    weatherData: Map<string, WaypointWeather>,
    flightPlan: FlightPlan
): void {
    if (weatherData.size > 0) {
        logger.debug(`[WeatherController] Weather data keys:`, Array.from(weatherData.keys()));
        weatherData.forEach((wx, waypointId) => {
            const wp = flightPlan.waypoints.find(w => w.id === waypointId);
            logger.debug(`[WeatherController] Weather for ${wp?.name || waypointId}:`, {
                wind: `${Math.round(wx.windDir)}° @ ${Math.round(wx.windSpeed)} kt`,
                gust: wx.windGust ? `${Math.round(wx.windGust)} kt` : 'none',
                temp: `${Math.round(wx.temperature)}°C`,
                cloudBase: wx.cloudBase ? `${Math.round(wx.cloudBase)}m AGL` : 'clear',
                visibility: wx.visibility ? `${wx.visibility.toFixed(1)} km` : 'N/A',
                pressure: wx.pressure ? `${Math.round(wx.pressure)} hPa` : 'N/A',
                windAltitude: wx.windAltitude ? `${wx.windAltitude} ft` : 'surface',
            });
        });
    }
}

/**
 * Log wind data by waypoint for debugging
 */
function logWindDataByWaypoint(
    waypoints: Waypoint[],
    weatherData: Map<string, WaypointWeather>
): void {
    logger.debug('=== WIND DATA BY WAYPOINT ===');
    waypoints.forEach((wp, idx) => {
        const wx = weatherData.get(wp.id);
        if (wx) {
            logger.debug(`WP${idx} ${wp.name || 'UNNAMED'} (alt: ${wp.altitude || 'N/A'} ft):`);
            logger.debug(`  Wind reported: ${wx.windDir?.toFixed(0)}° @ ${wx.windSpeed?.toFixed(0)} kt`);
            logger.debug(`  Wind level used: ${wx.windLevel || 'unknown'}`);
            logger.debug(`  Wind altitude: ${wx.windAltitude || 'surface'} ft`);
            if (wx.verticalWinds && wx.verticalWinds.length > 0) {
                logger.debug(`  Vertical wind profile:`);
                wx.verticalWinds.forEach(vw => {
                    logger.debug(
                        `    ${vw.level} (${vw.altitudeFeet} ft): ${vw.windDir.toFixed(0)}° @ ${vw.windSpeed.toFixed(0)} kt`
                    );
                });
            }
        } else {
            logger.debug(`WP${idx} ${wp.name || 'UNNAMED'}: No weather data`);
        }
    });
    logger.debug('');
}

/**
 * Search for VFR windows where conditions are acceptable along the entire route
 */
export async function searchVFRWindows(): Promise<void> {
    ensureInitialized();
    const settings = settingsStore.getState();

    const routeState = routeStore.getState();
    const { flightPlan } = routeState;

    if (!flightPlan || flightPlan.waypoints.length < 2) {
        vfrWindowStore.setError('Need at least 2 waypoints to search for VFR windows');
        return;
    }

    if (flightPlan.totals.ete <= 0) {
        vfrWindowStore.setError('Cannot search without valid flight time (ETE)');
        return;
    }

    vfrWindowStore.setSearching(true);
    vfrWindowStore.setProgress(0);
    vfrWindowStore.setError(null);
    vfrWindowStore.setWindows(null);

    try {
        const vfrState = vfrWindowStore.getState();
        const searchThresholds = getActiveThresholds(settings);

        const result = await findVFRWindows(
            flightPlan.waypoints,
            flightPlan.aircraft.defaultAltitude,
            flightPlan.totals.ete,
            {
                minimumCondition: vfrState.minCondition,
                maxConcurrent: 4,
                maxWindows: settings.maxVFRWindows,
                startFrom: Date.now(), // Always start search from now
                collectDetailedData: settings.enableLogging,
                includeNightFlights: settings.includeNightFlights,
                routeCoordinates: {
                    lat: flightPlan.waypoints[0].lat,
                    lon: flightPlan.waypoints[0].lon,
                },
                thresholds: searchThresholds,
            },
            (progress) => {
                vfrWindowStore.setProgress(progress);
            },
            settings.enableLogging
        );

        vfrWindowStore.setWindows(result.windows);

        if (result.windows.length === 0) {
            if (result.limitedBy) {
                vfrWindowStore.setError(result.limitedBy);
            } else {
                const conditionLabel =
                    vfrState.minCondition === 'good' ? 'good' : 'acceptable';
                vfrWindowStore.setError(
                    `No ${conditionLabel} VFR windows found in forecast period`
                );
            }
        }

        if (settings.enableLogging) {
            logger.debug('[WeatherController] VFR window search complete:', result);
        }
    } catch (err) {
        logger.error('[WeatherController] Error searching for VFR windows:', err);
        vfrWindowStore.setError(
            err instanceof Error ? err.message : 'Error searching for VFR windows'
        );
    } finally {
        vfrWindowStore.setSearching(false);
    }
}

/**
 * Use a found VFR window by setting the departure time to its start
 */
export async function useVFRWindow(window: VFRWindow): Promise<void> {
    const { onSaveSession } = ensureInitialized();

    departureTimeStore.setTime(window.startTime);

    // Update Windy's timeline to show weather at this time on the map
    // Set flag to avoid triggering feedback loop
    departureTimeStore.setUpdatingToWindy(true);
    try {
        store.set('timestamp', window.startTime);
    } finally {
        setTimeout(() => {
            departureTimeStore.setUpdatingToWindy(false);
        }, 100);
    }

    // Refresh weather data for the route panel with the new departure time
    const routeState = routeStore.getState();
    if (routeState.flightPlan) {
        await fetchWeatherForRoute();
        onSaveSession?.();
    }
}

/**
 * Handle departure time change from UI
 */
export async function handleDepartureTimeChange(newTime: number): Promise<void> {
    const depState = departureTimeStore.getState();

    // Don't update if we're in the middle of syncing from Windy
    if (depState.isUpdatingFromWindy) {
        return;
    }

    departureTimeStore.setTime(newTime);

    // Update Windy's timeline if sync is enabled
    if (depState.syncWithWindy) {
        departureTimeStore.setUpdatingToWindy(true);
        try {
            store.set('timestamp', newTime);
        } finally {
            setTimeout(() => {
                departureTimeStore.setUpdatingToWindy(false);
            }, 100);
        }
    }
}

/**
 * Handle Windy timestamp change (sync from Windy to plugin)
 */
export function handleWindyTimestampChange(windyTimestamp: number): void {
    const depState = departureTimeStore.getState();

    // Don't update if we're the ones who changed it or if sync is disabled
    if (depState.isUpdatingToWindy || !depState.syncWithWindy) {
        return;
    }

    // Clamp to forecast range
    const weatherState = weatherStore.getState();
    const { forecastRange } = weatherState;

    let clampedTime = windyTimestamp;
    if (forecastRange) {
        clampedTime = Math.max(forecastRange.start, Math.min(windyTimestamp, forecastRange.end));
    }

    departureTimeStore.setUpdatingFromWindy(true);
    departureTimeStore.setTime(clampedTime);

    setTimeout(() => {
        departureTimeStore.setUpdatingFromWindy(false);
    }, 100);
}

/**
 * Toggle sync with Windy
 */
export function toggleWindySync(): void {
    const depState = departureTimeStore.getState();
    departureTimeStore.setSyncWithWindy(!depState.syncWithWindy);

    // If enabling sync, immediately sync to Windy's current timestamp
    if (!depState.syncWithWindy) {
        const windyTimestamp = store.get('timestamp') as number;
        if (windyTimestamp) {
            handleWindyTimestampChange(windyTimestamp);
        }
    }
}

/**
 * Reset all weather state (call when flight plan changes)
 */
export function resetWeatherState(): void {
    weatherStore.reset();
    vfrWindowStore.reset();
    departureTimeStore.resetToNow();
    logger.debug('[WeatherController] Weather state reset');
}

/**
 * Check if there are any weather alerts
 */
export function hasAnyAlerts(): boolean {
    return weatherStore.getState().weatherAlerts.size > 0;
}
