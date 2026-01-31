/**
 * Route Controller - Business logic for flight plan management
 * Handles file parsing, waypoint operations, and route manipulation
 */

import { tick } from 'svelte';
import { routeStore, type RouteSettings } from '../stores/routeStore';
import { weatherStore } from '../stores/weatherStore';
import { readFPLFile, convertToFlightPlan, validateFPL } from '../parsers/fplParser';
import { readGPXFile } from '../parsers/gpxParser';
import { calculateFlightPlanNavigation } from '../services/navigationCalc';
import { fetchPointElevation } from '../services/elevationService';
import {
    airportToWaypoint,
    navaidToWaypoint,
    type AirportDBResult,
    type AirportDBNavaid,
} from '../services/airportdbService';
import { logger } from '../services/logger';
import type { FlightPlan, Waypoint, PluginSettings } from '../types';
import type { IAirportProvider, AirportSearchResult } from '../services/airportProvider';

/**
 * Dependencies for the route controller
 */
export interface RouteControllerDeps {
    getSettings: () => PluginSettings;
    getAirportProvider: () => IAirportProvider;
    onMapUpdate: () => void;
    onSaveSession: () => void;
    onResetWeather: () => void;
}

let deps: RouteControllerDeps | null = null;

/**
 * Initialize the route controller with dependencies
 */
export function initRouteController(dependencies: RouteControllerDeps): void {
    deps = dependencies;
}

/**
 * Get current settings from dependencies
 */
function getSettings(): PluginSettings {
    if (!deps) throw new Error('Route controller not initialized');
    return deps.getSettings();
}

/**
 * Get airport provider from dependencies
 */
function getAirportProvider(): IAirportProvider {
    if (!deps) throw new Error('Route controller not initialized');
    return deps.getAirportProvider();
}

/**
 * Load a flight plan from a file (.fpl or .gpx)
 */
