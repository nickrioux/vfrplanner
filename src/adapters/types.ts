/**
 * API Adapter Types
 * Shared interfaces for the adapter pattern implementation
 */

/**
 * HTTP methods supported by adapters
 */
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

/**
 * Authentication types for APIs
 */
export type AuthType = 'none' | 'query-param' | 'header' | 'bearer';

/**
 * API configuration for adapters
 */
export interface ApiConfig {
    /** Base URL for the API */
    baseUrl: string;
    /** Authentication type */
    authType: AuthType;
    /** API key parameter name (for query-param auth) */
    authParamName?: string;
    /** API key header name (for header/bearer auth) */
    authHeaderName?: string;
    /** Default timeout in milliseconds */
    timeout?: number;
    /** Enable request/response logging */
    enableLogging?: boolean;
    /** Maximum retry attempts */
    maxRetries?: number;
    /** Base delay for exponential backoff (ms) */
    retryBaseDelay?: number;
}

/**
 * Request options for API calls
 */
export interface RequestOptions {
    /** HTTP method */
    method?: HttpMethod;
    /** Query parameters */
    params?: Record<string, string | number | boolean | undefined>;
    /** Request body (for POST/PUT/PATCH) */
    body?: unknown;
    /** Additional headers */
    headers?: Record<string, string>;
    /** Override default timeout */
    timeout?: number;
    /** Skip retry logic */
    skipRetry?: boolean;
    /** Skip authentication */
    skipAuth?: boolean;
}

/**
 * Standardized API response wrapper
 */
export interface ApiResponse<T> {
    /** Whether the request was successful */
    success: boolean;
    /** Response data (if successful) */
    data?: T;
    /** Error information (if failed) */
    error?: ApiError;
    /** HTTP status code */
    status: number;
    /** Response time in milliseconds */
    duration: number;
}

/**
 * Standardized API error
 */
export interface ApiError {
    /** Error code (HTTP status or custom) */
    code: string;
    /** Human-readable error message */
    message: string;
    /** Original error (if any) */
    originalError?: Error;
    /** Whether the error is retryable */
    retryable: boolean;
}

/**
 * Pagination information for paginated APIs
 */
export interface PaginationInfo {
    /** Current page number */
    page: number;
    /** Items per page */
    limit: number;
    /** Total number of items */
    totalCount: number;
    /** Total number of pages */
    totalPages: number;
    /** Whether there are more pages */
    hasMore: boolean;
}

/**
 * Paginated response wrapper
 */
export interface PaginatedResponse<T> {
    /** Items in current page */
    items: T[];
    /** Pagination information */
    pagination: PaginationInfo;
}

/**
 * Request interceptor function
 */
export type RequestInterceptor = (
    url: string,
    options: RequestInit
) => Promise<{ url: string; options: RequestInit }>;

/**
 * Response interceptor function
 */
export type ResponseInterceptor = (
    response: Response,
    duration: number
) => Promise<Response>;

/**
 * Adapter interface that all API adapters must implement
 */
export interface IApiAdapter {
    /** Get the adapter name */
    getName(): string;

    /** Check if the adapter is configured and ready */
    isReady(): boolean;

    /** Make a GET request */
    get<T>(endpoint: string, options?: RequestOptions): Promise<ApiResponse<T>>;

    /** Make a POST request */
    post<T>(endpoint: string, options?: RequestOptions): Promise<ApiResponse<T>>;

    /** Set API key/credentials */
    setCredentials(credentials: string): void;

    /** Add request interceptor */
    addRequestInterceptor(interceptor: RequestInterceptor): void;

    /** Add response interceptor */
    addResponseInterceptor(interceptor: ResponseInterceptor): void;
}

/**
 * Retry configuration
 */
export interface RetryConfig {
    /** Maximum number of retry attempts */
    maxAttempts: number;
    /** Base delay in milliseconds */
    baseDelay: number;
    /** Maximum delay in milliseconds */
    maxDelay: number;
    /** HTTP status codes that should trigger retry */
    retryableStatuses: number[];
}

/**
 * Default retry configuration
 */
export const DEFAULT_RETRY_CONFIG: RetryConfig = {
    maxAttempts: 3,
    baseDelay: 1000,
    maxDelay: 10000,
    retryableStatuses: [408, 429, 500, 502, 503, 504],
};

/**
 * Default timeout in milliseconds
 */
export const DEFAULT_TIMEOUT = 15000;
