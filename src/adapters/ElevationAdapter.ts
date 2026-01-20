/**
 * Elevation API Adapter
 * Handles terrain elevation lookups from Open-Meteo API
 */

import { HttpApiAdapter } from './HttpApiAdapter';
import type { ApiResponse } from './types';

/**
 * Coordinate point
 */
export interface Coordinate {
    latitude: number;
    longitude: number;
}

/**
 * Elevation point with position
 */
export interface ElevationPoint extends Coordinate {
    elevation: number; // meters
}

/**
 * Batch elevation response
 */
export interface BatchElevationResponse {
    points: ElevationPoint[];
    totalPoints: number;
}

/**
 * Open-Meteo elevation API response
 */
interface OpenMeteoResponse {
    elevation: number[];
}

/**
 * Elevation API adapter for Open-Meteo
 */
export class ElevationAdapter extends HttpApiAdapter {
    private static readonly BASE_URL = 'https://api.open-meteo.com/v1';
    private static readonly MAX_POINTS_PER_REQUEST = 100;
    private static readonly COORDINATE_PRECISION = 6;

    constructor(enableLogging = false) {
        super({
            baseUrl: ElevationAdapter.BASE_URL,
            authType: 'none', // Open-Meteo is free, no auth required
            timeout: 10000,
            enableLogging,
            maxRetries: 3,
        });
    }

    getName(): string {
        return 'Elevation';
    }

    /**
     * Get elevation for a single point
     */
    async getElevation(coordinate: Coordinate): Promise<ApiResponse<number>> {
        const response = await this.getElevations([coordinate]);

        if (!response.success || !response.data) {
            return {
                ...response,
                data: undefined,
            } as ApiResponse<number>;
        }

        return {
            ...response,
            data: response.data.points[0]?.elevation ?? 0,
        };
    }

    /**
     * Get elevations for multiple points (batched)
     */
    async getElevations(
        coordinates: Coordinate[]
    ): Promise<ApiResponse<BatchElevationResponse>> {
        if (coordinates.length === 0) {
            return {
                success: true,
                data: { points: [], totalPoints: 0 },
                status: 200,
                duration: 0,
            };
        }

        const startTime = Date.now();

        // Split into batches if needed
        const batches = this.splitIntoBatches(
            coordinates,
            ElevationAdapter.MAX_POINTS_PER_REQUEST
        );

        const results: ElevationPoint[] = [];
        let lastError: ApiResponse<BatchElevationResponse> | null = null;

        // Process batches sequentially to respect API rate limits
        for (const batch of batches) {
            const response = await this.fetchBatch(batch);

            if (!response.success) {
                lastError = response;
                // Continue with partial results
                continue;
            }

            if (response.data) {
                results.push(...response.data.points);
            }
        }

        const duration = Date.now() - startTime;

        // Return partial results if we have any
        if (results.length > 0) {
            return {
                success: true,
                data: {
                    points: results,
                    totalPoints: results.length,
                },
                status: 200,
                duration,
            };
        }

        // All batches failed
        if (lastError) {
            return {
                ...lastError,
                duration,
            };
        }

        return {
            success: true,
            data: { points: [], totalPoints: 0 },
            status: 200,
            duration,
        };
    }

    /**
     * Get elevations along a route (interpolated points)
     */
    async getRouteElevations(
        route: Coordinate[],
        samplingDistanceMeters = 1000
    ): Promise<ApiResponse<ElevationPoint[]>> {
        if (route.length < 2) {
            return {
                success: false,
                error: {
                    code: 'INVALID_ROUTE',
                    message: 'Route must have at least 2 points',
                    retryable: false,
                },
                status: 0,
                duration: 0,
            };
        }

        // Generate interpolated points along the route
        const sampledPoints = this.sampleRoute(route, samplingDistanceMeters);

        // Get elevations for all points
        const response = await this.getElevations(sampledPoints);

        if (!response.success || !response.data) {
            return {
                ...response,
                data: undefined,
            } as ApiResponse<ElevationPoint[]>;
        }

        return {
            ...response,
            data: response.data.points,
        };
    }

