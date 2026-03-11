/**
 * Weather alerts module
 * Handles weather alert checking, evaluation, and threshold management for VFR flight planning.
 * Extracted from weatherService.ts for improved maintainability.
 */

import { metersToFeet } from '../utils/units';
import type { WaypointWeather } from './weatherService';

export interface WeatherAlert {
    type: 'wind' | 'gust' | 'visibility' | 'ceiling' | 'rain' | 'temperature' | 'altitude-conflict';
    severity: 'caution' | 'warning';
    message: string;
    value: number;
    threshold: number;
}

export interface WeatherAlertThresholds {
    windSpeed: number;      // knots
    gustSpeed: number;      // knots
    visibility: number;     // km
    cloudBase: number;      // feet
    precipitation: number;  // mm
}

export const DEFAULT_ALERT_THRESHOLDS: WeatherAlertThresholds = {
    windSpeed: 25,
    gustSpeed: 35,
    visibility: 5,
    cloudBase: 1500,
    precipitation: 5,
};

/**
 * Check for weather alerts at a waypoint
 * @param weather - Weather data for the waypoint
 * @param thresholds - Alert thresholds
 * @param plannedAltitude - Planned flight altitude in feet (optional, for altitude conflict check)
 * @param isTerminal - True if this is a departure or arrival waypoint (wind/gust alerts only apply to terminals)
 */
export function checkWeatherAlerts(
    weather: WaypointWeather,
    thresholds: WeatherAlertThresholds = DEFAULT_ALERT_THRESHOLDS,
    plannedAltitude?: number,
    isTerminal: boolean = false
): WeatherAlert[] {
    const alerts: WeatherAlert[] = [];

    // Wind speed alert - only for terminal waypoints (departure/arrival)
    // Use surface wind for terminals, not altitude wind
    if (isTerminal) {
        const terminalWindSpeed = weather.surfaceWindSpeed ?? weather.windSpeed;
        if (terminalWindSpeed >= thresholds.windSpeed) {
            alerts.push({
                type: 'wind',
                severity: terminalWindSpeed >= thresholds.windSpeed * 1.5 ? 'warning' : 'caution',
                message: `Wind ${Math.round(terminalWindSpeed)} kt`,
                value: terminalWindSpeed,
                threshold: thresholds.windSpeed,
            });
        }
    }

    // Gust alert - only for terminal waypoints (departure/arrival)
    if (isTerminal && weather.windGust && weather.windGust >= thresholds.gustSpeed) {
        alerts.push({
            type: 'gust',
            severity: weather.windGust >= thresholds.gustSpeed * 1.3 ? 'warning' : 'caution',
            message: `Gust ${Math.round(weather.windGust)} kt`,
            value: weather.windGust,
            threshold: thresholds.gustSpeed,
        });
    }

    // Visibility alert
    if (weather.visibility && weather.visibility < thresholds.visibility) {
        alerts.push({
            type: 'visibility',
            severity: weather.visibility < thresholds.visibility / 2 ? 'warning' : 'caution',
            message: `Vis ${weather.visibility.toFixed(1)} km`,
            value: weather.visibility,
            threshold: thresholds.visibility,
        });
    }

    // Cloud base alert
    // Note: weather.cloudBase is in meters AGL, but thresholds.cloudBase is in feet
    if (weather.cloudBase) {
        const cloudBaseFeet = metersToFeet(weather.cloudBase);
        // Use rounded value (no decimals)
        const ceilingDisplay = `${Math.round(cloudBaseFeet)} ft`;

        if (cloudBaseFeet < thresholds.cloudBase) {
            alerts.push({
                type: 'ceiling',
                severity: cloudBaseFeet < thresholds.cloudBase / 2 ? 'warning' : 'caution',
                message: `Ceiling ${ceilingDisplay}`,
                value: cloudBaseFeet,
                threshold: thresholds.cloudBase,
            });
        }

        // Altitude conflict alert: cloud ceiling below planned altitude
        if (plannedAltitude !== undefined && plannedAltitude > 0 && cloudBaseFeet < plannedAltitude) {
            const margin = plannedAltitude - cloudBaseFeet;
            // Use rounded value for planned altitude
            const plannedAltDisplay = `${Math.round(plannedAltitude)} ft`;
            alerts.push({
                type: 'altitude-conflict',
                severity: margin > 500 ? 'warning' : 'caution', // Warning if more than 500ft below
                message: `Ceiling ${ceilingDisplay} below planned ${plannedAltDisplay}`,
                value: cloudBaseFeet,
                threshold: plannedAltitude,
            });
        }
    }

    // Precipitation alert
    if (weather.precipitation && weather.precipitation >= thresholds.precipitation) {
        alerts.push({
            type: 'rain',
            severity: weather.precipitation >= thresholds.precipitation * 2 ? 'warning' : 'caution',
            message: `Rain ${weather.precipitation.toFixed(1)} mm`,
            value: weather.precipitation,
            threshold: thresholds.precipitation,
        });
    }

    return alerts;
}
