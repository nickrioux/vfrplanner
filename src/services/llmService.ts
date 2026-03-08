/**
 * LLM Service - Core abstraction layer for AI-powered briefings
 * Supports Anthropic, OpenAI, and OpenRouter providers.
 */

import type { LLMConfig, ChatMessage } from '../types/llm';
import { LLM_PROVIDER_CONFIGS } from '../types/llm';
import type { FlightPlan } from '../types/flightPlan';
import type { VFRWindow } from '../types/vfrWindow';
import type { WaypointWeather, WeatherAlert } from './weatherService';

const SYSTEM_PROMPT = `You are an aviation weather briefing assistant integrated into a VFR flight planning tool.
You help pilots interpret weather data and make informed go/no-go decisions.
Be concise, use pilot-standard terminology (METAR/TAF conventions, VFR/IFR/MVFR/LIFR),
and always prioritize safety. When conditions are marginal, clearly state the risks.
Respond in the same language as the user's query (French or English).`;

const MAX_RESPONSE_TOKENS = 512;

/**
 * Extract text from an LLM response based on provider format
 */
function extractResponseText(provider: string, data: unknown): string {
    const d = data as Record<string, unknown>;
    if (provider === 'anthropic') {
        const content = d.content as Array<{ type: string; text: string }>;
        return content?.[0]?.text || '';
    }
    // OpenAI-compatible (openai + openrouter)
    const choices = d.choices as Array<{ message: { content: string } }>;
    return choices?.[0]?.message?.content || '';
}

export class LLMService {
    private config: LLMConfig;

    constructor(config: LLMConfig) {
        this.config = config;
    }

    updateConfig(config: LLMConfig) {
        this.config = config;
    }

    /**
     * Send a completion request to the configured LLM provider
     */
    private async complete(systemPrompt: string, userMessage: string): Promise<string> {
        const providerConfig = LLM_PROVIDER_CONFIGS[this.config.provider];
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
            [providerConfig.authHeader]: providerConfig.authPrefix + this.config.apiKey,
            ...providerConfig.extraHeaders,
        };