export async function loadFlightPlanFile(file: File): Promise<{ success: boolean; error?: string }> {
    if (!deps) return { success: false, error: 'Route controller not initialized' };

    const settings = getSettings();
    const airportProvider = getAirportProvider();

    // Validate file size (max 10MB)
    const MAX_FILE_SIZE = 10 * 1024 * 1024;
    if (file.size > MAX_FILE_SIZE) {
        return { success: false, error: 'File too large (max 10MB)' };
    }

    try {
        let plan: FlightPlan;

        // Detect file type by extension
        const isGPX = file.name.toLowerCase().endsWith('.gpx');

        if (isGPX) {
            // Parse GPX file
            const gpxResult = await readGPXFile(file);

            if (!gpxResult.success || !gpxResult.flightPlan) {
                return { success: false, error: gpxResult.error || 'Failed to parse GPX file' };
            }

            plan = gpxResult.flightPlan;
        } else {
            // Parse FPL file
            const fplResult = await readFPLFile(file);

            if (!fplResult.success || !fplResult.flightPlan) {
                return { success: false, error: fplResult.error || 'Failed to parse file' };
            }

            const validation = validateFPL(fplResult.flightPlan);
            if (!validation.valid) {
                return { success: false, error: validation.errors.map(e => e.message).join(', ') };
            }

            // Convert to internal format
            plan = convertToFlightPlan(fplResult.flightPlan, file.name);
        }

        // Apply settings
        plan.aircraft.airspeed = settings.defaultAirspeed;
        plan.aircraft.defaultAltitude = settings.defaultAltitude;

        // Auto-set terrain elevation for departure/arrival if enabled
        if (settings.autoTerrainElevation && plan.waypoints.length >= 1) {
            // Fetch departure elevation
            const departureWp = plan.waypoints[0];
            const departureElevation = await fetchPointElevation(departureWp.lat, departureWp.lon, settings.enableLogging);
            if (departureElevation !== undefined) {
                plan.waypoints[0] = { ...departureWp, altitude: departureElevation };
                if (settings.enableLogging) {
                    logger.debug(`[RouteController] Set departure ${departureWp.name} elevation to ${departureElevation}ft`);
                }
            }

            // Fetch arrival elevation (if different from departure)
            if (plan.waypoints.length >= 2) {
                const arrivalWp = plan.waypoints[plan.waypoints.length - 1];
                const arrivalElevation = await fetchPointElevation(arrivalWp.lat, arrivalWp.lon, settings.enableLogging);
                if (arrivalElevation !== undefined) {
                    plan.waypoints[plan.waypoints.length - 1] = { ...arrivalWp, altitude: arrivalElevation };
                    if (settings.enableLogging) {
                        logger.debug(`[RouteController] Set arrival ${arrivalWp.name} elevation to ${arrivalElevation}ft`);
                    }
                }
            }
        }

        // Fetch runway data for departure/arrival airports
        if (settings.enableLogging) {
            logger.debug(`[RouteController] Provider: ${airportProvider.getSourceName()}, waypoints: ${plan.waypoints.length}`);
        }

        if (plan.waypoints.length >= 1) {
            // Fetch departure runway data
            const departureWp = plan.waypoints[0];
            if (departureWp.type === 'AIRPORT' && !departureWp.runways) {
                try {
                    const airportData = await airportProvider.searchByIcao(departureWp.name);
                    if (airportData?.runways && airportData.runways.length > 0) {
                        plan.waypoints[0] = { ...plan.waypoints[0], runways: airportData.runways };
                        if (settings.enableLogging) {
                            logger.debug(`[RouteController] Loaded ${airportData.runways.length} runways for departure ${departureWp.name}`);
                        }
                    }
                } catch (err) {
                    if (settings.enableLogging) {
                        logger.warn(`[RouteController] Could not fetch runway data for ${departureWp.name}:`, err);
                    }
                }
            }

            // Fetch arrival runway data (if different from departure)
            if (plan.waypoints.length >= 2) {
                const arrivalWp = plan.waypoints[plan.waypoints.length - 1];
                if (arrivalWp.type === 'AIRPORT' && !arrivalWp.runways && arrivalWp.name !== plan.waypoints[0].name) {
                    try {
                        const airportData = await airportProvider.searchByIcao(arrivalWp.name);
                        if (airportData?.runways && airportData.runways.length > 0) {
                            plan.waypoints[plan.waypoints.length - 1] = { ...plan.waypoints[plan.waypoints.length - 1], runways: airportData.runways };
                            if (settings.enableLogging) {
                                logger.debug(`[RouteController] Loaded ${airportData.runways.length} runways for arrival ${arrivalWp.name}`);
                            }
                        }
                    } catch (err) {
                        if (settings.enableLogging) {
                            logger.warn(`[RouteController] Could not fetch runway data for ${arrivalWp.name}:`, err);
                        }
                    }
                }
            }
        }

        // Calculate navigation data
        const navResult = calculateFlightPlanNavigation(plan.waypoints, plan.aircraft.airspeed);
        plan = {
            ...plan,
            waypoints: navResult.waypoints,
            totals: navResult.totals,
        };

        // Reset weather state before loading new plan
        deps.onResetWeather();

        // Set flight plan using store
        routeStore.setFlightPlan(plan);

        // Wait for reactive updates to propagate before updating map
        await tick();
        deps.onMapUpdate();
        deps.onSaveSession();

        return { success: true };
    } catch (err) {
        return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
    }
}

/**
 * Clear the current flight plan
 */
export function clearFlightPlan(): void {
    if (!deps) return;

    routeStore.clearFlightPlan();
    deps.onResetWeather();
    deps.onSaveSession();
}

/**
 * Create a new empty flight plan
 */
export async function createNewFlightPlan(): Promise<void> {
    if (!deps) return;

    const settings = getSettings();
    const routeSettings: RouteSettings = {
        defaultAirspeed: settings.defaultAirspeed,
        defaultAltitude: settings.defaultAltitude,
    };

    routeStore.createNew(routeSettings);
    deps.onResetWeather();

    // Wait for reactive updates to propagate before updating map
    await tick();
    deps.onMapUpdate();
    deps.onSaveSession();
}

/**
 * Add an airport to the flight plan
 */
