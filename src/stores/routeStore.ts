/**
 * Route Store - Shared state for flight plan and waypoint management
 * Provides centralized state management for route-related components
 */

import { writable, derived, get, type Writable, type Readable } from 'svelte/store';
import type { FlightPlan, Waypoint, AircraftProfile, FlightPlanTotals } from '../types/flightPlan';
import { calculateFlightPlanNavigation } from '../services/navigationCalc';

/**
 * Route settings interface
 */
export interface RouteSettings {
    defaultAirspeed: number;
    defaultAltitude: number;
}

/**
 * Full route state
 */
export interface RouteState {
    flightPlan: FlightPlan | null;
    selectedWaypointId: string | null;
    editingWaypointId: string | null;
    isEditMode: boolean;
    isLoading: boolean;
    error: string | null;
}

// Initial state
const initialState: RouteState = {
    flightPlan: null,
    selectedWaypointId: null,
    editingWaypointId: null,
    isEditMode: false,
    isLoading: false,
    error: null,
};

/**
 * Create the main route store
 */
function createRouteStore() {
    const { subscribe, set, update }: Writable<RouteState> = writable(initialState);

    return {
        subscribe,

        /**
         * Set the entire flight plan
         */
        setFlightPlan: (flightPlan: FlightPlan | null) => {
            update(state => ({
                ...state,
                flightPlan,
                selectedWaypointId: null,
                editingWaypointId: null,
            }));
        },

        /**
         * Clear the current flight plan
         */
        clearFlightPlan: () => {
            update(state => ({
                ...state,
                flightPlan: null,
                selectedWaypointId: null,
                editingWaypointId: null,
                error: null,
            }));
        },

        /**
         * Select a waypoint by ID
         */
        selectWaypoint: (waypointId: string | null) => {
            update(state => ({
                ...state,
                selectedWaypointId: waypointId,
            }));
        },

        /**
         * Set editing waypoint ID
         */
        setEditingWaypoint: (waypointId: string | null) => {
            update(state => ({
                ...state,
                editingWaypointId: waypointId,
            }));
        },

        /**
         * Toggle edit mode
         */
        toggleEditMode: () => {
            update(state => ({
                ...state,
                isEditMode: !state.isEditMode,
            }));
        },

        /**
         * Set edit mode explicitly
         */
        setEditMode: (isEditMode: boolean) => {
            update(state => ({
                ...state,
                isEditMode,
            }));
        },

        /**
         * Set loading state
         */
        setLoading: (isLoading: boolean) => {
            update(state => ({
                ...state,
                isLoading,
            }));
        },

        /**
         * Set error message
         */
        setError: (error: string | null) => {
            update(state => ({
                ...state,
                error,
            }));
        },

        /**
         * Add a waypoint to the flight plan
         */
        addWaypoint: (waypoint: Waypoint, index?: number) => {
            update(state => {
                if (!state.flightPlan) return state;

                const waypoints = [...state.flightPlan.waypoints];
                if (index !== undefined && index >= 0 && index <= waypoints.length) {
                    waypoints.splice(index, 0, waypoint);
                } else {
                    waypoints.push(waypoint);
                }

                // Recalculate navigation
                const { waypoints: updatedWaypoints, totals } = calculateFlightPlanNavigation(
                    waypoints,
                    state.flightPlan.aircraft.airspeed
                );

                return {
                    ...state,
                    flightPlan: {
                        ...state.flightPlan,
                        waypoints: updatedWaypoints,
                        totals,
                    },
                };
            });
        },

        /**
         * Remove a waypoint by ID
         */
        removeWaypoint: (waypointId: string) => {
            update(state => {
                if (!state.flightPlan) return state;

                const waypoints = state.flightPlan.waypoints.filter(wp => wp.id !== waypointId);

                // Recalculate navigation
                const { waypoints: updatedWaypoints, totals } = calculateFlightPlanNavigation(
                    waypoints,
                    state.flightPlan.aircraft.airspeed
                );

                return {
                    ...state,
                    flightPlan: {
                        ...state.flightPlan,
                        waypoints: updatedWaypoints,
                        totals,
                    },
                    selectedWaypointId: state.selectedWaypointId === waypointId
                        ? null
                        : state.selectedWaypointId,
                };
            });
        },

        /**
         * Update a waypoint by ID
         */
        updateWaypoint: (waypointId: string, updates: Partial<Waypoint>) => {
            update(state => {
                if (!state.flightPlan) return state;

                const waypoints = state.flightPlan.waypoints.map(wp =>
                    wp.id === waypointId ? { ...wp, ...updates } : wp
                );

                // Recalculate navigation
                const { waypoints: updatedWaypoints, totals } = calculateFlightPlanNavigation(
                    waypoints,
                    state.flightPlan.aircraft.airspeed
                );

                return {
                    ...state,
                    flightPlan: {
                        ...state.flightPlan,
                        waypoints: updatedWaypoints,
                        totals,
                    },
                };
            });
        },

        /**
         * Reorder waypoints by moving a waypoint from one index to another
         */
        reorderWaypoints: (fromIndex: number, toIndex: number) => {
            update(state => {
                if (!state.flightPlan) return state;
                if (fromIndex === toIndex) return state;
                if (fromIndex < 0 || fromIndex >= state.flightPlan.waypoints.length) return state;
                if (toIndex < 0 || toIndex >= state.flightPlan.waypoints.length) return state;

                const waypoints = [...state.flightPlan.waypoints];
                const [removed] = waypoints.splice(fromIndex, 1);
                waypoints.splice(toIndex, 0, removed);

                // Recalculate navigation
                const { waypoints: updatedWaypoints, totals } = calculateFlightPlanNavigation(
                    waypoints,
                    state.flightPlan.aircraft.airspeed
                );

                return {
                    ...state,
                    flightPlan: {
                        ...state.flightPlan,
                        waypoints: updatedWaypoints,
                        totals,
                    },
                };
            });
        },

        /**
         * Update aircraft profile
         */
        updateAircraft: (updates: Partial<AircraftProfile>) => {
            update(state => {
                if (!state.flightPlan) return state;

                const aircraft = { ...state.flightPlan.aircraft, ...updates };

                // Recalculate navigation with new airspeed
                const { waypoints, totals } = calculateFlightPlanNavigation(
                    state.flightPlan.waypoints,
                    aircraft.airspeed
                );

                return {
                    ...state,
                    flightPlan: {
                        ...state.flightPlan,
                        aircraft,
                        waypoints,
                        totals,
                    },
                };
            });
        },

        /**
         * Update flight plan name
         */
        updatePlanName: (name: string) => {
            update(state => {
                if (!state.flightPlan) return state;

                return {
                    ...state,
                    flightPlan: {
                        ...state.flightPlan,
                        name,
                    },
                };
            });
        },

        /**
         * Update departure time
         */
        updateDepartureTime: (departureTime: Date) => {
            update(state => {
                if (!state.flightPlan) return state;

                return {
                    ...state,
                    flightPlan: {
                        ...state.flightPlan,
                        departureTime,
                    },
                };
            });
        },

        /**
         * Get current state (for non-reactive access)
         */
        getState: (): RouteState => get({ subscribe }),

        /**
         * Reset to initial state
         */
        reset: () => set(initialState),
    };
}

// Create singleton store instance
export const routeStore = createRouteStore();

// Derived stores for convenient access
export const flightPlan: Readable<FlightPlan | null> = derived(
    routeStore,
    $state => $state.flightPlan
);

export const waypoints: Readable<Waypoint[]> = derived(
    routeStore,
    $state => $state.flightPlan?.waypoints ?? []
);

export const selectedWaypointId: Readable<string | null> = derived(
    routeStore,
    $state => $state.selectedWaypointId
);

export const selectedWaypoint: Readable<Waypoint | null> = derived(
    routeStore,
    $state => {
        if (!$state.flightPlan || !$state.selectedWaypointId) return null;
        return $state.flightPlan.waypoints.find(wp => wp.id === $state.selectedWaypointId) ?? null;
    }
);

export const isEditMode: Readable<boolean> = derived(
    routeStore,
    $state => $state.isEditMode
);

export const routeTotals: Readable<FlightPlanTotals | null> = derived(
    routeStore,
    $state => $state.flightPlan?.totals ?? null
);

export const waypointCount: Readable<number> = derived(
    routeStore,
    $state => $state.flightPlan?.waypoints.length ?? 0
);
