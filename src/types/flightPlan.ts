/**
 * Internal flight plan data model
 * Used for flight planning calculations and display
 */

import type { WaypointType } from './fpl';

export interface LatLon {
    lat: number;
    lon: number;
}

/** Runway end information for crosswind calculations */
export interface RunwayEnd {
    ident: string;          // e.g., "09", "27L"
    headingTrue: number;    // True heading in degrees
}

/** Runway information for an airport */
export interface RunwayInfo {
    id: string;
    lengthFt: number;
    widthFt: number;
    surface: string;
    lighted: boolean;
    closed: boolean;
    lowEnd: RunwayEnd;      // Lower numbered end (e.g., "09")
    highEnd: RunwayEnd;     // Higher numbered end (e.g., "27")
}

export interface Waypoint {
    id: string;
    name: string;
    type: WaypointType;
    lat: number;
    lon: number;
    comment?: string;
    elevation?: number; // feet MSL
    countryCode?: string; // ISO country code for FPL export
    frequency?: number; // For navaids (MHz for VOR, kHz for NDB)
    runways?: RunwayInfo[]; // For airports - runway data for crosswind calculations

    // User-configurable
    altitude?: number; // planned altitude in feet
    altitudeMode?: 'agl' | 'msl';
    airspeed?: number; // TAS in knots

    // Calculated navigation data (from previous waypoint)
    distance?: number; // NM
    bearing?: number; // magnetic degrees
    ete?: number; // estimated time enroute in minutes
    eta?: Date;

    // Weather data (after Read Wx)
    groundSpeed?: number; // knots
    windDir?: number; // degrees
    windSpeed?: number; // knots
    temperature?: number; // celsius
}

export interface LegData {
    distance: number; // NM
    bearing: number; // degrees true
    magneticBearing?: number; // degrees magnetic
    groundSpeed?: number; // knots
    ete?: number; // minutes
}

export interface FlightPlanTotals {
    distance: number; // NM
    ete: number; // minutes
    averageGroundSpeed?: number; // knots
    averageHeadwind?: number; // knots (positive = headwind, negative = tailwind)
}

export interface AircraftProfile {
    airspeed: number; // default TAS in knots
    defaultAltitude: number; // default altitude in feet
}

export interface FlightPlan {
    id: string;
    name: string;
    waypoints: Waypoint[];
    departureTime?: Date;
    aircraft: AircraftProfile;
    totals: FlightPlanTotals;
    sourceFile?: string; // original filename
    sourceFormat?: 'fpl' | 'gpx' | 'manual';
}

export interface FlightPlanState {
    flightPlan: FlightPlan | null;
    selectedWaypointId: string | null;
    isLoading: boolean;
    error: string | null;
}
