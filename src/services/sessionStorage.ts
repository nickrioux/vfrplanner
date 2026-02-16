/**
 * Session Storage Service
 * Uses localStorage for session persistence
 */

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
     * Clear session data
     */
    function clear(): void {
        try {
            localStorage.removeItem(STORAGE_KEY);
        } catch (err) {
            logger.warn('Failed to clear localStorage session:', err);
        }
    }

    /**
     * Save session data
     */
    function save(data: object): boolean {
        return saveToLocalStorage(data);
    }

    /**
     * Load session data
     */
    function load(): object | null {
        return loadFromLocalStorage();
    }

    return {
        save,
        load,
        clear,
    };
}

export type SessionStorage = ReturnType<typeof createSessionStorage>;
