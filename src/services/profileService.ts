/**
 * Profile service for calculating altitude profile data
 * Provides functions to calculate profile data points for the altitude profile graph
 */

import type { Waypoint, RunwayInfo } from '../types/flightPlan';
import type { WaypointWeather, LevelWind } from './weatherService';
import type { VfrConditionThresholds } from '../types/conditionThresholds';
import type { AircraftPerformance } from '../types/settings';
import { calculateHeadwindComponent, calculateWindComponents, type WindComponents } from './navigationCalc';
import { logger } from './logger';
import { getElevationForWaypoint, getElevationAtDistance, type ElevationPoint } from './elevationService';
import { interpolateWindBetweenWaypoints, interpolateBearing } from '../utils/interpolation';
import { metersToFeet } from '../utils/units';
import { evaluateAllRules, type ConditionCriteria } from './vfrConditionRules';

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
 * @deprecated Use calculateWindComponents from navigationCalc for new code
 */
export function calculateWindComponent(
    trackBearing: number,
    windDir: number,
    windSpeed: number
): WindComponents {
    // Delegate to centralized implementation
    return calculateWindComponents(trackBearing, windDir, windSpeed);
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
    waypoint?: Waypoint,
    thresholds?: VfrConditionThresholds
): { condition: SegmentCondition; reasons: string[]; bestRunway?: BestRunwayResult } {
    const reasons: string[] = [];

    // Check for missing critical data
    // For terminal waypoints, surface wind is acceptable if altitude wind is missing
    const hasAltitudeWind = point.windSpeed !== undefined && point.windSpeed !== 0;
    const hasSurfaceWind = isTerminal && wx?.surfaceWindSpeed !== undefined && wx.surfaceWindSpeed !== 0;

    if (!hasAltitudeWind && !hasSurfaceWind) {
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

        // Debug logging for cloud/altitude evaluation
        logger.debug(`[Condition] ${waypoint?.name || 'Unknown'}: ` +
            `cloudBaseMSL=${Math.round(cloudBaseMSL)}ft, ` +
            `cloudBaseAGL=${Math.round(cloudBaseAGL)}ft, ` +
            `terrainMSL=${Math.round(terrainMSL)}ft, ` +
            `flightAlt=${Math.round(flightAltitude)}ft, ` +
            `cloudClearance=${Math.round(cloudClearance)}ft`);

        // Check for IMC conditions (flying in clouds) - CRITICAL
        if (flightAltitude >= cloudBaseMSL) {
            logger.debug(`[Condition] ${waypoint?.name || 'Unknown'}: IMC detected - flight ${Math.round(flightAltitude)}ft >= cloudBase ${Math.round(cloudBaseMSL)}ft`);
            reasons.push('Aircraft above cloud base (IMC)');
            return { condition: 'poor', reasons };
        }
    } else {
        logger.debug(`[Condition] ${waypoint?.name || 'Unknown'}: No cloud data (clear sky)`);
    }

    // Initialize best runway for terminal waypoints
    let bestRunway: BestRunwayResult | undefined;

    // Collect base criteria for evaluation
    // For terminal waypoints, use surface wind as fallback if altitude wind is missing
    const effectiveWindSpeed = point.windSpeed ?? (isTerminal ? wx?.surfaceWindSpeed : undefined) ?? 0;

    const criteria: ConditionCriteria = {
        windSpeed: effectiveWindSpeed,
        gustSpeed,
        cloudBaseAGL: cloudBaseAGL ?? 999999, // Use very high value for clear sky
        visibility,
        precipitation,
        terrainClearance,
        cloudClearance: cloudClearance ?? 999999, // Use very high value for clear sky
    };

    // For terminal waypoints, calculate surface wind and runway components
    // High winds and gusts are primarily a concern for takeoff and landing operations
    if (isTerminal && wx) {
        const terminalWindSpeed = wx.surfaceWindSpeed ?? criteria.windSpeed;
        const terminalWindDir = wx.surfaceWindDir ?? point.windDir;

        // Add terminal wind speed to criteria
        criteria.terminalWindSpeed = terminalWindSpeed;
        criteria.terminalWindDir = terminalWindDir;

        logger.debug(`[VFR Runway] Terminal waypoint: ${waypoint?.name}, hasRunways: ${!!waypoint?.runways}, count: ${waypoint?.runways?.length ?? 0}`);
        logger.debug(`[VFR Runway] Surface wind: ${Math.round(terminalWindDir)}° @ ${Math.round(terminalWindSpeed)}kt`);

        // Calculate crosswind/headwind if runway data is available
        if (waypoint?.runways && waypoint.runways.length > 0) {
            logger.debug(`[VFR Runway] Runways available:`, waypoint.runways.map(r => `${r.lowEnd.ident}/${r.highEnd.ident} (${r.lowEnd.headingTrue}°/${r.highEnd.headingTrue}°)`));
            bestRunway = findBestRunway(waypoint.runways, terminalWindDir, terminalWindSpeed) ?? undefined;

            if (bestRunway) {
                logger.debug(`[VFR Runway] Best runway: ${bestRunway.runwayIdent}, crosswind: ${Math.round(bestRunway.crosswindKt)}kt, headwind: ${Math.round(bestRunway.headwindKt)}kt`);
                // Add runway wind components to criteria for rules evaluation
                criteria.crosswindKt = bestRunway.crosswindKt;
                criteria.headwindKt = bestRunway.headwindKt;
            }
        }
    }

    // Use rules-based evaluation with thresholds
    const ruleResult = evaluateAllRules(criteria, isTerminal, thresholds);

    // Debug logging for final result
    if (ruleResult.condition !== 'good') {
        logger.debug(`[Condition] ${waypoint?.name || 'Unknown'}: Result=${ruleResult.condition.toUpperCase()}, ` +
            `reasons=[${ruleResult.reasons.join(', ')}]`);
    }

    return {
        condition: ruleResult.condition,
        reasons: ruleResult.reasons,
        bestRunway,
    };
}

