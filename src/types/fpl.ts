/**
 * ForeFlight/Garmin FPL file format types
 * Based on Garmin FlightPlan v1 XML schema
 * Schema: http://www8.garmin.com/xmlschemas/FlightPlan/v1
 */

export type WaypointType =
    | 'AIRPORT'
    | 'USER WAYPOINT'
    | 'VOR'
    | 'NDB'
    | 'INT'
    | 'INT-VRP';

export interface FPLWaypoint {
    identifier: string;
    type: WaypointType;
    countryCode: string;
    lat: number;
    lon: number;
    comment?: string;
    elevation?: number;
}

export interface FPLRoutePoint {
    waypointIdentifier: string;
    waypointType: WaypointType;
    waypointCountryCode: string;
}

export interface FPLRoute {
    name: string;
    description?: string;
    flightPlanIndex: number;
    points: FPLRoutePoint[];
}

export interface FPLFlightPlan {
    created?: Date;
    waypointTable: FPLWaypoint[];
    route?: FPLRoute;
}

export interface FPLParseResult {
    success: boolean;
    flightPlan?: FPLFlightPlan;
    error?: string;
}

export interface FPLValidationError {
    field: string;
    message: string;
    value?: unknown;
}

export interface FPLValidationResult {
    valid: boolean;
    errors: FPLValidationError[];
}
