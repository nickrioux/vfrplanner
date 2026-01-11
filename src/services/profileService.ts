/**
 * Profile service for calculating altitude profile data
 * Provides functions to calculate profile data points for the altitude profile graph
 */

import type { Waypoint } from '../types/flightPlan';
import type { WaypointWeather } from './weatherService';
import { calculateHeadwindComponent } from './navigationCalc';

/**
 * Convert meters to feet
 */
function metersToFeet(m: number): number {
    return m * 3.28084;
}

/**
 * Estimate cloud top from cloud base
 * Uses typical cloud thickness based on cloud type
 * @param cloudBase - Cloud base altitude (in feet, MSL or AGL depending on context)
 * @returns Cloud top altitude (same reference as input)
 */
function estimateCloudTop(cloudBase: number): number {
    // Typical cloud thickness:
    // - Cumulus: 2000-5000 feet
    // - Stratocumulus: 1000-3000 feet
    // - Cumulonimbus: 10000+ feet
    // Using a conservative estimate of 3000 feet for most clouds
    const typicalThickness = 3000; // feet
    return cloudBase + typicalThickness;
}

/**
 * Calculate wind component (headwind/tailwind and crosswind)
 * @param trackBearing - Aircraft track direction in degrees
 * @param windDir - Wind direction in degrees (where wind comes FROM)
 * @param windSpeed - Wind speed in knots
 * @returns Object with headwind (positive = headwind, negative = tailwind) and crosswind components
 */
export function calculateWindComponent(
    trackBearing: number,
    windDir: number,
    windSpeed: number
): { headwind: number; crosswind: number } {
    // Convert to radians
    const trackRad = (trackBearing * Math.PI) / 180;
    const windRad = (windDir * Math.PI) / 180;

    // Calculate angle difference
    const angleDiff = trackRad - windRad;

    // Headwind component: positive = headwind (slows aircraft), negative = tailwind (speeds up)
    const headwind = windSpeed * Math.cos(angleDiff);
    
    // Crosswind component: positive = right crosswind, negative = left crosswind
    const crosswind = windSpeed * Math.sin(angleDiff);

    return { headwind, crosswind };
}

/**
 * Evaluate VFR flight conditions for a profile segment
 * @param point - Profile data point with weather and terrain
 * @param flightAltitude - Planned flight altitude MSL
 * @param wx - Weather data for additional parameters
 * @param isTerminal - True if this is a departure or arrival waypoint (wind checks apply)
 * @returns Object with condition assessment and reasons
 */
