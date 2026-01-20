/**
 * AirportDB API Adapter
 * Handles airport and navaid lookups from airportdb.io
 */

import { HttpApiAdapter } from './HttpApiAdapter';
import type { ApiResponse } from './types';

/**
 * AirportDB runway data
 */
export interface AirportDbRunway {
    id: string;
    length_ft: number;
    width_ft: number;
    surface: string;
    lighted: boolean;
    closed: boolean;
    le_ident: string;
    le_heading_degT: number;
    le_displaced_threshold_ft: number;
    le_elevation_ft: number;
    he_ident: string;
    he_heading_degT: number;
    he_displaced_threshold_ft: number;
    he_elevation_ft: number;
}

/**
 * AirportDB frequency data
 */
export interface AirportDbFrequency {
    id: string;
    type: string;
    description: string;
    frequency_mhz: string;
}

/**
 * AirportDB navaid data
 */
export interface AirportDbNavaid {
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
    dme_frequency_khz?: number;
    dme_channel?: string;
    dme_latitude_deg?: number;
    dme_longitude_deg?: number;
    dme_elevation_ft?: number;
    slaved_variation_deg?: number;
    magnetic_variation_deg?: number;
    usageType?: string;
    power?: string;
    associated_airport?: string;
}

/**
 * AirportDB airport response
 */
export interface AirportDbAirport {
    id: string;
    ident: string;
    type: string;
    name: string;
    latitude_deg: number;
    longitude_deg: number;
    elevation_ft: number;
    continent: string;
    iso_country: string;
    iso_region: string;
    municipality: string;
    scheduled_service: string;
    gps_code: string;
    iata_code: string;
    local_code: string;
    home_link?: string;
    wikipedia_link?: string;
    keywords?: string;
    runways?: AirportDbRunway[];
    freqs?: AirportDbFrequency[];
    navaids?: AirportDbNavaid[];
}

/**
 * Normalized airport data for application use
 */
export interface NormalizedAirport {
    icao: string;
    iata?: string;
    name: string;
    latitude: number;
    longitude: number;
    elevation: number; // feet
    type: string;
    country: string;
    region: string;
    municipality: string;
    runways: NormalizedRunway[];
    frequencies: NormalizedFrequency[];
}

/**
 * Normalized runway data
 */
export interface NormalizedRunway {
    id: string;
    length: number; // feet
    width: number; // feet
    surface: string;
    lighted: boolean;
    closed: boolean;
    lowEnd: {
        ident: string;
        heading: number;
        elevation: number;
    };
    highEnd: {
        ident: string;
        heading: number;
        elevation: number;
    };
}

/**
 * Normalized frequency data
 */
export interface NormalizedFrequency {
    type: string;
    description: string;
    frequency: number; // MHz
}

/**
 * AirportDB API adapter
 */
export class AirportDbAdapter extends HttpApiAdapter {
    private static readonly BASE_URL = 'https://airportdb.io/api/v1';

    constructor(apiKey?: string, enableLogging = false) {
        super({
            baseUrl: AirportDbAdapter.BASE_URL,
            authType: 'query-param',
            authParamName: 'apiToken',
            timeout: 10000,
            enableLogging,
            maxRetries: 2,
        });

        if (apiKey) {
            this.setCredentials(apiKey);
        }
    }

    getName(): string {
        return 'AirportDB';
    }

    /**
     * Lookup airport by ICAO code
     */
    async getAirport(icao: string): Promise<ApiResponse<AirportDbAirport>> {
        if (!this.isReady()) {
            return {
                success: false,
                error: {
                    code: 'NO_CREDENTIALS',
                    message: 'AirportDB API key is required',
                    retryable: false,
                },
                status: 0,
                duration: 0,
            };
        }

        const normalizedIcao = icao.toUpperCase().trim();
        if (!/^[A-Z]{4}$/.test(normalizedIcao)) {
            return {
                success: false,
                error: {
                    code: 'INVALID_ICAO',
                    message: `Invalid ICAO code: ${icao}`,
                    retryable: false,
                },
                status: 0,
                duration: 0,
            };
        }

        return this.get<AirportDbAirport>(`/airport/${normalizedIcao}`);
    }

    /**
     * Lookup airport and return normalized data
     */
    async getAirportNormalized(icao: string): Promise<ApiResponse<NormalizedAirport>> {
        const response = await this.getAirport(icao);

        if (!response.success || !response.data) {
            return {
                ...response,
                data: undefined,
            } as ApiResponse<NormalizedAirport>;
        }

        return {
            ...response,
            data: this.normalizeAirport(response.data),
        };
    }

    /**
     * Normalize raw airport data to application format
     */
    private normalizeAirport(airport: AirportDbAirport): NormalizedAirport {
        return {
            icao: airport.ident,
            iata: airport.iata_code || undefined,
            name: airport.name,
            latitude: airport.latitude_deg,
            longitude: airport.longitude_deg,
            elevation: airport.elevation_ft,
            type: airport.type,
            country: airport.iso_country,
            region: airport.iso_region,
            municipality: airport.municipality,
            runways: (airport.runways || [])
                .filter((r) => !r.closed)
                .map((r) => this.normalizeRunway(r)),
            frequencies: (airport.freqs || []).map((f) => this.normalizeFrequency(f)),
        };
    }

    /**
     * Normalize runway data
     */
    private normalizeRunway(runway: AirportDbRunway): NormalizedRunway {
        return {
            id: runway.id,
            length: runway.length_ft,
            width: runway.width_ft,
            surface: runway.surface,
            lighted: runway.lighted,
            closed: runway.closed,
            lowEnd: {
                ident: runway.le_ident,
                heading: runway.le_heading_degT,
                elevation: runway.le_elevation_ft,
            },
            highEnd: {
                ident: runway.he_ident,
                heading: runway.he_heading_degT,
                elevation: runway.he_elevation_ft,
            },
        };
    }

    /**
     * Normalize frequency data
     */
    private normalizeFrequency(freq: AirportDbFrequency): NormalizedFrequency {
        return {
            type: freq.type,
            description: freq.description,
            frequency: parseFloat(freq.frequency_mhz),
        };
    }
}
