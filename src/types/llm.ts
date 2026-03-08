/**
 * LLM-related type definitions
 * Types for AI assistant integration with multiple providers
 */

import type { FlightPlan } from './flightPlan';
import type { VFRWindow } from './vfrWindow';
import type { PluginSettings } from './settings';

/**
 * Supported LLM providers
 * - anthropic: Direct Anthropic API (may have CORS issues from browser)
 * - openai: Direct OpenAI API (may have CORS issues from browser)
 * - openrouter: OpenRouter.ai proxy (browser-friendly, supports all models)
 */
export type LLMProvider = 'anthropic' | 'openai' | 'openrouter';

/**
 * Curated model list per provider.
 * OpenRouter uses auto-routing — no model selection needed.
 */
export type AnthropicModel = 'claude-haiku-4-5-20251001' | 'claude-sonnet-4-6';
export type OpenAIModel = 'gpt-4o-mini' | 'gpt-4o';

export type LLMModel = AnthropicModel | OpenAIModel;

/**
 * Provider endpoint configuration
 */
export interface LLMProviderConfig {
    endpoint: string;
    authHeader: string;
    authPrefix: string;
    extraHeaders?: Record<string, string>;
}

/**
 * LLM service configuration.
 */
export interface LLMConfig {
    provider: LLMProvider;
    apiKey: string;
    model: string;
}

/**
 * Chat message for conversational AI
 */
export interface ChatMessage {
    role: 'user' | 'assistant';
    content: string;
}

/**
 * Waypoint weather snapshot for LLM context
 */
export interface WaypointWeather {
    waypointName: string;
    waypointType: string;
    windSpeed: number;
    windDir: number;
    ceiling?: number;
    visibility?: number;
    temperature?: number;
    eta?: string;
}

/**
 * Weather alert for LLM context
 */
export interface WeatherAlert {
    type: string;
    severity: 'warning' | 'caution' | 'info';
    message: string;
}

/**
 * Full flight context injected into LLM calls
 */
export interface FlightContext {
    flightPlan: FlightPlan;
    weatherData: Map<string, WaypointWeather>;
    weatherAlerts: Map<string, WeatherAlert[]>;
    vfrWindows: VFRWindow[];
    selectedWindow?: VFRWindow;
    settings: PluginSettings;
}

/**
 * LLM connection test result
 */
export interface LLMConnectionTestResult {
    success: boolean;
    error?: string;
    latencyMs?: number;
}

/**
 * Provider endpoint registry
 */
export const LLM_PROVIDER_CONFIGS: Record<LLMProvider, LLMProviderConfig> = {
    anthropic: {
        endpoint: 'https://api.anthropic.com/v1/messages',
        authHeader: 'x-api-key',
        authPrefix: '',
    },
    openai: {
        endpoint: 'https://api.openai.com/v1/chat/completions',
        authHeader: 'Authorization',
        authPrefix: 'Bearer ',
    },
    openrouter: {
        endpoint: 'https://openrouter.ai/api/v1/chat/completions',
        authHeader: 'Authorization',
        authPrefix: 'Bearer ',
        extraHeaders: {
            'HTTP-Referer': 'https://www.windy.com',
            'X-Title': 'VFR Flight Planner',
        },
    },
};

/**
 * Available models per provider (for UI dropdowns).
 * OpenRouter uses auto-routing so its list is empty (no user selection needed).
 */
export const MODELS_BY_PROVIDER: Record<LLMProvider, { id: string; label: string }[]> = {
    anthropic: [
        { id: 'claude-haiku-4-5-20251001', label: 'Claude Haiku 4.5 (Fast)' },
        { id: 'claude-sonnet-4-6', label: 'Claude Sonnet 4.6 (Deep)' },
    ],
    openai: [
        { id: 'gpt-4o-mini', label: 'GPT-4o Mini (Fast)' },
        { id: 'gpt-4o', label: 'GPT-4o (Deep)' },
    ],
    openrouter: [],
};

/**
 * Default model per provider.
 * OpenRouter uses 'openrouter/auto' for automatic model selection.
 */
export const DEFAULT_MODEL_BY_PROVIDER: Record<LLMProvider, string> = {
    anthropic: 'claude-haiku-4-5-20251001',
    openai: 'gpt-4o-mini',
    openrouter: 'openrouter/auto',
};
