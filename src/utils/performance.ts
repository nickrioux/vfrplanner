/**
 * Performance Monitoring Utilities
 * Provides instrumentation for measuring and tracking performance metrics
 */

/**
 * Performance metric entry
 */
export interface PerformanceMetric {
    name: string;
    startTime: number;
    endTime?: number;
    duration?: number;
    metadata?: Record<string, unknown>;
}

/**
 * Performance summary for a category
 */
export interface PerformanceSummary {
    category: string;
    count: number;
    totalDuration: number;
    avgDuration: number;
    minDuration: number;
    maxDuration: number;
    p95Duration: number;
}

/**
 * Performance monitoring configuration
 */
export interface PerformanceConfig {
    /** Enable performance monitoring */
    enabled: boolean;
    /** Maximum number of metrics to keep in memory */
    maxMetrics: number;
    /** Slow operation threshold in ms */
    slowThreshold: number;
    /** Log slow operations to console */
    logSlowOperations: boolean;
    /** Categories to track (empty = all) */
    trackedCategories: string[];
}

/**
 * Default performance configuration
 */
const DEFAULT_CONFIG: PerformanceConfig = {
    enabled: true,
    maxMetrics: 1000,
    slowThreshold: 1000,
    logSlowOperations: false,
    trackedCategories: [],
};

/**
 * Performance Monitor class
 * Singleton for tracking application performance
 */
class PerformanceMonitor {
    private static instance: PerformanceMonitor;
    private config: PerformanceConfig;
    private metrics: Map<string, PerformanceMetric[]> = new Map();
    private activeTimers: Map<string, PerformanceMetric> = new Map();

    private constructor(config: Partial<PerformanceConfig> = {}) {
        this.config = { ...DEFAULT_CONFIG, ...config };
    }

    /**
     * Get or create the singleton instance
     */
    static getInstance(config?: Partial<PerformanceConfig>): PerformanceMonitor {
        if (!PerformanceMonitor.instance) {
            PerformanceMonitor.instance = new PerformanceMonitor(config);
        } else if (config) {
            PerformanceMonitor.instance.configure(config);
        }
        return PerformanceMonitor.instance;
    }

    /**
     * Update configuration
     */
    configure(config: Partial<PerformanceConfig>): void {
        this.config = { ...this.config, ...config };
    }

    /**
     * Check if category should be tracked
     */
    private shouldTrack(category: string): boolean {
        if (!this.config.enabled) return false;
        if (this.config.trackedCategories.length === 0) return true;
        return this.config.trackedCategories.includes(category);
    }

    /**
     * Start timing an operation
     */
    startTimer(name: string, category = 'default', metadata?: Record<string, unknown>): string {
        if (!this.shouldTrack(category)) return '';

        const id = `${category}:${name}:${Date.now()}:${Math.random().toString(36).slice(2)}`;
        const metric: PerformanceMetric = {
            name,
            startTime: performance.now(),
            metadata: { category, ...metadata },
        };

        this.activeTimers.set(id, metric);
        return id;
    }

    /**
     * End timing an operation
     */
    endTimer(id: string): number {
        if (!id) return 0;

        const metric = this.activeTimers.get(id);
        if (!metric) return 0;

        metric.endTime = performance.now();
        metric.duration = metric.endTime - metric.startTime;

        this.activeTimers.delete(id);
        this.recordMetric(metric);

        // Log slow operations
        if (
            this.config.logSlowOperations &&
            metric.duration > this.config.slowThreshold
        ) {
            console.warn(
                `[Performance] Slow operation: ${metric.name} took ${metric.duration.toFixed(2)}ms`,
                metric.metadata
            );
        }

        return metric.duration;
    }

    /**
     * Record a completed metric
     */
    private recordMetric(metric: PerformanceMetric): void {
        const category = (metric.metadata?.category as string) || 'default';

        if (!this.metrics.has(category)) {
            this.metrics.set(category, []);
        }

        const categoryMetrics = this.metrics.get(category)!;
        categoryMetrics.push(metric);

        // Trim if exceeding max
        if (categoryMetrics.length > this.config.maxMetrics) {
            categoryMetrics.splice(0, categoryMetrics.length - this.config.maxMetrics);
        }
    }

    /**
     * Measure an async operation
     */
    async measure<T>(
        name: string,
        operation: () => Promise<T>,
        category = 'default',
        metadata?: Record<string, unknown>
    ): Promise<T> {
        const id = this.startTimer(name, category, metadata);
        try {
            return await operation();
        } finally {
            this.endTimer(id);
        }
    }

