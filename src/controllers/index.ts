/**
 * Controllers Barrel Export
 * Centralized exports for all controller implementations
 */

export {
    initWeatherController,
    fetchWeatherForRoute,
    searchVFRWindows,
    useVFRWindow,
    handleDepartureTimeChange,
    handleWindyTimestampChange,
    toggleWindySync,
    resetWeatherState,
    hasAnyAlerts,
    type WeatherControllerDeps,
} from './weatherController';

export {
    initRouteController,
    loadFlightPlanFile,
    clearFlightPlan,
    createNewFlightPlan,
    addAirportToFlightPlan,
    addNavaidToFlightPlan,
    addWaypointFromMapClick,
    insertWaypointOnSegment,
    deleteWaypoint,
    moveWaypointUp,
    moveWaypointDown,
    handleWaypointDrag,
    updateWaypointName,
    updateWaypointAltitude,
    updatePlanName,
    reverseRoute,
    handleAircraftSettingsChange,
    selectWaypoint,
    selectWaypointById,
    toggleEditMode,
    type RouteControllerDeps,
} from './routeController';