export async function addAirportToFlightPlan(airport: AirportDBResult): Promise<{ success: boolean; error?: string }> {
    if (!deps) return { success: false, error: 'Route controller not initialized' };

    const settings = getSettings();
    const currentPlan = routeStore.getState().flightPlan;

    if (!currentPlan) {
        // Create new flight plan if none exists
        await createNewFlightPlan();
    }

    const planAfterCreate = routeStore.getState().flightPlan;
    if (!planAfterCreate) return { success: false, error: 'Failed to create flight plan' };

    const waypoint = airportToWaypoint(airport);

    // Check if already in flight plan
    if (planAfterCreate.waypoints.some(wp => wp.name === waypoint.name)) {
        return { success: false, error: `${waypoint.name} is already in the flight plan` };
    }

    const isFirstWaypoint = planAfterCreate.waypoints.length === 0;
    const previousArrivalId = planAfterCreate.waypoints.length > 1
        ? planAfterCreate.waypoints[planAfterCreate.waypoints.length - 1].id
        : null;

    // Handle terrain elevation for new waypoint
    if (settings.autoTerrainElevation) {
        if (!waypoint.altitude || waypoint.altitude === 0) {
            const terrainElevation = await fetchPointElevation(waypoint.lat, waypoint.lon, settings.enableLogging);
            if (terrainElevation !== undefined) {
                waypoint.altitude = terrainElevation;
                waypoint.elevation = terrainElevation;
            }
        }
        if (settings.enableLogging) {
            logger.debug(`[RouteController] ${isFirstWaypoint ? 'Departure' : 'Arrival'} ${waypoint.name}: ${waypoint.altitude} ft`);
        }
    }

    // Add new waypoint using store
    routeStore.addWaypoint(waypoint);

    // Update previous arrival to cruising altitude if needed
    if (settings.autoTerrainElevation && previousArrivalId) {
        const updatedPlan = routeStore.getState().flightPlan;
        if (updatedPlan) {
            const previousArrival = updatedPlan.waypoints.find(wp => wp.id === previousArrivalId);
            if (previousArrival && previousArrival.altitude !== undefined && previousArrival.altitude < settings.defaultAltitude) {
                routeStore.updateWaypoint(previousArrivalId, { altitude: settings.defaultAltitude });
                if (settings.enableLogging) {
                    logger.debug(`[RouteController] Previous arrival ${previousArrival.name} now middle waypoint: ${settings.defaultAltitude} ft`);
                }
            }
        }
    }

    // Wait for reactive updates to propagate before updating map
    await tick();
    deps.onMapUpdate();
    deps.onSaveSession();

    return { success: true };
}

/**
 * Add a navaid to the flight plan
 */
export async function addNavaidToFlightPlan(navaid: AirportDBNavaid): Promise<{ success: boolean; error?: string }> {
    if (!deps) return { success: false, error: 'Route controller not initialized' };

    const settings = getSettings();
    const currentPlan = routeStore.getState().flightPlan;

    if (!currentPlan) {
        await createNewFlightPlan();
    }

    const planAfterCreate = routeStore.getState().flightPlan;
    if (!planAfterCreate) return { success: false, error: 'Failed to create flight plan' };

    const waypoint = navaidToWaypoint(navaid);

    // Check if already in flight plan
    if (planAfterCreate.waypoints.some(wp => wp.name === waypoint.name)) {
        return { success: false, error: `${waypoint.name} is already in the flight plan` };
    }

    const isFirstWaypoint = planAfterCreate.waypoints.length === 0;
    const previousArrivalId = planAfterCreate.waypoints.length > 1
        ? planAfterCreate.waypoints[planAfterCreate.waypoints.length - 1].id
        : null;

    // Handle terrain elevation for new waypoint
    if (settings.autoTerrainElevation) {
        if (!waypoint.altitude || waypoint.altitude === 0) {
            const terrainElevation = await fetchPointElevation(waypoint.lat, waypoint.lon, settings.enableLogging);
            if (terrainElevation !== undefined) {
                waypoint.altitude = terrainElevation;
                waypoint.elevation = terrainElevation;
            }
        }
        if (settings.enableLogging) {
            logger.debug(`[RouteController] ${isFirstWaypoint ? 'Departure' : 'Arrival'} ${waypoint.name}: ${waypoint.altitude} ft`);
        }
    }

    // Add new waypoint using store
    routeStore.addWaypoint(waypoint);

    // Update previous arrival to cruising altitude if needed
    if (settings.autoTerrainElevation && previousArrivalId) {
        const updatedPlan = routeStore.getState().flightPlan;
        if (updatedPlan) {
            const previousArrival = updatedPlan.waypoints.find(wp => wp.id === previousArrivalId);
            if (previousArrival && previousArrival.altitude !== undefined && previousArrival.altitude < settings.defaultAltitude) {
                routeStore.updateWaypoint(previousArrivalId, { altitude: settings.defaultAltitude });
                if (settings.enableLogging) {
                    logger.debug(`[RouteController] Previous arrival ${previousArrival.name} now middle waypoint: ${settings.defaultAltitude} ft`);
                }
            }
        }
    }

    // Wait for reactive updates to propagate before updating map
    await tick();
    deps.onMapUpdate();
    deps.onSaveSession();

    return { success: true };
}