export function evaluateSegmentCondition(
    point: ProfileDataPoint,
    flightAltitude: number,
    wx?: WaypointWeather,
    isTerminal: boolean = false
): { condition: SegmentCondition; reasons: string[] } {
    const reasons: string[] = [];

    // Check for missing critical data
    if (point.windSpeed === undefined || point.windSpeed === 0) {
        return { condition: 'unknown', reasons: ['Missing wind data'] };
    }

    // NOTE: Missing cloud base data (undefined) means CLEAR SKY, not missing data
    // This is a GOOD VFR condition, so we don't return 'unknown' for missing clouds

    // Calculate terrain clearance
    const terrainMSL = point.terrainElevation ?? 0;
    const terrainClearance = flightAltitude - terrainMSL;

    // Get additional weather parameters (with defaults)
    const visibility = wx?.visibility ?? 10; // Default to good visibility if not available
    const precipitation = wx?.precipitation ?? 0; // Default to no precipitation
    const gustSpeed = wx?.windGust; // May be undefined

    // Calculate cloud-related values ONLY if clouds are present
    let cloudBaseAGL: number | undefined;
    let cloudClearance: number | undefined;

    if (point.cloudBase !== undefined) {
        const cloudBaseMSL = point.cloudBase; // Already in MSL from profileService
        cloudBaseAGL = cloudBaseMSL - terrainMSL;
        cloudClearance = cloudBaseMSL - flightAltitude;

        // Check for IMC conditions (flying in clouds) - CRITICAL
        if (flightAltitude >= cloudBaseMSL) {
            reasons.push('Aircraft above cloud base (IMC)');
            return { condition: 'poor', reasons };
        }
    }

    // Collect criteria for evaluation
    const criteria: ConditionCriteria = {
        windSpeed: point.windSpeed,
        gustSpeed,
        cloudBaseAGL: cloudBaseAGL ?? 999999, // Use very high value for clear sky
        visibility,
        precipitation,
        terrainClearance,
        cloudClearance: cloudClearance ?? 999999, // Use very high value for clear sky
    };

    // Evaluate conditions - Red (Poor) takes priority
    let isPoor = false;
    let isMarginal = false;

    // Wind speed checks - ONLY for departure/arrival waypoints
    // High winds and gusts are primarily a concern for takeoff and landing operations
    if (isTerminal) {
        if (criteria.windSpeed > 25) {
            reasons.push(`High wind (${Math.round(criteria.windSpeed)}kt)`);
            isPoor = true;
        } else if (criteria.windSpeed > 20) {
            reasons.push(`Elevated wind (${Math.round(criteria.windSpeed)}kt)`);
            isMarginal = true;
        }

        // Gust checks
        if (criteria.gustSpeed !== undefined) {
            if (criteria.gustSpeed > 35) {
                reasons.push(`High gusts (${Math.round(criteria.gustSpeed)}kt)`);
                isPoor = true;
            } else if (criteria.gustSpeed > 30) {
                reasons.push(`Elevated gusts (${Math.round(criteria.gustSpeed)}kt)`);
                isMarginal = true;
            }
        }
    }

    // Cloud base AGL checks - ONLY when clouds are present
    // If cloudBase is undefined, it means clear sky (no cloud issues)
    if (cloudBaseAGL !== undefined) {
        if (criteria.cloudBaseAGL < 1500) {
            reasons.push(`Low ceiling (${Math.round(criteria.cloudBaseAGL)}ft AGL)`);
            isPoor = true;
        } else if (criteria.cloudBaseAGL < 2000) {
            reasons.push(`Marginal ceiling (${Math.round(criteria.cloudBaseAGL)}ft AGL)`);
            isMarginal = true;
        }
    }

    // Visibility checks
    if (criteria.visibility < 5) {
        reasons.push(`Low visibility (${criteria.visibility.toFixed(1)}km)`);
        isPoor = true;
    } else if (criteria.visibility < 8) {
        reasons.push(`Reduced visibility (${criteria.visibility.toFixed(1)}km)`);
        isMarginal = true;
    }

    // Precipitation checks
    if (criteria.precipitation > 5) {
        reasons.push(`Heavy precipitation (${criteria.precipitation.toFixed(1)}mm)`);
        isPoor = true;
    } else if (criteria.precipitation > 2) {
        reasons.push(`Moderate precipitation (${criteria.precipitation.toFixed(1)}mm)`);
        isMarginal = true;
    }

    // Terrain clearance checks
    if (criteria.terrainClearance < 500) {
        reasons.push(`Low terrain clearance (${Math.round(criteria.terrainClearance)}ft)`);
        isPoor = true;
    } else if (criteria.terrainClearance < 1000) {
        reasons.push(`Marginal terrain clearance (${Math.round(criteria.terrainClearance)}ft)`);
        isMarginal = true;
    }

    // Cloud clearance checks - ONLY when clouds are present
    // If cloudClearance is undefined, it means clear sky (no cloud clearance issues)
    if (cloudClearance !== undefined) {
        if (criteria.cloudClearance < 200) {
            reasons.push(`Insufficient cloud clearance (${Math.round(criteria.cloudClearance)}ft)`);
            isPoor = true;
        } else if (criteria.cloudClearance < 500) {
            reasons.push(`Marginal cloud clearance (${Math.round(criteria.cloudClearance)}ft)`);
            isMarginal = true;
        }
    }

    // Determine final condition
    if (isPoor) {
        return { condition: 'poor', reasons };
    }

    if (isMarginal) {
        return { condition: 'marginal', reasons };
    }

    // All checks passed - Good VFR
    return { condition: 'good', reasons: [] };
}

/**
 * Segment condition types for VFR flight conditions
 */
export type SegmentCondition = 'good' | 'marginal' | 'poor' | 'unknown';

/**
 * Condition criteria used for evaluation
 */
export interface ConditionCriteria {
    windSpeed: number;
    gustSpeed?: number;
    cloudBaseAGL: number;
    visibility: number;
    precipitation: number;
    terrainClearance: number;
    cloudClearance: number;
}

/**
 * Profile data point interface
 * All altitude values are in MSL (Mean Sea Level) for consistent graph plotting
 */
export interface ProfileDataPoint {
    distance: number;        // Cumulative distance in NM
    altitude: number;        // Flight altitude in feet MSL
    terrainElevation?: number; // Terrain elevation in feet MSL
    cloudBase?: number;      // Cloud base in feet MSL (converted from AGL)
    cloudTop?: number;       // Cloud top in feet MSL (estimated)
    headwindComponent: number; // Headwind component in knots (positive = headwind, negative = tailwind)
    crosswindComponent: number; // Crosswind component in knots
    windSpeed: number;       // Total wind speed in knots
    windDir: number;         // Wind direction in degrees
    waypointId?: string;     // Associated waypoint ID
    waypointName?: string;   // Waypoint name for labeling
    condition?: SegmentCondition; // VFR condition assessment
    conditionReasons?: string[]; // Factors causing marginal/poor rating
}

