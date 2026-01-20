/**
 * OpenAIP API Adapter
 * Handles airport and navaid searches from api.core.openaip.net
 */

import { HttpApiAdapter } from './HttpApiAdapter';
import type { ApiResponse, PaginatedResponse, PaginationInfo } from './types';

/**
 * OpenAIP airport data (raw API response)
 */
export interface OpenAipAirport {
    _id: string;
    name: string;
    icaoCode?: string;
    iataCode?: string;
    altIdentifier?: string;
    type: number;
    country: string;
    geometry: {
        type: 'Point';
        coordinates: [number, number]; // [lon, lat]
    };
    elevation: {
        value: number;
        unit: number; // 1 = meters, 6 = feet
    };
    runways?: OpenAipRunway[];
    frequencies?: OpenAipFrequency[];
    services?: {
        fuel?: boolean;
        customs?: boolean;
        handling?: boolean;
    };
}

/**
 * OpenAIP runway data
 */
export interface OpenAipRunway {
    designator: string;
    trueHeading: number;
    alignedTrueNorth?: boolean;
    operations: number;
    mainRunway: boolean;
    dimension: {
        length: { value: number; unit: number };
        width: { value: number; unit: number };
    };
    surface: {
        mainComposite: number;
        composition: number[];
    };
    thresholdCoordinate?: {
        lat: number;
        lon: number;
    };
}

/**
 * OpenAIP frequency data
 */
export interface OpenAipFrequency {
    value: string;
    unit: number;
    type: number;
    name: string;
    primary: boolean;
}

/**
 * OpenAIP navaid data
 */
export interface OpenAipNavaid {
    _id: string;
    name: string;
    identifier: string;
    type: number;
    geometry: {
        type: 'Point';
        coordinates: [number, number];
    };
    elevation?: {
        value: number;
        unit: number;
    };
    frequency?: {
        value: number;
        unit: number;
    };
    channel?: string;
    coverage?: number;
    magneticDeclination?: number;
}

/**
 * OpenAIP paginated response structure
 */
interface OpenAipPaginatedResponse<T> {
    items: T[];
    limit: number;
    totalCount: number;
    totalPages: number;
    page: number;
}

/**
 * Airport type mapping
 */
export const AIRPORT_TYPES: Record<number, string> = {
    0: 'Airport',
    1: 'Gliding',
    2: 'Airfield',
    3: 'Heliport',
    4: 'Ultralight',
    5: 'Parachuting',
    6: 'Hang Gliding',
    7: 'Balloon Port',
    8: 'Seaplane Base',
};

/**
 * Navaid type mapping
 */
export const NAVAID_TYPES: Record<number, string> = {
    0: 'DVOR',
    1: 'DVOR/DME',
    2: 'TACAN',
    3: 'VOR',
    4: 'VOR/DME',
    5: 'VORTAC',
    6: 'NDB',
    7: 'DME',
};

/**
 * Frequency type mapping
 */
export const FREQUENCY_TYPES: Record<number, string> = {
    0: 'Approach',
    1: 'Arrival',
    2: 'Departure',
    3: 'Info (AFIS)',
    4: 'Ground',
    5: 'Tower',
    6: 'ATIS',
    7: 'Radio',
    8: 'Other',
    9: 'UNICOM',
    10: 'Radar',
    11: 'Clearance',
    12: 'Apron',
    13: 'Control',
    14: 'CTAF',
    15: 'Multicom',
    16: 'Emergency',
    17: 'Gliding',
};

/**
 * Search options for airports
 */
export interface AirportSearchOptions {
    /** Search query (ICAO, IATA, or name) */
    query?: string;
    /** Search near position [longitude, latitude] */
    position?: [number, number];
    /** Maximum distance in meters (for position search) */
    distance?: number;
    /** Maximum results per page */
    limit?: number;
    /** Page number */
    page?: number;
    /** Airport types to include */
    types?: number[];
}

/**
 * Search options for navaids
 */
export interface NavaidSearchOptions {
    /** Search query (identifier or name) */
    query?: string;
    /** Search near position [longitude, latitude] */
    position?: [number, number];
    /** Maximum distance in meters */
    distance?: number;
    /** Maximum results per page */
    limit?: number;
    /** Page number */
    page?: number;
    /** Navaid types to include */
    types?: number[];
}

/**
 * OpenAIP API adapter
 */
export class OpenAipAdapter extends HttpApiAdapter {
    private static readonly BASE_URL = 'https://api.core.openaip.net/api';

    constructor(apiKey?: string, enableLogging = false) {
        super({
            baseUrl: OpenAipAdapter.BASE_URL,
            authType: 'query-param',
            authParamName: 'apiKey',
            timeout: 15000,
            enableLogging,
            maxRetries: 2,
        });

        if (apiKey) {
            this.setCredentials(apiKey);
        }
    }

    getName(): string {
        return 'OpenAIP';
    }