/**
 * Add a waypoint from map click
 */
export async function addWaypointFromMapClick(lat: number, lon: number): Promise<void> {
    if (!deps) return;

    const settings = getSettings();
    const currentPlan = routeStore.getState().flightPlan;
    if (!currentPlan) return;

    const isFirstWaypoint = currentPlan.waypoints.length === 0;
    const previousArrivalId = currentPlan.waypoints.length > 1
        ? currentPlan.waypoints[currentPlan.waypoints.length - 1].id
        : null;

    // Fetch terrain elevation for departure or arrival waypoints (if setting enabled)
    let altitude: number | undefined;
    if (settings.autoTerrainElevation) {
        altitude = await fetchPointElevation(lat, lon, settings.enableLogging);
        if (settings.enableLogging) {
            logger.debug(`[RouteController] ${isFirstWaypoint ? 'Departure' : 'Arrival'} waypoint terrain elevation: ${altitude ?? 'N/A'} ft`);
        }
    }

    // Create new waypoint with terrain elevation for departure/arrival
    const newWaypoint: Waypoint = {
        id: `wp-${Date.now()}`,
        name: `WPT${currentPlan.waypoints.length + 1}`,
        type: 'USER WAYPOINT',
        lat,
        lon,
        altitude,
    };

    // Add new waypoint using store
    routeStore.addWaypoint(newWaypoint);

    // Update previous arrival to cruising altitude if needed
    if (settings.autoTerrainElevation && previousArrivalId) {
        const updatedPlan = routeStore.getState().flightPlan;
        if (updatedPlan) {
            const previousArrival = updatedPlan.waypoints.find(wp => wp.id === previousArrivalId);
            if (previousArrival && previousArrival.altitude !== undefined && previousArrival.altitude < settings.defaultAltitude) {
                routeStore.updateWaypoint(previousArrivalId, { altitude: settings.defaultAltitude });
                if (settings.enableLogging) {
                    logger.debug(`[RouteController] Previous arrival ${previousArrival.name} now middle waypoint: ${settings.defaultAltitude} ft`);
                }
            }
        }
    }

    // Wait for reactive updates to propagate before updating map
    await tick();
    deps.onMapUpdate();
    deps.onSaveSession();
}

/**
 * Insert a waypoint on a route segment
 */
export async function insertWaypointOnSegment(segmentIndex: number, lat: number, lon: number): Promise<void> {
    if (!deps) return;

    const settings = getSettings();
    const flightPlan = routeStore.getState().flightPlan;
    if (!flightPlan) return;

    // Create a new waypoint at the clicked position with default altitude
    const newWaypoint: Waypoint = {
        id: `wp_${Date.now()}`,
        name: `WP${flightPlan.waypoints.length + 1}`,
        type: 'user',
        lat,
        lon,
        altitude: flightPlan.aircraft.defaultAltitude,
    };

    // Use store to insert waypoint (handles navigation recalculation and selection)
    routeStore.insertWaypointAtSegment(segmentIndex, newWaypoint);

    // Wait for Svelte's reactivity to complete
    await tick();

    if (settings.enableLogging) {
        logger.debug('[RouteController] Inserted waypoint:', newWaypoint.name, 'at', segmentIndex + 1);
    }

    requestAnimationFrame(() => {
        deps?.onMapUpdate();
    });

    deps.onSaveSession();
}

