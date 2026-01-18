/**
 * Profile service for calculating altitude profile data
 * Provides functions to calculate profile data points for the altitude profile graph
 */

import type { Waypoint, RunwayInfo } from '../types/flightPlan';
import type { WaypointWeather, LevelWind } from './weatherService';
import { calculateHeadwindComponent } from './navigationCalc';
import { getElevationForWaypoint, getElevationAtDistance, type ElevationPoint } from './elevationService';
import { interpolateWindBetweenWaypoints, interpolateBearing } from '../utils/interpolation';

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
 * Calculate crosswind component for a specific runway
 * @param runwayHeading - Runway heading in degrees true
 * @param windDir - Wind direction in degrees (where wind comes FROM)
 * @param windSpeed - Wind speed in knots
 * @returns Absolute crosswind component in knots
 */
export function calculateRunwayCrosswind(
    runwayHeading: number,
    windDir: number,
    windSpeed: number
): number {
    // Convert to radians
    const runwayRad = (runwayHeading * Math.PI) / 180;
    const windRad = (windDir * Math.PI) / 180;

    // Calculate angle difference
    const angleDiff = runwayRad - windRad;

    // Crosswind component (absolute value - we care about magnitude, not direction)
    return Math.abs(windSpeed * Math.sin(angleDiff));
}

/**
 * Result of best runway analysis
 */
export interface BestRunwayResult {
    runwayIdent: string;        // e.g., "09" or "27L"
    runwayHeading: number;      // True heading
    crosswindKt: number;        // Crosswind component in knots (steady wind)
    headwindKt: number;         // Headwind component (positive = headwind, negative = tailwind)
    gustCrosswindKt?: number;   // Crosswind component during gusts
    gustHeadwindKt?: number;    // Headwind component during gusts
}

/**
 * Find the best runway for given wind conditions
 * Best runway = headwind preferred (no tailwind), then lowest crosswind
 * @param runways - Array of runway info
 * @param windDir - Wind direction in degrees (where wind comes FROM)
 * @param windSpeed - Wind speed in knots
 * @param gustSpeed - Optional gust speed in knots
 * @returns Best runway result, or null if no runways available
 */
export function findBestRunway(
    runways: RunwayInfo[],
    windDir: number,
    windSpeed: number,
    gustSpeed?: number
): BestRunwayResult | null {
    if (!runways || runways.length === 0) {
        return null;
    }

    // Collect all runway end options with their wind components
    const options: BestRunwayResult[] = [];

    for (const runway of runways) {
        // Check both runway ends
        const ends = [
            { ident: runway.lowEnd.ident, heading: runway.lowEnd.headingTrue },
            { ident: runway.highEnd.ident, heading: runway.highEnd.headingTrue },
        ];

        for (const end of ends) {
            if (!end.heading && end.heading !== 0) continue; // Skip if no heading data

            const crosswind = calculateRunwayCrosswind(end.heading, windDir, windSpeed);

            // Calculate headwind component (positive = headwind, negative = tailwind)
            const runwayRad = (end.heading * Math.PI) / 180;
            const windRad = (windDir * Math.PI) / 180;
            const angleDiff = runwayRad - windRad;
            const headwind = windSpeed * Math.cos(angleDiff);

            // Calculate gust components if gust speed provided
            let gustCrosswind: number | undefined;
            let gustHeadwind: number | undefined;
            if (gustSpeed !== undefined && gustSpeed > 0) {
                gustCrosswind = calculateRunwayCrosswind(end.heading, windDir, gustSpeed);
                gustHeadwind = gustSpeed * Math.cos(angleDiff);
            }

            options.push({
                runwayIdent: end.ident,
                runwayHeading: end.heading,
                crosswindKt: crosswind,
                headwindKt: headwind,
                gustCrosswindKt: gustCrosswind,
                gustHeadwindKt: gustHeadwind,
            });
        }
    }

    if (options.length === 0) {
        return null;
    }

    // Sort by: 1) Prefer headwind (no tailwind), 2) Then lowest crosswind
    // Consider gust crosswind for sorting if available
    options.sort((a, b) => {
        // First priority: prefer headwind over tailwind
        const aHasHeadwind = a.headwindKt >= 0;
        const bHasHeadwind = b.headwindKt >= 0;

        if (aHasHeadwind && !bHasHeadwind) return -1; // a is better (has headwind)
        if (!aHasHeadwind && bHasHeadwind) return 1;  // b is better (has headwind)

        // Both have headwind or both have tailwind - pick lowest crosswind
        // Use gust crosswind if available for worst-case comparison
        const aXwind = a.gustCrosswindKt ?? a.crosswindKt;
        const bXwind = b.gustCrosswindKt ?? b.crosswindKt;
        return aXwind - bXwind;
    });

    return options[0];
}

