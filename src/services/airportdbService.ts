/**
 * AirportDB Service
 * Provides access to airport data from AirportDB.io
 * API Documentation: https://airportdb.io/
 *
 * Free airport database with ~60k airports including runways, frequencies, navaids
 */

import type { Waypoint, RunwayInfo } from '../types/flightPlan';
import type { WaypointType } from '../types/fpl';

const AIRPORTDB_BASE_URL = 'https://airportdb.io/api/v1/airport';

// AirportDB response interfaces
export interface AirportDBRunway {
    id: string;
    airport_ref: string;
    airport_ident: string;
    length_ft: number;
    width_ft: number;
    surface: string;
    lighted: boolean;
    closed: boolean;
    le_ident: string;
    le_latitude_deg: number;
    le_longitude_deg: number;
    le_elevation_ft: number;
    le_heading_degT: number;
    he_ident: string;
    he_latitude_deg: number;
    he_longitude_deg: number;
    he_elevation_ft: number;
    he_heading_degT: number;
}

export interface AirportDBFrequency {
    id: string;
    airport_ref: string;
    airport_ident: string;
    type: string;
    description: string;
    frequency_mhz: number;
}

export interface AirportDBNavaid {
    id: string;
    filename: string;
    ident: string;
    name: string;
    type: string;
    frequency_khz: number;
    latitude_deg: number;
    longitude_deg: number;
    elevation_ft: number;
    iso_country: string;
    dme_frequency_khz: number;
    dme_channel: string;
    dme_latitude_deg: number;
    dme_longitude_deg: number;
    dme_elevation_ft: number;
    slaved_variation_deg: number;
    magnetic_variation_deg: number;
    usageType: string;
    power: string;
    associated_airport: string;
}

export interface AirportDBCountry {
    id: string;
    code: string;
    name: string;
    continent: string;
    wikipedia_link: string;
    keywords: string;
}

export interface AirportDBRegion {
    id: string;
    code: string;
    local_code: string;
    name: string;
    continent: string;
    iso_country: string;
    wikipedia_link: string;
    keywords: string;
}

export interface AirportDBStation {
    icao_code: string;
    distance: number;
}

export interface AirportDBResult {
    icao_code: string;
    iata_code: string;
    name: string;
    type: string;
    latitude_deg: number;
    longitude_deg: number;
    elevation_ft: number;
    continent: string;
    iso_country: string;
    iso_region: string;
    municipality: string;
    scheduled_service: string;
    gps_code: string;
    local_code: string;
    home_link: string;
    wikipedia_link: string;
    keywords: string;
    runways: AirportDBRunway[];
    freqs: AirportDBFrequency[];
    country: AirportDBCountry;
    region: AirportDBRegion;
    navaids: AirportDBNavaid[];
    station: AirportDBStation;
}

/**
 * Map AirportDB airport type to ForeFlight waypoint type
 */
function mapAirportType(type: string): WaypointType {
    // AirportDB types: large_airport, medium_airport, small_airport, heliport, seaplane_base, closed
    return 'AIRPORT';
}

/**
 * Map navaid type to ForeFlight waypoint type
 */
function mapNavaidType(type: string): WaypointType {
    const upperType = type.toUpperCase();
    if (upperType.includes('NDB')) {
        return 'NDB';
    }
    if (upperType.includes('VOR') || upperType.includes('DME') || upperType.includes('TACAN')) {
        return 'VOR';
    }
    return 'VOR';
}

/**
 * Get airport type display name
 */
function getAirportTypeName(type: string): string {
    const typeMap: Record<string, string> = {
        'large_airport': 'Large Airport',
        'medium_airport': 'Medium Airport',
        'small_airport': 'Small Airport',
        'heliport': 'Heliport',
        'seaplane_base': 'Seaplane Base',
        'closed': 'Closed',
        'balloonport': 'Balloonport',
    };
    return typeMap[type] || 'Airport';
}

/**
 * Convert AirportDB runway to internal RunwayInfo format
 */
function convertRunway(runway: AirportDBRunway): RunwayInfo {
    return {
        id: runway.id,
        lengthFt: runway.length_ft,
        widthFt: runway.width_ft,
        surface: runway.surface,
        lighted: runway.lighted,
        closed: runway.closed,
        lowEnd: {
            ident: runway.le_ident,
            headingTrue: runway.le_heading_degT,
        },
        highEnd: {
            ident: runway.he_ident,
            headingTrue: runway.he_heading_degT,
        },
    };
}

/**
 * Convert AirportDB airport to internal Waypoint format
 */