/**
 * Delete a waypoint
 */
export async function deleteWaypoint(waypointId: string): Promise<void> {
    if (!deps) return;

    const settings = getSettings();
    const flightPlan = routeStore.getState().flightPlan;
    if (!flightPlan) return;

    const deletedIndex = flightPlan.waypoints.findIndex(wp => wp.id === waypointId);
    const wasDeparture = deletedIndex === 0;
    const wasArrival = deletedIndex === flightPlan.waypoints.length - 1;
    const remainingCount = flightPlan.waypoints.length - 1;

    if (remainingCount === 0) {
        clearFlightPlan();
        return;
    }

    // Remove the waypoint using store
    routeStore.removeWaypoint(waypointId);

    // Update altitudes for new departure/arrival if autoTerrainElevation is enabled
    if (settings.autoTerrainElevation && remainingCount > 0) {
        const currentPlan = routeStore.getState().flightPlan;
        if (!currentPlan) return;

        // If we deleted the departure, update new first waypoint's altitude
        if (wasDeparture && currentPlan.waypoints.length > 0) {
            const newDeparture = currentPlan.waypoints[0];
            const terrainElevation = await fetchPointElevation(newDeparture.lat, newDeparture.lon, settings.enableLogging);
            if (terrainElevation !== undefined) {
                routeStore.updateWaypoint(newDeparture.id, { altitude: terrainElevation });
                if (settings.enableLogging) {
                    logger.debug(`[RouteController] New departure ${newDeparture.name}: ${terrainElevation} ft`);
                }
            }
        }

        // If we deleted the arrival, update new last waypoint's altitude
        if (wasArrival && currentPlan.waypoints.length > 0) {
            const newArrival = currentPlan.waypoints[currentPlan.waypoints.length - 1];
            const terrainElevation = await fetchPointElevation(newArrival.lat, newArrival.lon, settings.enableLogging);
            if (terrainElevation !== undefined) {
                routeStore.updateWaypoint(newArrival.id, { altitude: terrainElevation });
                if (settings.enableLogging) {
                    logger.debug(`[RouteController] New arrival ${newArrival.name}: ${terrainElevation} ft`);
                }
            }
        }
    }

    deps.onMapUpdate();
    deps.onSaveSession();
}

/**
 * Move waypoint up in the list
 */
export async function moveWaypointUp(waypointId: string): Promise<void> {
    if (!deps) return;

    const settings = getSettings();
    routeStore.moveWaypointUp(waypointId);

    // Wait for Svelte's reactivity to complete
    await tick();

    if (settings.enableLogging) {
        logger.debug('[RouteController] Moved waypoint up');
    }

    requestAnimationFrame(() => {
        deps?.onMapUpdate();
    });

    deps.onSaveSession();
}

/**
 * Move waypoint down in the list
 */
export async function moveWaypointDown(waypointId: string): Promise<void> {
    if (!deps) return;

    const settings = getSettings();
    routeStore.moveWaypointDown(waypointId);

    // Wait for Svelte's reactivity to complete
    await tick();

    if (settings.enableLogging) {
        logger.debug('[RouteController] Moved waypoint down');
    }

    requestAnimationFrame(() => {
        deps?.onMapUpdate();
    });

    deps.onSaveSession();
}

/**
 * Handle waypoint drag on map
 */
export function handleWaypointDrag(waypointId: string, newLat: number, newLon: number): void {
    if (!deps) return;

    const isEditMode = routeStore.getState().isEditMode;
    if (!isEditMode) return;

    // Update waypoint position using store (handles navigation recalculation)
    routeStore.updateWaypoint(waypointId, { lat: newLat, lon: newLon });

    deps.onMapUpdate();
    deps.onSaveSession();
}