/**
 * Evaluate VFR flight conditions for a profile segment
 * @param point - Profile data point with weather and terrain
 * @param flightAltitude - Planned flight altitude MSL
 * @param wx - Weather data for additional parameters
 * @param isTerminal - True if this is a departure or arrival waypoint (wind checks apply)
 * @param waypoint - Optional waypoint data for runway information (crosswind calculation)
 * @returns Object with condition assessment, reasons, and best runway info
 */
export function evaluateSegmentCondition(
    point: ProfileDataPoint,
    flightAltitude: number,
    wx?: WaypointWeather,
    isTerminal: boolean = false,
    waypoint?: Waypoint
): { condition: SegmentCondition; reasons: string[]; bestRunway?: BestRunwayResult } {
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
    let bestRunway: BestRunwayResult | undefined;

    // Wind speed and crosswind checks - ONLY for departure/arrival waypoints
    // High winds and gusts are primarily a concern for takeoff and landing operations
    // Use SURFACE wind for terminal operations, not altitude wind
    if (isTerminal && wx) {
        const terminalWindSpeed = wx.surfaceWindSpeed ?? criteria.windSpeed;
        const terminalWindDir = wx.surfaceWindDir ?? point.windDir;

        console.log(`[VFR Runway] Terminal waypoint: ${waypoint?.name}, hasRunways: ${!!waypoint?.runways}, count: ${waypoint?.runways?.length ?? 0}`);
        console.log(`[VFR Runway] Surface wind: ${Math.round(terminalWindDir)}° @ ${Math.round(terminalWindSpeed)}kt`);

        // Calculate crosswind if runway data is available
        if (waypoint?.runways && waypoint.runways.length > 0) {
            console.log(`[VFR Runway] Runways available:`, waypoint.runways.map(r => `${r.lowEnd.ident}/${r.highEnd.ident} (${r.lowEnd.headingTrue}°/${r.highEnd.headingTrue}°)`));
            bestRunway = findBestRunway(waypoint.runways, terminalWindDir, terminalWindSpeed) ?? undefined;

            if (bestRunway) {
                console.log(`[VFR Runway] Best runway: ${bestRunway.runwayIdent}, crosswind: ${Math.round(bestRunway.crosswindKt)}kt, headwind: ${Math.round(bestRunway.headwindKt)}kt`);
                // Crosswind limits (typical light aircraft limits)
                // > 15kt crosswind is challenging, > 20kt is dangerous for most pilots
                if (bestRunway.crosswindKt > 20) {
                    reasons.push(`High crosswind Rwy ${bestRunway.runwayIdent} (${Math.round(bestRunway.crosswindKt)}kt)`);
                    isPoor = true;
                } else if (bestRunway.crosswindKt > 15) {
                    reasons.push(`Crosswind Rwy ${bestRunway.runwayIdent} (${Math.round(bestRunway.crosswindKt)}kt)`);
                    isMarginal = true;
                }

                // Tailwind check (> 10kt tailwind is a concern)
                if (bestRunway.headwindKt < -10) {
                    reasons.push(`Tailwind Rwy ${bestRunway.runwayIdent} (${Math.round(Math.abs(bestRunway.headwindKt))}kt)`);
                    isMarginal = true;
                }
            }
        }

        // Overall wind speed check
        if (terminalWindSpeed > 25) {
            reasons.push(`High surface wind (${Math.round(terminalWindSpeed)}kt)`);
            isPoor = true;
        } else if (terminalWindSpeed > 20) {
            reasons.push(`Elevated surface wind (${Math.round(terminalWindSpeed)}kt)`);
            isMarginal = true;
        }

        // Gust checks (already surface-based)
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

    // Terrain clearance checks - SKIP for terminal waypoints (departure/arrival)
    // At departure the aircraft is on the ground, at arrival it will descend to ground level
    if (!isTerminal) {
        if (criteria.terrainClearance < 500) {
            reasons.push(`Low terrain clearance (${Math.round(criteria.terrainClearance)}ft)`);
            isPoor = true;
        } else if (criteria.terrainClearance < 1000) {
            reasons.push(`Marginal terrain clearance (${Math.round(criteria.terrainClearance)}ft)`);
            isMarginal = true;
        }
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
        return { condition: 'poor', reasons, bestRunway };
    }

    if (isMarginal) {
        return { condition: 'marginal', reasons, bestRunway };
    }

    // All checks passed - Good VFR
    return { condition: 'good', reasons: [], bestRunway };
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
    verticalWinds?: LevelWind[]; // Wind data at all pressure levels for vertical wind display
    waypointId?: string;     // Associated waypoint ID
    waypointName?: string;   // Waypoint name for labeling
    condition?: SegmentCondition; // VFR condition assessment
    conditionReasons?: string[]; // Factors causing marginal/poor rating
}

/**
 * Interpolate altitude between waypoints
 * @param distance - Distance along route in NM
 * @param waypoints - Array of waypoints
 * @param defaultAltitude - Default altitude if no waypoint altitude specified
 * @returns Interpolated altitude in feet MSL
 */
function interpolateAltitude(distance: number, waypoints: Waypoint[], defaultAltitude: number): number {
    if (waypoints.length === 0) return defaultAltitude;
    if (waypoints.length === 1) return waypoints[0].altitude ?? defaultAltitude;

    let cumulativeDistance = 0;

    // Find the two waypoints to interpolate between
    for (let i = 0; i < waypoints.length - 1; i++) {
        const wp1 = waypoints[i];
        const wp2 = waypoints[i + 1];
        const legDistance = wp1.distance || 0;

        if (distance >= cumulativeDistance && distance <= cumulativeDistance + legDistance) {
            // Interpolate between wp1 and wp2
            const alt1 = wp1.altitude ?? defaultAltitude;
            const alt2 = wp2.altitude ?? defaultAltitude;
            const t = (distance - cumulativeDistance) / legDistance;
            return alt1 + (alt2 - alt1) * t;
        }

        cumulativeDistance += legDistance;
    }

    // If beyond the end, return last waypoint altitude
    return waypoints[waypoints.length - 1].altitude ?? defaultAltitude;
}

/**
 * Calculate profile data points for the altitude profile graph
 * Includes ALL sampled elevation points for accurate terrain visualization,
 * plus waypoints with full weather and condition data
 * @param waypoints - Array of waypoints from the flight plan
 * @param weatherData - Map of waypoint ID to weather data
 * @param defaultAltitude - Default altitude in feet (from flight plan aircraft profile)
 * @param elevationProfile - Optional array of elevation points from terrain sampling
 * @returns Array of profile data points
 */
export function calculateProfileData(
    waypoints: Waypoint[],
    weatherData: Map<string, WaypointWeather>,
    defaultAltitude: number = 3000,
    elevationProfile: ElevationPoint[] = []
): ProfileDataPoint[] {
    if (waypoints.length === 0) {
        return [];
    }

    const profilePoints: ProfileDataPoint[] = [];

    // Strategy: Include ALL elevation profile points for terrain detail,
    // marking waypoint indices so we can add weather data later

    if (elevationProfile.length > 0) {
        // Add all elevation profile points (includes waypoints + intermediate samples)
        elevationProfile.forEach((elevPoint) => {
            // Convert elevation from meters to feet
            const terrainElevation = metersToFeet(elevPoint.elevation);

            // Check if this is a waypoint
            const isWaypoint = elevPoint.waypointIndex !== undefined;
            const wp = isWaypoint ? waypoints[elevPoint.waypointIndex!] : undefined;
            const wx = wp ? weatherData.get(wp.id) : undefined;

            // For waypoints, use the waypoint's actual altitude; for terrain samples, interpolate
            const altitude = isWaypoint && wp
                ? (wp.altitude ?? defaultAltitude)
                : interpolateAltitude(elevPoint.distance, waypoints, defaultAltitude);

            // For waypoints, calculate full weather data
            let cloudBase: number | undefined;
            let cloudTop: number | undefined;
            let headwindComponent = 0;
            let crosswindComponent = 0;
            let windSpeed = 0;
            let windDir = 0;

            // Debug: log waypoint weather lookup
            if (isWaypoint && wp) {
                console.log(`[Profile Debug] Waypoint ${wp.name} (${wp.id}): wx=${wx ? 'found' : 'NOT FOUND'}, weatherData size=${weatherData.size}`);
                if (!wx && weatherData.size > 0) {
                    console.log(`[Profile Debug] Available keys:`, Array.from(weatherData.keys()));
                }
            }

            if (isWaypoint && wx && wp) {
                // Get cloud data
                if (wx.cloudBase !== undefined && wx.cloudBase !== null && !isNaN(wx.cloudBase) && wx.cloudBase > 0) {
                    const cloudBaseAGL = metersToFeet(wx.cloudBase);
                    const terrainMSL = terrainElevation ?? 0;
                    cloudBase = cloudBaseAGL + terrainMSL;
                    cloudTop = estimateCloudTop(cloudBase);
                }

                // Calculate wind components
                windSpeed = wx.windSpeed;
                windDir = wx.windDir;

                if (wp.bearing !== undefined) {
                    headwindComponent = calculateHeadwindComponent(wp.bearing, wx.windDir, wx.windSpeed);
                    const trackRad = (wp.bearing * Math.PI) / 180;
                    const windRad = (wx.windDir * Math.PI) / 180;
                    crosswindComponent = wx.windSpeed * Math.sin(trackRad - windRad);
                } else if (elevPoint.waypointIndex! > 0) {
                    const prevWp = waypoints[elevPoint.waypointIndex! - 1];
                    if (prevWp.bearing !== undefined) {
                        headwindComponent = calculateHeadwindComponent(prevWp.bearing, wx.windDir, wx.windSpeed);
                        const trackRad = (prevWp.bearing * Math.PI) / 180;
                        const windRad = (wx.windDir * Math.PI) / 180;
                        crosswindComponent = wx.windSpeed * Math.sin(trackRad - windRad);
                    }
                }
            } else if (!isWaypoint) {
                // Interpolate wind for terrain sample points (non-waypoints)
                // This fills the gap between waypoints with interpolated wind data
                const bearing = interpolateBearing(elevPoint.distance, waypoints);
                const interpolatedWind = interpolateWindBetweenWaypoints(
                    elevPoint.distance,
                    waypoints,
                    weatherData,
                    bearing
                );

                windSpeed = interpolatedWind.windSpeed;
                windDir = interpolatedWind.windDir;
                headwindComponent = interpolatedWind.headwindComponent;
                crosswindComponent = interpolatedWind.crosswindComponent;
            }

            // Create profile point
            const point: ProfileDataPoint = {
                distance: elevPoint.distance,
                altitude,
                terrainElevation,
                cloudBase,
                cloudTop,
                headwindComponent,
                crosswindComponent,
                windSpeed,
                windDir,
                verticalWinds: wx?.verticalWinds, // Pass through wind at all pressure levels
                waypointId: wp?.id,
                waypointName: wp?.name,
            };

            // Evaluate segment condition only for waypoints
            if (isWaypoint && wp) {
                const isTerminal = elevPoint.waypointIndex === 0 || elevPoint.waypointIndex === waypoints.length - 1;
                const conditionResult = evaluateSegmentCondition(point, altitude, wx, isTerminal, wp);
                point.condition = conditionResult.condition;
                point.conditionReasons = conditionResult.reasons;
            }

            profilePoints.push(point);
        });
    } else {
        // Fallback: No elevation profile, create points from waypoints only
        let cumulativeDistance = 0;

        waypoints.forEach((wp, index) => {
            const wx = weatherData.get(wp.id);
            const altitude = wp.altitude ?? defaultAltitude;
            const terrainElevation = wp.elevation ? metersToFeet(wp.elevation) : undefined;

            // Get cloud data
            let cloudBase: number | undefined;
            let cloudTop: number | undefined;
            if (wx?.cloudBase !== undefined && wx.cloudBase !== null && !isNaN(wx.cloudBase) && wx.cloudBase > 0) {
                const cloudBaseAGL = metersToFeet(wx.cloudBase);
                const terrainMSL = terrainElevation ?? 0;
                cloudBase = cloudBaseAGL + terrainMSL;
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

                if (wp.bearing !== undefined) {
                    headwindComponent = calculateHeadwindComponent(wp.bearing, wx.windDir, wx.windSpeed);
                    const trackRad = (wp.bearing * Math.PI) / 180;
                    const windRad = (wx.windDir * Math.PI) / 180;
                    crosswindComponent = wx.windSpeed * Math.sin(trackRad - windRad);
                } else if (index > 0) {
                    const prevWp = waypoints[index - 1];
                    if (prevWp.bearing !== undefined) {
                        headwindComponent = calculateHeadwindComponent(prevWp.bearing, wx.windDir, wx.windSpeed);
                        const trackRad = (prevWp.bearing * Math.PI) / 180;
                        const windRad = (wx.windDir * Math.PI) / 180;
                        crosswindComponent = wx.windSpeed * Math.sin(trackRad - windRad);
                    }
                }
            }

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
                verticalWinds: wx?.verticalWinds, // Pass through wind at all pressure levels
                waypointId: wp.id,
                waypointName: wp.name,
            };

            const isTerminal = index === 0 || index === waypoints.length - 1;
            const conditionResult = evaluateSegmentCondition(point, altitude, wx, isTerminal, wp);
            point.condition = conditionResult.condition;
            point.conditionReasons = conditionResult.reasons;

            profilePoints.push(point);

            if (index < waypoints.length - 1) {
                cumulativeDistance += wp.distance || 0;
            }
        });
    }

    return profilePoints;
}

