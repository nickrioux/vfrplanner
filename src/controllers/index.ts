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
