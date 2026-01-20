/**
 * HTTP API Adapter
 * Base implementation for HTTP-based API adapters
 */

import type {
    ApiConfig,
    ApiError,
    ApiResponse,
    IApiAdapter,
    RequestInterceptor,
    RequestOptions,
    ResponseInterceptor,
    RetryConfig,
} from './types';
import { DEFAULT_RETRY_CONFIG, DEFAULT_TIMEOUT } from './types';

/**
 * Abstract HTTP API adapter with common functionality
 */
export abstract class HttpApiAdapter implements IApiAdapter {
    protected config: ApiConfig;
    protected credentials: string | null = null;
    protected requestInterceptors: RequestInterceptor[] = [];
    protected responseInterceptors: ResponseInterceptor[] = [];
    protected retryConfig: RetryConfig;

    constructor(config: ApiConfig) {
        this.config = {
            timeout: DEFAULT_TIMEOUT,
            enableLogging: false,
            maxRetries: DEFAULT_RETRY_CONFIG.maxAttempts,
            retryBaseDelay: DEFAULT_RETRY_CONFIG.baseDelay,
            ...config,
        };
        this.retryConfig = {
            ...DEFAULT_RETRY_CONFIG,
            maxAttempts: this.config.maxRetries ?? DEFAULT_RETRY_CONFIG.maxAttempts,
            baseDelay: this.config.retryBaseDelay ?? DEFAULT_RETRY_CONFIG.baseDelay,
        };
    }

    /**
     * Get adapter name - must be implemented by subclasses
     */
    abstract getName(): string;

    /**
     * Check if adapter is ready (has required credentials)
     */
    isReady(): boolean {
        if (this.config.authType === 'none') {
            return true;
        }
        return this.credentials !== null && this.credentials.length > 0;
    }

    /**
     * Set API credentials
     */
    setCredentials(credentials: string): void {
        this.credentials = credentials;
    }

    /**
     * Add a request interceptor
     */
    addRequestInterceptor(interceptor: RequestInterceptor): void {
        this.requestInterceptors.push(interceptor);
    }

    /**
     * Add a response interceptor
     */
    addResponseInterceptor(interceptor: ResponseInterceptor): void {
        this.responseInterceptors.push(interceptor);
    }

    /**
     * Make a GET request
     */
    async get<T>(endpoint: string, options?: RequestOptions): Promise<ApiResponse<T>> {
        return this.request<T>(endpoint, { ...options, method: 'GET' });
    }

    /**
     * Make a POST request
     */
    async post<T>(endpoint: string, options?: RequestOptions): Promise<ApiResponse<T>> {
        return this.request<T>(endpoint, { ...options, method: 'POST' });
    }

    /**
     * Make a PUT request
     */
    async put<T>(endpoint: string, options?: RequestOptions): Promise<ApiResponse<T>> {
        return this.request<T>(endpoint, { ...options, method: 'PUT' });
    }

    /**
     * Make a DELETE request
     */
    async delete<T>(endpoint: string, options?: RequestOptions): Promise<ApiResponse<T>> {
        return this.request<T>(endpoint, { ...options, method: 'DELETE' });
    }

