/**
 * Session Storage Service
 * Hybrid storage using Windy store (primary) with localStorage fallback
 * Provides mobile-compatible session persistence
 */

import store from '@windy/store';
import { logger } from './logger';

/**
 * Session data structure for persistence
 */
export interface SessionData {
    flightPlan: unknown | null;
    settings: unknown;
    departureTime: number;
    syncWithWindy: boolean;
    activeTab: string;
    maxProfileAltitude: number;
    profileScale: number;
    version: string;
}

/**
 * Create a session storage instance for a specific plugin
 */
export function createSessionStorage(pluginName: string) {
    const STORAGE_KEY = `vfr-planner-session-${pluginName}`;
    const WINDY_STORE_KEY = 'plugin-vfr-planner-session';

    /**
     * Save data to @windy/store
     * @returns true if save succeeded
     */
    function saveToWindyStore(data: object): boolean {
        try {
            (store as any).set(WINDY_STORE_KEY, data);
            return true;
        } catch (err) {
            logger.warn('Failed to save to Windy store:', err);
            return false;
        }
    }

    /**
     * Load data from @windy/store
     * @returns data object or null if not found/error
     */
    function loadFromWindyStore(): object | null {
        try {
            const data = (store as any).get(WINDY_STORE_KEY);
            if (data && typeof data === 'object') {
                return data;
            }
            return null;
        } catch (err) {
            logger.warn('Failed to load from Windy store:', err);
            return null;
        }
    }

    /**
     * Save data to localStorage
     * @returns true if save succeeded
     */
    function saveToLocalStorage(data: object): boolean {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
            return true;
        } catch (err) {
            logger.warn('Failed to save to localStorage:', err);
            return false;
        }
    }

    /**
     * Load data from localStorage
     * @returns data object or null if not found/error
     */
    function loadFromLocalStorage(): object | null {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (!saved) return null;
            return JSON.parse(saved);
        } catch (err) {
            logger.warn('Failed to load from localStorage:', err);
            return null;
        }
    }

    /**
     * Clear session data from both storage systems
     */
    function clear(): void {
        try {
            (store as any).set(WINDY_STORE_KEY, null);
        } catch (err) {
            logger.warn('Failed to clear Windy store session:', err);
        }
        try {
            localStorage.removeItem(STORAGE_KEY);
        } catch (err) {
            logger.warn('Failed to clear localStorage session:', err);
        }
    }

    /**
     * Save session data to both storage systems for redundancy
     * Windy store: primary, potentially cloud-synced in future
     * localStorage: fallback for mobile sandboxing issues
     */
    function save(data: object): boolean {
        const windySaved = saveToWindyStore(data);
        const localSaved = saveToLocalStorage(data);

        if (!windySaved && !localSaved) {
            logger.warn('Failed to save session to any storage');
            return false;
        }
        return true;
    }

    /**
     * Load session data from storage
     * Tries Windy store first (may be more reliable on mobile)
     * Falls back to localStorage if Windy store has no data
     */
    function load(): object | null {
        // Try Windy store first
        let data = loadFromWindyStore();

        if (!data) {
            // Fall back to localStorage
            data = loadFromLocalStorage();
        }

        return data;
    }

    return {
        save,
        load,
        clear,
        // Expose low-level functions for testing/debugging
        _saveToWindyStore: saveToWindyStore,
        _loadFromWindyStore: loadFromWindyStore,
        _saveToLocalStorage: saveToLocalStorage,
        _loadFromLocalStorage: loadFromLocalStorage,
    };
}

export type SessionStorage = ReturnType<typeof createSessionStorage>;
