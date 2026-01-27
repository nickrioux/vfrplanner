/**
 * Airport Provider
 *
 * Abstraction layer that selects between AirportDB.io API and fallback data
 * based on API key availability.
 */

import type { RunwayInfo } from '../types/flightPlan';
import type { AirportDBResult } from './airportdbService';
import { getAirportByICAO } from './airportdbService';
import {
    getAirportByIcao as getFallbackAirport,
    getFallbackMeta,
    isAvailable as isFallbackAvailable,
} from './airportFallbackService';
import { logger } from './logger';

/**
 * Unified airport search result
 */
export interface AirportSearchResult {
    icao: string;
    iata?: string;
    name: string;
    lat: number;
    lon: number;
    elevation: number;
    type: string;
    municipality?: string;
    region: string;
    runways: RunwayInfo[];
    source: 'airportdb' | 'fallback';
}

/**
 * Airport provider interface
 */
export interface IAirportProvider {
    /**
     * Search for airport by ICAO code
     */
    searchByIcao(icao: string): Promise<AirportSearchResult | null>;

    /**
     * Check if using fallback data
     */
    isUsingFallback(): boolean;

    /**
     * Get provider name for display
     */
    getSourceName(): string;

    /**
     * Get coverage description (for fallback)
     */
    getCoverageDescription(): string | null;
}

/**
 * AirportDB.io provider implementation
 */
class AirportDbProvider implements IAirportProvider {
    constructor(private apiKey: string) {}

    async searchByIcao(icao: string): Promise<AirportSearchResult | null> {
        try {
            const result = await getAirportByICAO(icao, this.apiKey);
            if (!result) return null;

            return this.normalizeResult(result);
        } catch (error) {
            // Re-throw API errors - don't silently fall back
            throw error;
        }
    }

    isUsingFallback(): boolean {
        return false;
    }

    getSourceName(): string {
        return 'AirportDB.io';
    }

    getCoverageDescription(): string | null {
        return null; // Global coverage
    }

    private normalizeResult(apt: AirportDBResult): AirportSearchResult {
        const runways: RunwayInfo[] = (apt.runways || [])
            .filter(rwy => !rwy.closed)
            .map(rwy => ({
                id: rwy.id,
                lengthFt: rwy.length_ft,
                widthFt: rwy.width_ft,
                surface: rwy.surface,
                lighted: rwy.lighted,
                closed: rwy.closed,
                lowEnd: {
                    ident: rwy.le_ident,
                    headingTrue: rwy.le_heading_degT,
                },
                highEnd: {
                    ident: rwy.he_ident,
                    headingTrue: rwy.he_heading_degT,
                },
            }));

        return {
            icao: apt.icao_code || apt.gps_code || apt.local_code,
            iata: apt.iata_code || undefined,
            name: apt.name,
            lat: apt.latitude_deg,
            lon: apt.longitude_deg,
            elevation: apt.elevation_ft,
            type: apt.type,
            municipality: apt.municipality || undefined,
            region: apt.iso_region,
            runways,
            source: 'airportdb',
        };
    }
}

/**
 * Fallback provider implementation (embedded OurAirports data)
 */
class FallbackProvider implements IAirportProvider {
    async searchByIcao(icao: string): Promise<AirportSearchResult | null> {
        const apt = getFallbackAirport(icao);
        if (!apt) return null;

        return {
            ...apt,
            source: 'fallback',
        };
    }

    isUsingFallback(): boolean {
        return true;
    }

    getSourceName(): string {
        return 'Offline Data (OurAirports)';
    }

    getCoverageDescription(): string {
        const meta = getFallbackMeta();
        return `Canada + NE US (${meta.regions.us})`;
    }
}

/**
 * Create an airport provider based on configuration
 *
 * @param apiKey - AirportDB.io API key (optional)
 * @returns Airport provider instance
 */
export function createAirportProvider(apiKey?: string): IAirportProvider {
    if (apiKey && apiKey.trim().length > 0) {
        return new AirportDbProvider(apiKey);
    }

    if (!isFallbackAvailable()) {
        logger.warn('Fallback data not available');
    }

    return new FallbackProvider();
}

/**
 * Check if fallback data is available
 */
export function isFallbackDataAvailable(): boolean {
    return isFallbackAvailable();
}