    /**
     * Measure a sync operation
     */
    measureSync<T>(
        name: string,
        operation: () => T,
        category = 'default',
        metadata?: Record<string, unknown>
    ): T {
        const id = this.startTimer(name, category, metadata);
        try {
            return operation();
        } finally {
            this.endTimer(id);
        }
    }

    /**
     * Get metrics for a category
     */
    getMetrics(category: string): PerformanceMetric[] {
        return this.metrics.get(category) || [];
    }

    /**
     * Get all categories
     */
    getCategories(): string[] {
        return Array.from(this.metrics.keys());
    }

    /**
     * Get summary for a category
     */
    getSummary(category: string): PerformanceSummary | null {
        const metrics = this.metrics.get(category);
        if (!metrics || metrics.length === 0) return null;

        const durations = metrics
            .filter((m) => m.duration !== undefined)
            .map((m) => m.duration!);

        if (durations.length === 0) return null;

        durations.sort((a, b) => a - b);
        const totalDuration = durations.reduce((sum, d) => sum + d, 0);
        const p95Index = Math.floor(durations.length * 0.95);

        return {
            category,
            count: durations.length,
            totalDuration,
            avgDuration: totalDuration / durations.length,
            minDuration: durations[0],
            maxDuration: durations[durations.length - 1],
            p95Duration: durations[p95Index],
        };
    }

    /**
     * Get summary for all categories
     */
    getAllSummaries(): PerformanceSummary[] {
        return this.getCategories()
            .map((cat) => this.getSummary(cat))
            .filter((summary): summary is PerformanceSummary => summary !== null);
    }

    /**
     * Clear metrics for a category
     */
    clearMetrics(category?: string): void {
        if (category) {
            this.metrics.delete(category);
        } else {
            this.metrics.clear();
        }
    }

    /**
     * Export metrics as JSON
     */
    exportMetrics(): string {
        const data: Record<string, PerformanceMetric[]> = {};
        for (const [category, metrics] of this.metrics) {
            data[category] = metrics;
        }
        return JSON.stringify(data, null, 2);
    }

    /**
     * Generate a performance report
     */
    generateReport(): string {
        const summaries = this.getAllSummaries();
        if (summaries.length === 0) {
            return 'No performance metrics recorded.';
        }

        const lines: string[] = [
            '=== Performance Report ===',
            `Generated: ${new Date().toISOString()}`,
            '',
        ];

        for (const summary of summaries) {
            lines.push(`Category: ${summary.category}`);
            lines.push(`  Operations: ${summary.count}`);
            lines.push(`  Total Time: ${summary.totalDuration.toFixed(2)}ms`);
            lines.push(`  Avg Time: ${summary.avgDuration.toFixed(2)}ms`);
            lines.push(`  Min Time: ${summary.minDuration.toFixed(2)}ms`);
            lines.push(`  Max Time: ${summary.maxDuration.toFixed(2)}ms`);
            lines.push(`  P95 Time: ${summary.p95Duration.toFixed(2)}ms`);
            lines.push('');
        }

        return lines.join('\n');
    }
}

// Export singleton accessor
export const perfMonitor = PerformanceMonitor.getInstance;

/**
 * Decorator for measuring method performance
 * Usage: @measurePerformance('category')
 */
export function measurePerformance(category = 'default') {
    return function <T extends (...args: unknown[]) => unknown>(
        _target: unknown,
        propertyKey: string,
        descriptor: TypedPropertyDescriptor<T>
    ): TypedPropertyDescriptor<T> {
        const originalMethod = descriptor.value!;

        descriptor.value = function (this: unknown, ...args: unknown[]) {
            const monitor = perfMonitor();
            const id = monitor.startTimer(propertyKey, category);
            try {
                const result = originalMethod.apply(this, args);
                // Handle promises
                if (result instanceof Promise) {
                    return result.finally(() => monitor.endTimer(id));
                }
                monitor.endTimer(id);
                return result;
            } catch (error) {
                monitor.endTimer(id);
                throw error;
            }
        } as T;

        return descriptor;
    };
}

/**
 * Performance categories for VFR Planner
 */
export const PERF_CATEGORIES = {
    API_CALLS: 'api-calls',
    WEATHER_FETCH: 'weather-fetch',
    ROUTE_CALCULATION: 'route-calculation',
    ELEVATION_FETCH: 'elevation-fetch',
    VFR_EVALUATION: 'vfr-evaluation',
    RENDERING: 'rendering',
    FILE_EXPORT: 'file-export',
} as const;