        let body: string;
        if (this.config.provider === 'anthropic') {
            headers['anthropic-version'] = '2023-06-01';
            body = JSON.stringify({
                model: this.config.model,
                max_tokens: MAX_RESPONSE_TOKENS,
                system: systemPrompt,
                messages: [{ role: 'user', content: userMessage }],
            });
        } else {
            body = JSON.stringify({
                model: this.config.model,
                max_tokens: MAX_RESPONSE_TOKENS,
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userMessage },
                ],
            });
        }

        const res = await fetch(providerConfig.endpoint, { method: 'POST', headers, body });
        if (!res.ok) {
            const err = await res.json().catch(() => null);
            const msg = (err as Record<string, { message?: string }>)?.error?.message || `HTTP ${res.status}`;
            throw new Error(msg);
        }

        const data = await res.json();
        return extractResponseText(this.config.provider, data);
    }

    /**
     * Multi-turn chat with full message history
     */
    private async chatComplete(systemPrompt: string, messages: ChatMessage[]): Promise<string> {
        const providerConfig = LLM_PROVIDER_CONFIGS[this.config.provider];
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
            [providerConfig.authHeader]: providerConfig.authPrefix + this.config.apiKey,
            ...providerConfig.extraHeaders,
        };

        let body: string;
        if (this.config.provider === 'anthropic') {
            headers['anthropic-version'] = '2023-06-01';
            body = JSON.stringify({
                model: this.config.model,
                max_tokens: MAX_RESPONSE_TOKENS,
                system: systemPrompt,
                messages,
            });
        } else {
            body = JSON.stringify({
                model: this.config.model,
                max_tokens: MAX_RESPONSE_TOKENS,
                messages: [
                    { role: 'system', content: systemPrompt },
                    ...messages,
                ],
            });
        }

        const res = await fetch(providerConfig.endpoint, { method: 'POST', headers, body });
        if (!res.ok) {
            const err = await res.json().catch(() => null);
            const msg = (err as Record<string, { message?: string }>)?.error?.message || `HTTP ${res.status}`;
            throw new Error(msg);
        }

        const data = await res.json();
        return extractResponseText(this.config.provider, data);
    }

    // ── Feature Methods ──────────────────────────────────────────────

    /**
     * Feature 4.1: Brief VFR windows after search completes
     */
    async briefVFRWindows(windows: VFRWindow[], plan: FlightPlan): Promise<string> {
        const windowSummaries = windows.map((w, i) => {
            const start = new Date(w.startTime);
            const end = new Date(w.endTime);
            return [
                `Window ${i + 1}:`,
                `  Time: ${start.toUTCString()} – ${end.toUTCString()}`,
                `  Duration: ${w.duration} min`,
                `  Worst condition: ${w.worstCondition}`,
                `  Confidence: ${w.confidence}`,
            ].join('\n');
        });

        const origin = plan.waypoints[0]?.name || 'departure';
        const dest = plan.waypoints[plan.waypoints.length - 1]?.name || 'destination';
        const ete = Math.round(plan.totals.ete);

        const userMessage = [
            `Route: ${origin} → ${dest}, ETE ${ete} min, ${plan.waypoints.length} waypoints.`,
            '',
            `${windows.length} VFR window(s) found:`,
            ...windowSummaries,
            '',
            'Provide a 3–5 sentence pilot briefing ranking these windows. Recommend the best option and flag any constraints.',
        ].join('\n');

        return this.complete(SYSTEM_PROMPT, userMessage);
    }

    /**
     * Feature 4.2: Summarize route weather after Read Wx
     */
    async summarizeRouteWeather(
        weatherData: Map<string, WaypointWeather>,
        alerts: Map<string, WeatherAlert[]>,
        plan: FlightPlan,
    ): Promise<string> {
        const waypointLines = plan.waypoints.map(wp => {
            const wx = weatherData.get(wp.id);
            const wpAlerts = alerts.get(wp.id) || [];
            if (!wx) return `${wp.name}: No weather data`;

            const parts = [
                `${wp.name} (${wp.type})`,
                `  Wind: ${Math.round(wx.windDir)}°/${Math.round(wx.windSpeed)}kt`,
                wx.windGust ? `  Gust: ${Math.round(wx.windGust)}kt` : null,
                wx.cloudBase != null ? `  Ceiling: ${Math.round(wx.cloudBase * 3.281)}ft AGL` : null,
                wx.visibility != null ? `  Vis: ${wx.visibility.toFixed(1)}km` : null,
                `  Temp: ${Math.round(wx.temperature)}°C`,
                wp.eta ? `  ETA: ${wp.eta.toUTCString()}` : null,
                wpAlerts.length > 0 ? `  Alerts: ${wpAlerts.map(a => a.message).join('; ')}` : null,
            ].filter(Boolean);
            return parts.join('\n');
        });

        const origin = plan.waypoints[0]?.name || 'departure';
        const dest = plan.waypoints[plan.waypoints.length - 1]?.name || 'destination';

        const userMessage = [
            `Route: ${origin} → ${dest}, ${plan.waypoints.length} waypoints, ${Math.round(plan.totals.distance)}NM, ETE ${Math.round(plan.totals.ete)} min.`,
            '',
            'Weather per waypoint:',
            ...waypointLines,
            '',
            'Provide a 4–6 sentence route weather summary. Characterize the overall route, identify the worst waypoint and why, mention notable alerts, and give a plain-language go/no-go sentiment (the pilot decides).',
        ].join('\n');

        return this.complete(SYSTEM_PROMPT, userMessage);
    }

    /**
     * Feature 4.3: Brief a specific selected VFR window
     */
    async briefSelectedWindow(
        window: VFRWindow,
        plan: FlightPlan,
        weatherData: Map<string, WaypointWeather>,
    ): Promise<string> {
        const start = new Date(window.startTime);
        const origin = plan.waypoints[0]?.name || 'departure';
        const dest = plan.waypoints[plan.waypoints.length - 1]?.name || 'destination';

        const waypointLines = plan.waypoints.map(wp => {
            const wx = weatherData.get(wp.id);
            if (!wx) return `${wp.name}: No data`;
            return `${wp.name}: Wind ${Math.round(wx.windDir)}°/${Math.round(wx.windSpeed)}kt` +
                (wx.cloudBase != null ? `, Ceil ${Math.round(wx.cloudBase * 3.281)}ft` : '') +
                (wx.visibility != null ? `, Vis ${wx.visibility.toFixed(1)}km` : '');
        });

        const userMessage = [
            `Selected window: ${start.toUTCString()}, duration ${window.duration} min, confidence ${window.confidence}, worst condition: ${window.worstCondition}.`,
            `Route: ${origin} → ${dest}, ETE ${Math.round(plan.totals.ete)} min.`,
            '',
            'Weather at departure time:',
            ...waypointLines,
            '',
            'Provide a focused 2–3 sentence debrief: what to expect at departure, any waypoint to monitor en route, and arrival conditions.',
        ].join('\n');

        return this.complete(SYSTEM_PROMPT, userMessage);
    }

    /**
     * Feature 4.4: Conversational chat with flight context
     */
    async chat(
        messages: ChatMessage[],
        plan: FlightPlan,
        weatherData: Map<string, WaypointWeather>,
        alerts: Map<string, WeatherAlert[]>,
        vfrWindows: VFRWindow[],
    ): Promise<string> {
        // Build a context-aware system prompt
        const origin = plan.waypoints[0]?.name || 'departure';
        const dest = plan.waypoints[plan.waypoints.length - 1]?.name || 'destination';

        const wxSummary = plan.waypoints.map(wp => {
            const wx = weatherData.get(wp.id);
            if (!wx) return `${wp.name}: no data`;
            return `${wp.name}: ${Math.round(wx.windDir)}°/${Math.round(wx.windSpeed)}kt` +
                (wx.cloudBase != null ? ` ceil ${Math.round(wx.cloudBase * 3.281)}ft` : '') +
                (wx.visibility != null ? ` vis ${wx.visibility.toFixed(1)}km` : '');
        }).join(' | ');

        const alertSummary = Array.from(alerts.entries())
            .filter(([, a]) => a.length > 0)
            .map(([id, a]) => {
                const wp = plan.waypoints.find(w => w.id === id);
                return `${wp?.name || id}: ${a.map(al => al.message).join(', ')}`;
            }).join(' | ');

        const windowSummary = vfrWindows.length > 0
            ? vfrWindows.map((w, i) => `W${i + 1}: ${new Date(w.startTime).toUTCString()} ${w.duration}min ${w.confidence}`).join(' | ')
            : 'No VFR windows found';

        const contextPrompt = [
            SYSTEM_PROMPT,
            '',
            `Current flight: ${origin} → ${dest}, ${Math.round(plan.totals.distance)}NM, ETE ${Math.round(plan.totals.ete)} min, ${plan.waypoints.length} waypoints.`,
            `Weather: ${wxSummary}`,
            alertSummary ? `Alerts: ${alertSummary}` : 'No active alerts.',
            `VFR windows: ${windowSummary}`,
            '',
            'Keep responses under 300 words. Be direct and safety-focused.',
        ].join('\n');

        return this.chatComplete(contextPrompt, messages);
    }

    /**
     * Feature 4.5: Batch rewrite waypoint alerts into plain language
     */
    async rewriteAlerts(
        alerts: Map<string, WeatherAlert[]>,
        plan: FlightPlan,
    ): Promise<Map<string, string[]>> {
        const entries = Array.from(alerts.entries())
            .filter(([, a]) => a.length > 0)
            .map(([id, a]) => {
                const wp = plan.waypoints.find(w => w.id === id);
                return {
                    waypoint: wp?.name || id,
                    alerts: a.map(al => al.message),
                };
            });

        if (entries.length === 0) return new Map();

        const userMessage = [
            'Rewrite each waypoint alert below as one clear, pilot-friendly sentence. Return JSON: { "results": [{ "waypoint": "NAME", "alerts": ["sentence1"] }] }',
            '',
            JSON.stringify(entries),
        ].join('\n');

        const response = await this.complete(SYSTEM_PROMPT, userMessage);

        // Parse JSON from response (handle markdown code fences)
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (!jsonMatch) return new Map();

        try {
            const parsed = JSON.parse(jsonMatch[0]) as {
                results: Array<{ waypoint: string; alerts: string[] }>;
            };
            const result = new Map<string, string[]>();
            for (const entry of parsed.results) {
                // Map back by waypoint name to ID
                const wp = plan.waypoints.find(w => w.name === entry.waypoint);
                if (wp) {
                    result.set(wp.id, entry.alerts);
                }
            }
            return result;
        } catch {
            return new Map();
        }
    }

    /**
     * Test the connection with a minimal request
     */
    async testConnection(): Promise<{ success: boolean; error?: string }> {
        try {
            await this.complete('Reply with OK.', 'Test');
            return { success: true };
        } catch (err) {
            return {
                success: false,
                error: err instanceof Error ? err.message : 'Connection failed',
            };
        }
    }
}