/**
 * Calculate profile data points for the altitude profile graph
 * @param waypoints - Array of waypoints from the flight plan
 * @param weatherData - Map of waypoint ID to weather data
 * @param defaultAltitude - Default altitude in feet (from flight plan aircraft profile)
 * @returns Array of profile data points
 */
export function calculateProfileData(
    waypoints: Waypoint[],
    weatherData: Map<string, WaypointWeather>,
    defaultAltitude: number = 3000
): ProfileDataPoint[] {
    if (waypoints.length === 0) {
        return [];
    }

    const profilePoints: ProfileDataPoint[] = [];
    let cumulativeDistance = 0;

    waypoints.forEach((wp, index) => {
        // Get weather data for this waypoint
        const wx = weatherData.get(wp.id);

        // Get altitude (use waypoint altitude or default)
        const altitude = wp.altitude ?? defaultAltitude;

        // Get terrain elevation if available
        const terrainElevation = wp.elevation;

        // Get cloud data
        // NOTE: Windy's cloudBase is in AGL (Above Ground Level) from ECMWF model
        // For the altitude profile graph, we need MSL (Mean Sea Level) to plot correctly
        // since flight altitude and terrain are in MSL
        let cloudBase: number | undefined;
        let cloudTop: number | undefined;
        if (wx?.cloudBase !== undefined && wx.cloudBase !== null && !isNaN(wx.cloudBase) && wx.cloudBase > 0) {
            // Convert from meters to feet (still AGL at this point)
            const cloudBaseAGL = metersToFeet(wx.cloudBase);

            // Convert from AGL to MSL by adding terrain elevation
            // This allows proper plotting on the altitude profile graph
            const terrainMSL = terrainElevation ?? 0;
            cloudBase = cloudBaseAGL + terrainMSL;  // Now in MSL for graph plotting

            // Estimate cloud top if not available (also in MSL)
            cloudTop = estimateCloudTop(cloudBase);
        }

        // Calculate wind components
        let headwindComponent = 0;
        let crosswindComponent = 0;
        let windSpeed = 0;
        let windDir = 0;

        if (wx) {
            windSpeed = wx.windSpeed;
            windDir = wx.windDir;
            
            // Calculate wind components if we have a bearing (track direction)
            // For the first waypoint, we don't have a bearing, so we'll show wind speed but no headwind component
            if (wp.bearing !== undefined) {
                // Use the existing headwind calculation for consistency
                headwindComponent = calculateHeadwindComponent(wp.bearing, wx.windDir, wx.windSpeed);
                // Calculate crosswind component separately
                const trackRad = (wp.bearing * Math.PI) / 180;
                const windRad = (wx.windDir * Math.PI) / 180;
                crosswindComponent = wx.windSpeed * Math.sin(trackRad - windRad);
            } else if (index > 0) {
                // For waypoints without bearing, try to use the bearing from the previous waypoint
                const prevWp = waypoints[index - 1];
                if (prevWp.bearing !== undefined) {
                    headwindComponent = calculateHeadwindComponent(prevWp.bearing, wx.windDir, wx.windSpeed);
                    const trackRad = (prevWp.bearing * Math.PI) / 180;
                    const windRad = (wx.windDir * Math.PI) / 180;
                    crosswindComponent = wx.windSpeed * Math.sin(trackRad - windRad);
                }
            }
        }

        // Create profile point
        const point: ProfileDataPoint = {
            distance: cumulativeDistance,
            altitude,
            terrainElevation,
            cloudBase,
            cloudTop,
            headwindComponent,
            crosswindComponent,
            windSpeed,
            windDir,
            waypointId: wp.id,
            waypointName: wp.name,
        };

        // Evaluate segment condition
        // Wind checks only apply to departure (first) and arrival (last) waypoints
        const isTerminal = index === 0 || index === waypoints.length - 1;
        const conditionResult = evaluateSegmentCondition(point, altitude, wx, isTerminal);
        point.condition = conditionResult.condition;
        point.conditionReasons = conditionResult.reasons;

        profilePoints.push(point);

        // Add cumulative distance for next waypoint
        if (index < waypoints.length - 1) {
            cumulativeDistance += wp.distance || 0;
        }
    });

    return profilePoints;
}