export function airportToWaypoint(airport: AirportDBResult): Waypoint {
    const identifier = airport.icao_code || airport.iata_code || airport.gps_code || airport.local_code;

    // Convert runways, filtering out closed ones
    const runways: RunwayInfo[] = airport.runways
        ?.filter(rwy => !rwy.closed)
        .map(convertRunway) || [];

    return {
        id: `airportdb-apt-${identifier}-${Date.now()}`,
        name: identifier,
        type: mapAirportType(airport.type),
        lat: airport.latitude_deg,
        lon: airport.longitude_deg,
        elevation: airport.elevation_ft,
        countryCode: airport.iso_country,
        comment: airport.name,
        altitude: airport.elevation_ft, // Set altitude to airport elevation
        runways: runways.length > 0 ? runways : undefined,
    };
}

/**
 * Convert AirportDB navaid to internal Waypoint format
 */
export function navaidToWaypoint(navaid: AirportDBNavaid): Waypoint {
    const isNDB = navaid.type.toUpperCase().includes('NDB');
    const freqDisplay = navaid.frequency_khz
        ? (isNDB ? `${navaid.frequency_khz} kHz` : `${(navaid.frequency_khz / 1000).toFixed(2)} MHz`)
        : '';

    return {
        id: `airportdb-nav-${navaid.ident}-${Date.now()}`,
        name: navaid.ident,
        type: mapNavaidType(navaid.type),
        lat: navaid.latitude_deg,
        lon: navaid.longitude_deg,
        elevation: navaid.elevation_ft,
        countryCode: navaid.iso_country,
        frequency: navaid.frequency_khz,
        comment: `${navaid.type} - ${navaid.name}${freqDisplay ? ` (${freqDisplay})` : ''}`,
        altitude: navaid.elevation_ft, // Set altitude to navaid elevation
    };
}

/**
 * Search airport by ICAO code
 */
export async function getAirportByICAO(
    icaoCode: string,
    apiKey: string
): Promise<AirportDBResult | null> {
    if (!apiKey) {
        throw new Error('AirportDB API key is required');
    }

    const icao = icaoCode.toUpperCase().trim();
    if (!/^[A-Z0-9]{3,4}$/.test(icao)) {
        return null;
    }

    try {
        const response = await fetch(`${AIRPORTDB_BASE_URL}/${icao}?apiToken=${apiKey}`);

        if (response.status === 404) {
            return null;
        }

        if (!response.ok) {
            throw new Error(`AirportDB API error: ${response.status} ${response.statusText}`);
        }

        const data: AirportDBResult = await response.json();
        return data;
    } catch (error) {
        if (error instanceof Error && error.message.includes('404')) {
            return null;
        }
        throw error;
    }
}

/**
 * Search for airports - tries ICAO first, then checks if it might be a partial match
 * AirportDB doesn't have a search endpoint, so we can only do exact ICAO lookups
 */
export async function searchAirport(
    query: string,
    apiKey: string
): Promise<AirportDBResult | null> {
    if (!apiKey) {
        throw new Error('AirportDB API key is required');
    }

    const trimmedQuery = query.toUpperCase().trim();

    // Try exact ICAO lookup
    const result = await getAirportByICAO(trimmedQuery, apiKey);
    return result;
}

/**
 * Get display info for airport
 */
export function getAirportDisplayInfo(airport: AirportDBResult): {
    identifier: string;
    name: string;
    type: string;
    elevation?: string;
    municipality?: string;
} {
    const identifier = airport.icao_code || airport.iata_code || airport.gps_code || '----';

    return {
        identifier,
        name: airport.name,
        type: getAirportTypeName(airport.type),
        elevation: airport.elevation_ft ? `${airport.elevation_ft} ft` : undefined,
        municipality: airport.municipality,
    };
}

/**
 * Get display info for navaid
 */
export function getNavaidDisplayInfo(navaid: AirportDBNavaid): {
    identifier: string;
    name: string;
    type: string;
    frequency?: string;
} {
    const isNDB = navaid.type.toUpperCase().includes('NDB');
    let frequencyStr: string | undefined;

    if (navaid.frequency_khz) {
        if (isNDB) {
            frequencyStr = `${navaid.frequency_khz} kHz`;
        } else {
            frequencyStr = `${(navaid.frequency_khz / 1000).toFixed(2)} MHz`;
        }
    }

    return {
        identifier: navaid.ident,
        name: navaid.name,
        type: navaid.type,
        frequency: frequencyStr,
    };
}