    /**
     * Search airports
     */
    async searchAirports(
        options: AirportSearchOptions = {}
    ): Promise<ApiResponse<PaginatedResponse<OpenAipAirport>>> {
        if (!this.isReady()) {
            return {
                success: false,
                error: {
                    code: 'NO_CREDENTIALS',
                    message: 'OpenAIP API key is required',
                    retryable: false,
                },
                status: 0,
                duration: 0,
            };
        }

        const params: Record<string, string | number | undefined> = {
            limit: options.limit ?? 20,
            page: options.page ?? 1,
        };

        if (options.query) {
            params.search = options.query;
        }

        if (options.position) {
            params.pos = `${options.position[0]},${options.position[1]}`;
            params.dist = options.distance ?? 50000;
            params.sort = 'distance';
        }

        if (options.types && options.types.length > 0) {
            params.type = options.types.join(',');
        }

        const response = await this.get<OpenAipPaginatedResponse<OpenAipAirport>>(
            '/airports',
            { params }
        );

        if (!response.success || !response.data) {
            return {
                ...response,
                data: undefined,
            } as ApiResponse<PaginatedResponse<OpenAipAirport>>;
        }

        return {
            ...response,
            data: this.transformPaginatedResponse(response.data),
        };
    }

    /**
     * Search navaids
     */
    async searchNavaids(
        options: NavaidSearchOptions = {}
    ): Promise<ApiResponse<PaginatedResponse<OpenAipNavaid>>> {
        if (!this.isReady()) {
            return {
                success: false,
                error: {
                    code: 'NO_CREDENTIALS',
                    message: 'OpenAIP API key is required',
                    retryable: false,
                },
                status: 0,
                duration: 0,
            };
        }

        const params: Record<string, string | number | undefined> = {
            limit: options.limit ?? 20,
            page: options.page ?? 1,
        };

        if (options.query) {
            params.search = options.query;
        }

        if (options.position) {
            params.pos = `${options.position[0]},${options.position[1]}`;
            params.dist = options.distance ?? 50000;
            params.sort = 'distance';
        }

        if (options.types && options.types.length > 0) {
            params.type = options.types.join(',');
        }

        const response = await this.get<OpenAipPaginatedResponse<OpenAipNavaid>>(
            '/navaids',
            { params }
        );

        if (!response.success || !response.data) {
            return {
                ...response,
                data: undefined,
            } as ApiResponse<PaginatedResponse<OpenAipNavaid>>;
        }

        return {
            ...response,
            data: this.transformPaginatedResponse(response.data),
        };
    }

    /**
     * Search both airports and navaids (unified search)
     */
    async searchAll(
        query: string,
        limit = 10
    ): Promise<
        ApiResponse<{
            airports: OpenAipAirport[];
            navaids: OpenAipNavaid[];
        }>
    > {
        const startTime = Date.now();

        // Execute both searches in parallel
        const [airportsResult, navaidsResult] = await Promise.all([
            this.searchAirports({ query, limit }),
            this.searchNavaids({ query, limit }),
        ]);

        const duration = Date.now() - startTime;

        // If both failed, return the first error
        if (!airportsResult.success && !navaidsResult.success) {
            return {
                success: false,
                error: airportsResult.error,
                status: airportsResult.status,
                duration,
            };
        }

        return {
            success: true,
            data: {
                airports: airportsResult.data?.items ?? [],
                navaids: navaidsResult.data?.items ?? [],
            },
            status: 200,
            duration,
        };
    }

    /**
     * Find nearby airports and navaids
     */
    async findNearby(
        position: [number, number],
        distance = 50000,
        limit = 10
    ): Promise<
        ApiResponse<{
            airports: OpenAipAirport[];
            navaids: OpenAipNavaid[];
        }>
    > {
        const startTime = Date.now();

        // Execute both searches in parallel
        const [airportsResult, navaidsResult] = await Promise.all([
            this.searchAirports({ position, distance, limit }),
            this.searchNavaids({ position, distance, limit }),
        ]);

        const duration = Date.now() - startTime;

        // If both failed, return the first error
        if (!airportsResult.success && !navaidsResult.success) {
            return {
                success: false,
                error: airportsResult.error,
                status: airportsResult.status,
                duration,
            };
        }

        return {
            success: true,
            data: {
                airports: airportsResult.data?.items ?? [],
                navaids: navaidsResult.data?.items ?? [],
            },
            status: 200,
            duration,
        };
    }

    /**
     * Get airport elevation in feet (handles unit conversion)
     */
    static getElevationFeet(airport: OpenAipAirport): number {
        if (!airport.elevation) return 0;
        // Unit 1 = meters, unit 6 = feet
        if (airport.elevation.unit === 1) {
            return Math.round(airport.elevation.value * 3.28084);
        }
        return airport.elevation.value;
    }

    /**
     * Get airport type name
     */
    static getAirportTypeName(type: number): string {
        return AIRPORT_TYPES[type] ?? 'Unknown';
    }

    /**
     * Get navaid type name
     */
    static getNavaidTypeName(type: number): string {
        return NAVAID_TYPES[type] ?? 'Unknown';
    }

    /**
     * Get frequency type name
     */
    static getFrequencyTypeName(type: number): string {
        return FREQUENCY_TYPES[type] ?? 'Other';
    }

    /**
     * Transform OpenAIP pagination to standard format
     */
    private transformPaginatedResponse<T>(
        response: OpenAipPaginatedResponse<T>
    ): PaginatedResponse<T> {
        const pagination: PaginationInfo = {
            page: response.page,
            limit: response.limit,
            totalCount: response.totalCount,
            totalPages: response.totalPages,
            hasMore: response.page < response.totalPages,
        };

        return {
            items: response.items,
            pagination,
        };
    }
}
