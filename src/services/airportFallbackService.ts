/**
 * Airport Fallback Service
 *
 * Provides airport lookup from embedded OurAirports data
 * Used when no AirportDB.io API key is configured
 */

import type { RunwayInfo } from '../types/flightPlan';

// Import generated JSON data
// This will be bundled at build time
import fallbackData from '../data/airports-fallback.json';

/**
 * Compact airport format from generated JSON
 */
interface CompactAirport {
    n: string;      // name
    la: number;     // latitude
    lo: number;     // longitude
    el: number;     // elevation (feet)
    t: string;      // type (abbreviated)
    m: string;      // municipality
    r: string;      // region
    rw?: CompactRunway[];  // runways
}

/**
 * Compact runway format from generated JSON
 */
interface CompactRunway {
    i: string;      // ident (e.g., "06L/24R")
    l: number;      // length (feet)
    w: number;      // width (feet)
    s: string;      // surface (abbreviated)
    hd: [number, number];  // headings [lowEnd, highEnd]
}

/**
 * Normalized airport result
 */
export interface FallbackAirport {
    icao: string;
    name: string;
    lat: number;
    lon: number;
    elevation: number;
    type: string;
    municipality: string;
    region: string;
    runways: RunwayInfo[];
}

/**
 * Fallback data metadata
 */
export interface FallbackMeta {
    generated: string;
    source: string;
    count: number;
    regions: {
        canada: string;
        us: string;
    };
}

// Type the imported data
const data = fallbackData as {
    meta: FallbackMeta;
    airports: Record<string, CompactAirport>;
};

/**
 * Expand abbreviated type back to full name
 */
function expandType(abbrev: string): string {
    const types: Record<string, string> = {
        'large': 'large_airport',
        'medium': 'medium_airport',
        'small': 'small_airport',
        'seaplane': 'seaplane_base',
    };
    return types[abbrev] || abbrev;
}

/**
 * Expand abbreviated surface type
 */
function expandSurface(abbrev: string): string {
    const surfaces: Record<string, string> = {
        'ASP': 'ASPHALT',
        'CON': 'CONCRETE',
        'GRV': 'GRAVEL',
        'TRF': 'TURF',
        'DRT': 'DIRT',
        'WTR': 'WATER',
        'SND': 'SAND',
        'UNK': 'UNKNOWN',
    };
    return surfaces[abbrev] || abbrev;
}

/**
 * Get fallback data metadata
 */
export function getFallbackMeta(): FallbackMeta {
    return data.meta;
}

/**
 * Check if an ICAO code exists in fallback data
 */
export function hasAirport(icao: string): boolean {
    const normalized = icao.toUpperCase().trim();
    return normalized in data.airports;
}

/**
 * Get airport by ICAO code from fallback data
 */
export function getAirportByIcao(icao: string): FallbackAirport | null {
    const normalized = icao.toUpperCase().trim();
    const apt = data.airports[normalized];

    if (!apt) {
        return null;
    }

    return expandAirport(normalized, apt);
}

/**
 * Search airports by partial ICAO code
 * Returns up to maxResults matches
 */
export function searchAirports(query: string, maxResults: number = 10): FallbackAirport[] {
    const normalized = query.toUpperCase().trim();
    if (!normalized) return [];

    const results: FallbackAirport[] = [];

    for (const [icao, apt] of Object.entries(data.airports)) {
        if (icao.startsWith(normalized)) {
            results.push(expandAirport(icao, apt));
            if (results.length >= maxResults) break;
        }
    }

    return results;
}

/**
 * Expand compact airport format to full format
 */
function expandAirport(icao: string, apt: CompactAirport): FallbackAirport {
    return {
        icao,
        name: apt.n,
        lat: apt.la,
        lon: apt.lo,
        elevation: apt.el,
        type: expandType(apt.t),
        municipality: apt.m,
        region: apt.r,
        runways: (apt.rw || []).map(expandRunway),
    };
}

/**
 * Expand compact runway format to RunwayInfo format
 */
function expandRunway(rwy: CompactRunway): RunwayInfo {
    const [leIdent, heIdent] = rwy.i.split('/');

    return {
        id: rwy.i,
        lengthFt: rwy.l,
        widthFt: rwy.w,
        surface: expandSurface(rwy.s),
        lighted: false,  // Not available in OurAirports basic data
        closed: false,
        lowEnd: {
            ident: leIdent,
            headingTrue: rwy.hd[0],
        },
        highEnd: {
            ident: heIdent,
            headingTrue: rwy.hd[1],
        },
    };
}

/**
 * Get total number of airports in fallback data
 */
export function getAirportCount(): number {
    return data.meta.count;
}

/**
 * Check if fallback data is loaded and valid
 */
export function isAvailable(): boolean {
    return data && data.airports && Object.keys(data.airports).length > 0;
}
