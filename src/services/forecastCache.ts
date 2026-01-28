/**
 * TTL-based cache for weather forecast data
 * Provides automatic expiration and size limiting to manage memory
 */

import type { FullForecastData } from './weatherService';

/** Cache TTL in milliseconds (5 minutes) */
export const CACHE_TTL_MS = 5 * 60 * 1000;

/** Maximum number of cached entries */
export const MAX_CACHE_ENTRIES = 100;

interface CacheEntry {
    data: FullForecastData;
    expiresAt: number;
}

/**
 * Generate a cache key from location coordinates
 * Uses 4 decimal places (~11m precision) for consistent keying
 */
export function getCacheKey(lat: number, lon: number): string {
    return `${lat.toFixed(4)},${lon.toFixed(4)}`;
}

/**
 * TTL-based forecast cache with automatic cleanup
 */
export class ForecastCache {
    private cache: Map<string, CacheEntry> = new Map();

    /**
     * Get cached forecast data if it exists and hasn't expired
     * @param lat - Latitude
     * @param lon - Longitude
     * @returns Cached forecast data or null if not found/expired
     */
    get(lat: number, lon: number): FullForecastData | null {
        const key = getCacheKey(lat, lon);
        const entry = this.cache.get(key);

        if (!entry) {
            return null;
        }

        // Check if expired
        if (Date.now() > entry.expiresAt) {
            this.cache.delete(key);
            return null;
        }

        return entry.data;
    }

    /**
     * Store forecast data in cache with TTL
     * @param lat - Latitude
     * @param lon - Longitude
     * @param data - Forecast data to cache
     */
    set(lat: number, lon: number, data: FullForecastData): void {
        // Cleanup expired entries if cache is getting large
        if (this.cache.size >= MAX_CACHE_ENTRIES) {
            this.cleanup();
        }

        // If still at capacity after cleanup, remove oldest entries
        if (this.cache.size >= MAX_CACHE_ENTRIES) {
            this.evictOldest(Math.ceil(MAX_CACHE_ENTRIES * 0.2));
        }

        const key = getCacheKey(lat, lon);
        this.cache.set(key, {
            data,
            expiresAt: Date.now() + CACHE_TTL_MS,
        });
    }

    /**
     * Check if a location has valid cached data
     * @param lat - Latitude
     * @param lon - Longitude
     * @returns True if valid cached data exists
     */
    has(lat: number, lon: number): boolean {
        return this.get(lat, lon) !== null;
    }

    /**
     * Remove all expired entries from cache
     */
    cleanup(): void {
        const now = Date.now();
        for (const [key, entry] of this.cache) {
            if (now > entry.expiresAt) {
                this.cache.delete(key);
            }
        }
    }

    /**
     * Evict the oldest entries from cache
     * @param count - Number of entries to evict
     */
    private evictOldest(count: number): void {
        const entries = Array.from(this.cache.entries())
            .sort((a, b) => a[1].expiresAt - b[1].expiresAt);

        for (let i = 0; i < Math.min(count, entries.length); i++) {
            this.cache.delete(entries[i][0]);
        }
    }

    /**
     * Clear all cached data
     */
    clear(): void {
        this.cache.clear();
    }

    /**
     * Get current cache size
     */
    get size(): number {
        return this.cache.size;
    }
}

/** Singleton cache instance for forecast data */
export const forecastCache = new ForecastCache();