/**
 * Update waypoint name
 */
export function updateWaypointName(waypointId: string, newName: string): void {
    if (!deps) return;

    const trimmedName = newName.trim();
    if (trimmedName === '') {
        routeStore.setEditingWaypoint(null);
        return;
    }

    routeStore.updateWaypoint(waypointId, { name: trimmedName });
    routeStore.setEditingWaypoint(null);
    deps.onMapUpdate();
    deps.onSaveSession();
}

/**
 * Update waypoint altitude
 */
export function updateWaypointAltitude(waypointId: string, newAltitude: string): boolean {
    if (!deps) return false;

    const altitude = parseInt(newAltitude, 10);
    if (isNaN(altitude) || altitude < 0) {
        return false;
    }

    routeStore.updateWaypoint(waypointId, { altitude });
    deps.onMapUpdate();
    deps.onSaveSession();
    return true;
}

/**
 * Update flight plan name
 */
export function updatePlanName(newName: string): void {
    if (!deps) return;

    const trimmedName = newName.trim();
    if (trimmedName === '') return;

    routeStore.updatePlanName(trimmedName);
    deps.onSaveSession();
}

/**
 * Reverse the route
 */
export function reverseRoute(): void {
    if (!deps) return;

    const flightPlan = routeStore.getState().flightPlan;
    if (!flightPlan || flightPlan.waypoints.length < 2) return;

    // Use store to reverse route (handles name update and navigation recalculation)
    routeStore.reverseRoute();

    // Clear weather data since arrival times will be incorrect after reversing
    weatherStore.setWeatherData(new Map());
    weatherStore.setWeatherAlerts(new Map());
    weatherStore.setError(null);

    deps.onMapUpdate();
    deps.onSaveSession();
}

/**
 * Handle aircraft settings change
 */
export function handleAircraftSettingsChange(newAirspeed: number, newDefaultAltitude: number): void {
    if (!deps) return;

    const currentPlan = routeStore.getState().flightPlan;
    if (!currentPlan) return;

    // Track old default altitude to update enroute waypoints
    const oldDefaultAltitude = currentPlan.aircraft.defaultAltitude;

    // Update aircraft settings using store
    routeStore.updateAircraft({
        airspeed: newAirspeed,
        defaultAltitude: newDefaultAltitude,
    });

    // Update enroute waypoints that were using the old default altitude
    // Enroute = not first (departure) or last (arrival) waypoint
    if (oldDefaultAltitude !== newDefaultAltitude && currentPlan.waypoints.length > 2) {
        const updates = new Map<string, Partial<Waypoint>>();
        currentPlan.waypoints.forEach((wp, index) => {
            const isEnroute = index > 0 && index < currentPlan.waypoints.length - 1;
            if (isEnroute && wp.altitude === oldDefaultAltitude) {
                updates.set(wp.id, { altitude: newDefaultAltitude });
            }
        });
        if (updates.size > 0) {
            routeStore.updateWaypoints(updates);
        }
    }

    deps.onMapUpdate();
    deps.onSaveSession();
}

/**
 * Select a waypoint and pan map to it
 */
export function selectWaypoint(waypoint: Waypoint, panToWaypoint: (lat: number, lon: number) => void): void {
    routeStore.selectWaypoint(waypoint.id);
    panToWaypoint(waypoint.lat, waypoint.lon);
}

/**
 * Select a waypoint by ID
 */
export function selectWaypointById(waypointId: string, panToWaypoint: (lat: number, lon: number) => void): Waypoint | null {
    const flightPlan = routeStore.getState().flightPlan;
    if (!flightPlan) return null;

    const wp = flightPlan.waypoints.find(w => w.id === waypointId);
    if (wp) {
        selectWaypoint(wp, panToWaypoint);
        return wp;
    }
    return null;
}

/**
 * Toggle edit mode
 */
export function toggleEditMode(resetCursor: () => void): void {
    if (!deps) return;

    routeStore.toggleEditMode();

    // Reset cursor when exiting edit mode
    if (!routeStore.getState().isEditMode) {
        resetCursor();
    }

    deps.onMapUpdate();
}