    /**
     * Core request method with retry logic
     */
    protected async request<T>(
        endpoint: string,
        options: RequestOptions = {}
    ): Promise<ApiResponse<T>> {
        const startTime = Date.now();
        const method = options.method ?? 'GET';
        const timeout = options.timeout ?? this.config.timeout ?? DEFAULT_TIMEOUT;

        // Build URL with query parameters
        let url = this.buildUrl(endpoint, options.params, options.skipAuth);

        // Build request options
        let fetchOptions: RequestInit = {
            method,
            headers: this.buildHeaders(options),
        };

        // Add body for non-GET requests
        if (options.body && method !== 'GET') {
            fetchOptions.body = JSON.stringify(options.body);
        }

        // Apply request interceptors
        for (const interceptor of this.requestInterceptors) {
            const result = await interceptor(url, fetchOptions);
            url = result.url;
            fetchOptions = result.options;
        }

        // Log request if enabled
        if (this.config.enableLogging) {
            console.log(`[${this.getName()}] ${method} ${url}`);
        }

        // Execute with retry logic
        const maxAttempts = options.skipRetry ? 1 : this.retryConfig.maxAttempts;
        let lastError: ApiError | null = null;

        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
                const response = await this.fetchWithTimeout(url, fetchOptions, timeout);
                const duration = Date.now() - startTime;

                // Apply response interceptors
                let processedResponse = response;
                for (const interceptor of this.responseInterceptors) {
                    processedResponse = await interceptor(processedResponse, duration);
                }

                // Log response if enabled
                if (this.config.enableLogging) {
                    console.log(
                        `[${this.getName()}] ${processedResponse.status} (${duration}ms)`
                    );
                }

                // Handle response
                if (processedResponse.ok) {
                    const data = await this.parseResponse<T>(processedResponse);
                    return {
                        success: true,
                        data,
                        status: processedResponse.status,
                        duration,
                    };
                }

                // Handle error response
                const error = await this.parseErrorResponse(processedResponse);

                // Check if we should retry
                if (
                    attempt < maxAttempts &&
                    this.retryConfig.retryableStatuses.includes(processedResponse.status)
                ) {
                    lastError = error;
                    const delay = this.calculateRetryDelay(attempt);
                    if (this.config.enableLogging) {
                        console.log(
                            `[${this.getName()}] Retry ${attempt}/${maxAttempts} after ${delay}ms`
                        );
                    }
                    await this.sleep(delay);
                    continue;
                }

                return {
                    success: false,
                    error,
                    status: processedResponse.status,
                    duration,
                };
            } catch (err) {
                const duration = Date.now() - startTime;
                const error = this.createNetworkError(err);

                // Retry on network errors
                if (attempt < maxAttempts && error.retryable) {
                    lastError = error;
                    const delay = this.calculateRetryDelay(attempt);
                    if (this.config.enableLogging) {
                        console.log(
                            `[${this.getName()}] Network error, retry ${attempt}/${maxAttempts} after ${delay}ms`
                        );
                    }
                    await this.sleep(delay);
                    continue;
                }

                return {
                    success: false,
                    error,
                    status: 0,
                    duration,
                };
            }
        }

        // All retries exhausted
        return {
            success: false,
            error: lastError ?? {
                code: 'MAX_RETRIES',
                message: 'Maximum retry attempts exceeded',
                retryable: false,
            },
            status: 0,
            duration: Date.now() - startTime,
        };
    }

    /**
     * Build full URL with query parameters
     */
    protected buildUrl(
        endpoint: string,
        params?: Record<string, string | number | boolean | undefined>,
        skipAuth?: boolean
    ): string {
        const url = new URL(endpoint, this.config.baseUrl);

        // Add authentication as query parameter if configured
        if (
            !skipAuth &&
            this.config.authType === 'query-param' &&
            this.config.authParamName &&
            this.credentials
        ) {
            url.searchParams.set(this.config.authParamName, this.credentials);
        }

        // Add additional query parameters
        if (params) {
            for (const [key, value] of Object.entries(params)) {
                if (value !== undefined) {
                    url.searchParams.set(key, String(value));
                }
            }
        }

        return url.toString();
    }

    /**
     * Build request headers
     */
    protected buildHeaders(options: RequestOptions): Record<string, string> {
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
            ...options.headers,
        };

        // Add authentication header if configured
        if (!options.skipAuth && this.credentials) {
            if (this.config.authType === 'bearer') {
                headers['Authorization'] = `Bearer ${this.credentials}`;
            } else if (
                this.config.authType === 'header' &&
                this.config.authHeaderName
            ) {
                headers[this.config.authHeaderName] = this.credentials;
            }
        }

        return headers;
    }

    /**
     * Fetch with timeout protection
     */
    protected async fetchWithTimeout(
        url: string,
        options: RequestInit,
        timeout: number
    ): Promise<Response> {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        try {
            const response = await fetch(url, {
                ...options,
                signal: controller.signal,
            });
            return response;
        } finally {
            clearTimeout(timeoutId);
        }
    }

    /**
     * Parse successful response
     */
    protected async parseResponse<T>(response: Response): Promise<T> {
        const contentType = response.headers.get('content-type');
        if (contentType?.includes('application/json')) {
            return response.json();
        }
        return response.text() as unknown as T;
    }

    /**
     * Parse error response
     */
    protected async parseErrorResponse(response: Response): Promise<ApiError> {
        let message = `${response.status} ${response.statusText}`;

        try {
            const contentType = response.headers.get('content-type');
            if (contentType?.includes('application/json')) {
                const errorData = await response.json();
                message = errorData.message || errorData.error || message;
            } else {
                const text = await response.text();
                if (text) {
                    message = text.substring(0, 200);
                }
            }
        } catch {
            // Use default message
        }

        return {
            code: String(response.status),
            message: `${this.getName()} API error: ${message}`,
            retryable: this.retryConfig.retryableStatuses.includes(response.status),
        };
    }

    /**
     * Create network error object
     */
    protected createNetworkError(err: unknown): ApiError {
        const error = err instanceof Error ? err : new Error(String(err));
        const isTimeout = error.name === 'AbortError';

        return {
            code: isTimeout ? 'TIMEOUT' : 'NETWORK_ERROR',
            message: isTimeout
                ? `${this.getName()} request timed out`
                : `${this.getName()} network error: ${error.message}`,
            originalError: error,
            retryable: !isTimeout, // Timeouts are generally not retryable
        };
    }

    /**
     * Calculate retry delay with exponential backoff
     */
    protected calculateRetryDelay(attempt: number): number {
        const delay = this.retryConfig.baseDelay * Math.pow(2, attempt - 1);
        // Add jitter (0-25% random variance)
        const jitter = delay * 0.25 * Math.random();
        return Math.min(delay + jitter, this.retryConfig.maxDelay);
    }

    /**
     * Sleep helper
     */
    protected sleep(ms: number): Promise<void> {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
}