/**
 * Segment condition types for VFR flight conditions
 */
export type SegmentCondition = 'good' | 'marginal' | 'poor' | 'unknown';

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
    isTopOfClimb?: boolean;      // TOC marker
    isTopOfDescent?: boolean;    // TOD marker
}

/**
 * Compute climb/descent profile distances and peak altitude
 * Returns distances for TOC/TOD and the effective cruise altitude
 * (which may be reduced for short routes where climb+descent overlap)
 */
export function computeClimbDescentProfile(
    waypoints: Waypoint[],
    performance: AircraftPerformance
): { climbDistNM: number; descentDistNM: number; peakAltitude: number; totalDist: number; departureElev: number; arrivalElev: number } {
    // wp[i].distance is the incoming leg (from wp[i-1] to wp[i]); wp[0].distance = 0
    const totalDist = waypoints.reduce((sum, wp) => sum + (wp.distance || 0), 0);
    const departureElev = waypoints[0].elevation ?? 0;
    const arrivalElev = waypoints[waypoints.length - 1].elevation ?? 0;

    const climbAltGain = Math.max(0, performance.cruiseAltitude - departureElev);
    const climbTimeMin = climbAltGain / performance.rateOfClimb;
    const climbDistNM = (performance.climbSpeed / 60) * climbTimeMin;

    const descentAltLoss = Math.max(0, performance.cruiseAltitude - arrivalElev);
    const descentTimeMin = descentAltLoss / performance.rateOfDescent;
    const descentDistNM = (performance.descentSpeed / 60) * descentTimeMin;

    if (climbDistNM + descentDistNM > totalDist && totalDist > 0) {
        // Triangular profile: climb and descent meet before reaching cruise altitude
        // Solve for peak altitude where climb distance + descent distance = totalDist
        // climbDist = (climbSpeed/60) * (peakAlt - depElev) / ROC
        // descentDist = (descentSpeed/60) * (peakAlt - arrElev) / ROD
        // climbDist + descentDist = totalDist
        const climbRate = (performance.climbSpeed / 60) / performance.rateOfClimb; // NM per ft
        const descentRate = (performance.descentSpeed / 60) / performance.rateOfDescent; // NM per ft
        const peakAltitude = (totalDist + climbRate * departureElev + descentRate * arrivalElev) / (climbRate + descentRate);
        const adjClimbDist = climbRate * (peakAltitude - departureElev);
        const adjDescentDist = descentRate * (peakAltitude - arrivalElev);
        return { climbDistNM: adjClimbDist, descentDistNM: adjDescentDist, peakAltitude, totalDist, departureElev, arrivalElev };
    }

    return { climbDistNM, descentDistNM, peakAltitude: performance.cruiseAltitude, totalDist, departureElev, arrivalElev };
}