    /**
     * Fetch elevation data for a single batch of coordinates
     */
    private async fetchBatch(
        coordinates: Coordinate[]
    ): Promise<ApiResponse<BatchElevationResponse>> {
        // Format coordinates with limited precision
        const latitudes = coordinates
            .map((c) => c.latitude.toFixed(ElevationAdapter.COORDINATE_PRECISION))
            .join(',');
        const longitudes = coordinates
            .map((c) => c.longitude.toFixed(ElevationAdapter.COORDINATE_PRECISION))
            .join(',');

        const response = await this.get<OpenMeteoResponse>('/elevation', {
            params: {
                latitude: latitudes,
                longitude: longitudes,
            },
        });

        if (!response.success || !response.data) {
            return {
                ...response,
                data: undefined,
            } as ApiResponse<BatchElevationResponse>;
        }

        // Combine coordinates with elevations
        const elevations = response.data.elevation;
        const points: ElevationPoint[] = coordinates.map((coord, index) => ({
            latitude: coord.latitude,
            longitude: coord.longitude,
            elevation: elevations[index] ?? 0,
        }));

        return {
            ...response,
            data: {
                points,
                totalPoints: points.length,
            },
        };
    }

    /**
     * Split coordinates into batches
     */
    private splitIntoBatches(
        coordinates: Coordinate[],
        batchSize: number
    ): Coordinate[][] {
        const batches: Coordinate[][] = [];
        for (let i = 0; i < coordinates.length; i += batchSize) {
            batches.push(coordinates.slice(i, i + batchSize));
        }
        return batches;
    }

    /**
     * Sample points along a route at specified intervals
     */
    private sampleRoute(
        route: Coordinate[],
        intervalMeters: number
    ): Coordinate[] {
        const sampledPoints: Coordinate[] = [route[0]];
        let accumulatedDistance = 0;

        for (let i = 1; i < route.length; i++) {
            const prev = route[i - 1];
            const curr = route[i];
            const segmentDistance = this.haversineDistance(prev, curr);

            accumulatedDistance += segmentDistance;

            while (accumulatedDistance >= intervalMeters) {
                // Calculate position for interpolated point
                const overshoot = accumulatedDistance - intervalMeters;
                const fraction = 1 - overshoot / segmentDistance;
                const interpolated = this.interpolatePoint(prev, curr, fraction);
                sampledPoints.push(interpolated);
                accumulatedDistance -= intervalMeters;
            }
        }

        // Always include the last point
        const lastPoint = route[route.length - 1];
        const lastSampled = sampledPoints[sampledPoints.length - 1];
        if (
            lastSampled.latitude !== lastPoint.latitude ||
            lastSampled.longitude !== lastPoint.longitude
        ) {
            sampledPoints.push(lastPoint);
        }

        return sampledPoints;
    }

    /**
     * Calculate distance between two points using Haversine formula
     */
    private haversineDistance(p1: Coordinate, p2: Coordinate): number {
        const R = 6371000; // Earth's radius in meters
        const lat1 = this.toRadians(p1.latitude);
        const lat2 = this.toRadians(p2.latitude);
        const deltaLat = this.toRadians(p2.latitude - p1.latitude);
        const deltaLon = this.toRadians(p2.longitude - p1.longitude);

        const a =
            Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
            Math.cos(lat1) *
                Math.cos(lat2) *
                Math.sin(deltaLon / 2) *
                Math.sin(deltaLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

        return R * c;
    }

    /**
     * Interpolate between two points
     */
    private interpolatePoint(
        p1: Coordinate,
        p2: Coordinate,
        fraction: number
    ): Coordinate {
        return {
            latitude: p1.latitude + (p2.latitude - p1.latitude) * fraction,
            longitude: p1.longitude + (p2.longitude - p1.longitude) * fraction,
        };
    }

    /**
     * Convert degrees to radians
     */
    private toRadians(degrees: number): number {
        return degrees * (Math.PI / 180);
    }
}
