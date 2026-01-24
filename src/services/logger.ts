/**
 * Centralized logging service for VFR Planner
 * Provides controlled logging with configurable verbosity
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LOG_PREFIX = '[VFR Planner]';

/**
 * Logger class with configurable output
 * Defaults to disabled; call setEnabled(true) to enable logging
 */
class Logger {
    private enabled: boolean = false;
    private level: LogLevel = 'debug';

    /**
     * Enable or disable all logging output
     */
    setEnabled(enabled: boolean): void {
        this.enabled = enabled;
    }

    /**
     * Check if logging is currently enabled
     */
    isEnabled(): boolean {
        return this.enabled;
    }

    /**
     * Set minimum log level to output
     */
    setLevel(level: LogLevel): void {
        this.level = level;
    }

    /**
     * Debug level logging - most verbose
     */
    debug(message: string, ...args: unknown[]): void {
        if (this.enabled && this.shouldLog('debug')) {
            console.log(`${LOG_PREFIX} ${message}`, ...args);
        }
    }

    /**
     * Info level logging - general information
     */
    info(message: string, ...args: unknown[]): void {
        if (this.enabled && this.shouldLog('info')) {
            console.info(`${LOG_PREFIX} ${message}`, ...args);
        }
    }

    /**
     * Warning level logging - potential issues
     */
    warn(message: string, ...args: unknown[]): void {
        if (this.enabled && this.shouldLog('warn')) {
            console.warn(`${LOG_PREFIX} ${message}`, ...args);
        }
    }

    /**
     * Error level logging - errors and failures
     * Note: Errors are always logged regardless of enabled state
     */
    error(message: string, ...args: unknown[]): void {
        // Errors are always logged for debugging critical issues
        console.error(`${LOG_PREFIX} ${message}`, ...args);
    }

    /**
     * Group related log messages together
     */
    group(label: string): void {
        if (this.enabled) {
            console.group(`${LOG_PREFIX} ${label}`);
        }
    }

    /**
     * End a log group
     */
    groupEnd(): void {
        if (this.enabled) {
            console.groupEnd();
        }
    }

    /**
     * Log a table of data (useful for arrays/objects)
     */
    table(data: unknown, columns?: string[]): void {
        if (this.enabled && this.shouldLog('debug')) {
            console.table(data, columns);
        }
    }

    /**
     * Check if message should be logged based on level
     */
    private shouldLog(messageLevel: LogLevel): boolean {
        const levels: LogLevel[] = ['debug', 'info', 'warn', 'error'];
        return levels.indexOf(messageLevel) >= levels.indexOf(this.level);
    }
}

/**
 * Singleton logger instance
 * Usage:
 *   import { logger } from './services/logger';
 *   logger.setEnabled(settings.enableLogging);
 *   logger.debug('Processing waypoint', waypointData);
 */
export const logger = new Logger();