/**
 * Interpolate altitude between waypoints
 * When performance data is provided, models realistic climb/descent phases
 * @param distance - Distance along route in NM
 * @param waypoints - Array of waypoints
 * @param defaultAltitude - Default altitude if no waypoint altitude specified
 * @param performance - Optional aircraft performance for climb/descent modeling
 * @returns Interpolated altitude in feet MSL
 */
export function interpolateAltitude(
    distance: number,
    waypoints: Waypoint[],
    defaultAltitude: number,
    performance?: AircraftPerformance
): number {
    if (waypoints.length === 0) return defaultAltitude;
    if (waypoints.length === 1) return waypoints[0].altitude ?? defaultAltitude;

    // Performance-based altitude profile
    if (performance && waypoints.length >= 2) {
        const { climbDistNM, descentDistNM, peakAltitude, totalDist, departureElev, arrivalElev } = computeClimbDescentProfile(waypoints, performance);

        if (totalDist <= 0) return defaultAltitude;

        const descentStartDist = totalDist - descentDistNM;

        if (distance <= 0) {
            return departureElev;
        } else if (distance >= totalDist) {
            return arrivalElev;
        } else if (distance <= climbDistNM) {
            // Climb phase: linear from departure to peak
            const t = distance / climbDistNM;
            return departureElev + (peakAltitude - departureElev) * t;
        } else if (distance >= descentStartDist) {
            // Descent phase: linear from peak to arrival
            const t = (distance - descentStartDist) / descentDistNM;
            return peakAltitude + (arrivalElev - peakAltitude) * t;
        } else {
            // Cruise phase
            return peakAltitude;
        }
    }

    // Fallback: simple linear interpolation between waypoints
    let cumulativeDistance = 0;

    for (let i = 0; i < waypoints.length - 1; i++) {
        const wp1 = waypoints[i];
        const wp2 = waypoints[i + 1];
        // wp[i+1].distance is the incoming leg length (from wp[i] to wp[i+1])
        const legDistance = wp2.distance || 0;

        if (distance >= cumulativeDistance && distance <= cumulativeDistance + legDistance) {
            const alt1 = wp1.altitude ?? defaultAltitude;
            const alt2 = wp2.altitude ?? defaultAltitude;
            const t = (distance - cumulativeDistance) / legDistance;
            return alt1 + (alt2 - alt1) * t;
        }

        cumulativeDistance += legDistance;
    }

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
 * @param thresholds - Optional custom VFR condition thresholds (uses defaults if not provided)
 * @returns Array of profile data points
 */
export function calculateProfileData(
    waypoints: Waypoint[],
    weatherData: Map<string, WaypointWeather>,
    defaultAltitude: number = 3000,
    elevationProfile: ElevationPoint[] = [],
    thresholds?: VfrConditionThresholds,
    performance?: AircraftPerformance
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
                : interpolateAltitude(elevPoint.distance, waypoints, defaultAltitude, performance);

            // For waypoints, calculate full weather data
            let cloudBase: number | undefined;
            let cloudTop: number | undefined;
            let headwindComponent = 0;
            let crosswindComponent = 0;
            let windSpeed = 0;
            let windDir = 0;

            // Debug: log waypoint weather lookup
            if (isWaypoint && wp) {
                logger.debug(`[Profile Debug] Waypoint ${wp.name} (${wp.id}): wx=${wx ? 'found' : 'NOT FOUND'}, weatherData size=${weatherData.size}`);
                if (!wx && weatherData.size > 0) {
                    logger.debug(`[Profile Debug] Available keys:`, Array.from(weatherData.keys()));
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
                const conditionResult = evaluateSegmentCondition(point, altitude, wx, isTerminal, wp, thresholds);
                point.condition = conditionResult.condition;
                point.conditionReasons = conditionResult.reasons;
            }

            profilePoints.push(point);
        });
    } else {
        // Fallback: No elevation profile, create points from waypoints only
        let cumulativeDistance = 0;

        waypoints.forEach((wp, index) => {
            // wp.distance is the incoming leg (from previous waypoint); wp[0].distance = 0
            // Accumulate before creating the point so each waypoint is at the correct position
            cumulativeDistance += wp.distance || 0;

            const wx = weatherData.get(wp.id);
            const altitude = performance
                ? interpolateAltitude(cumulativeDistance, waypoints, defaultAltitude, performance)
                : (wp.altitude ?? defaultAltitude);
            // wp.elevation is already in feet MSL (no conversion needed)
            const terrainElevation = wp.elevation ?? undefined;

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
            const conditionResult = evaluateSegmentCondition(point, altitude, wx, isTerminal, wp, thresholds);
            point.condition = conditionResult.condition;
            point.conditionReasons = conditionResult.reasons;

            profilePoints.push(point);
        });
    }

    // Insert synthetic TOC/TOD points at exact computed distances
    if (performance && waypoints.length >= 2 && profilePoints.length > 0) {
        const { climbDistNM, descentDistNM, peakAltitude, totalDist } = computeClimbDescentProfile(waypoints, performance);
        const descentStartDist = totalDist - descentDistNM;

        // Helper: interpolate terrain elevation from surrounding profile points
        function interpolateTerrainAt(dist: number): number | undefined {
            for (let i = 0; i < profilePoints.length - 1; i++) {
                if (dist >= profilePoints[i].distance && dist <= profilePoints[i + 1].distance) {
                    const e1 = profilePoints[i].terrainElevation;
                    const e2 = profilePoints[i + 1].terrainElevation;
                    if (e1 === undefined || e2 === undefined) return e1 ?? e2;
                    const segLen = profilePoints[i + 1].distance - profilePoints[i].distance;
                    if (segLen <= 0) return e1;
                    const t = (dist - profilePoints[i].distance) / segLen;
                    return e1 + (e2 - e1) * t;
                }
            }
            return profilePoints[profilePoints.length - 1].terrainElevation;
        }

        // Helper: interpolate wind from surrounding profile points
        function interpolateWindAt(dist: number): { windSpeed: number; windDir: number; headwindComponent: number; crosswindComponent: number } {
            for (let i = 0; i < profilePoints.length - 1; i++) {
                if (dist >= profilePoints[i].distance && dist <= profilePoints[i + 1].distance) {
                    const p1 = profilePoints[i];
                    const p2 = profilePoints[i + 1];
                    const segLen = p2.distance - p1.distance;
                    if (segLen <= 0) return { windSpeed: p1.windSpeed, windDir: p1.windDir, headwindComponent: p1.headwindComponent, crosswindComponent: p1.crosswindComponent };
                    const t = (dist - p1.distance) / segLen;
                    return {
                        windSpeed: p1.windSpeed + (p2.windSpeed - p1.windSpeed) * t,
                        windDir: p1.windDir + (p2.windDir - p1.windDir) * t,
                        headwindComponent: p1.headwindComponent + (p2.headwindComponent - p1.headwindComponent) * t,
                        crosswindComponent: p1.crosswindComponent + (p2.crosswindComponent - p1.crosswindComponent) * t,
                    };
                }
            }
            const last = profilePoints[profilePoints.length - 1];
            return { windSpeed: last.windSpeed, windDir: last.windDir, headwindComponent: last.headwindComponent, crosswindComponent: last.crosswindComponent };
        }

        // Insert TOC as synthetic point
        if (climbDistNM > 0 && climbDistNM < totalDist) {
            const wind = interpolateWindAt(climbDistNM);
            const tocSynthetic: ProfileDataPoint = {
                distance: climbDistNM,
                altitude: peakAltitude,
                terrainElevation: interpolateTerrainAt(climbDistNM),
                headwindComponent: wind.headwindComponent,
                crosswindComponent: wind.crosswindComponent,
                windSpeed: wind.windSpeed,
                windDir: wind.windDir,
                isTopOfClimb: true,
            };
            // Find insertion index (sorted by distance)
            const tocIdx = profilePoints.findIndex(p => p.distance > climbDistNM);
            if (tocIdx === -1) {
                profilePoints.push(tocSynthetic);
            } else {
                profilePoints.splice(tocIdx, 0, tocSynthetic);
            }
        }

        // Insert TOD as synthetic point
        if (descentDistNM > 0 && descentStartDist > 0 && descentStartDist < totalDist) {
            const wind = interpolateWindAt(descentStartDist);
            const todSynthetic: ProfileDataPoint = {
                distance: descentStartDist,
                altitude: peakAltitude,
                terrainElevation: interpolateTerrainAt(descentStartDist),
                headwindComponent: wind.headwindComponent,
                crosswindComponent: wind.crosswindComponent,
                windSpeed: wind.windSpeed,
                windDir: wind.windDir,
                isTopOfDescent: true,
            };
            const todIdx = profilePoints.findIndex(p => p.distance > descentStartDist);
            if (todIdx === -1) {
                profilePoints.push(todSynthetic);
            } else {
                profilePoints.splice(todIdx, 0, todSynthetic);
            }
        }
    }

    return profilePoints;
}

