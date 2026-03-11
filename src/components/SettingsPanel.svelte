<script lang="ts">
    import { createEventDispatcher } from 'svelte';
    import type { FlightPlan } from '../types';
    import type { ConditionPreset } from '../types/conditionThresholds';
    import type { LLMProvider } from '../types/llm';
    import { MODELS_BY_PROVIDER, LLM_PROVIDER_CONFIGS } from '../types/llm';
    import { settingsStore } from '../stores/settingsStore';

    export let maxProfileAltitude: number;
    export let flightPlan: FlightPlan | null;
    export let conditionPreset: ConditionPreset;

    // Reactive subscription to settings store
    $: settings = $settingsStore;

    const dispatch = createEventDispatcher<{
        change: void;
        profileAltitudeChange: number;
        openConditionsModal: void;
        configureAircraft: void;
        presetChange: ConditionPreset;
    }>();

    function handleChange() {
        dispatch('change');
    }

    function handleProfileAltitudeChange() {
        dispatch('profileAltitudeChange', maxProfileAltitude);
    }

    function handlePresetChange() {
        dispatch('presetChange', conditionPreset);
        dispatch('change');
    }

    function handleOpenModal() {
        dispatch('openConditionsModal');
    }

    // Individual setting change handlers
    function handleAircraftCategoryChange(e: Event) {
        const value = (e.target as HTMLSelectElement).value as 'airplane' | 'helicopter';
        settingsStore.setAircraftCategory(value);
        handleChange();
    }

    function handleRegionChange(e: Event) {
        const value = (e.target as HTMLSelectElement).value as 'canada' | 'usa' | 'europe';
        settingsStore.setRegion(value);
        handleChange();
    }

function handleAutoTerrainChange(e: Event) {
        const checked = (e.target as HTMLInputElement).checked;
        settingsStore.setAutoTerrainElevation(checked);
        handleChange();
    }

    function handleShowLabelsChange(e: Event) {
        const checked = (e.target as HTMLInputElement).checked;
        settingsStore.setShowLabels(checked);
        handleChange();
    }

    function handleIncludeNightFlightsChange(e: Event) {
        const checked = (e.target as HTMLInputElement).checked;
        settingsStore.setIncludeNightFlights(checked);
        handleChange();
    }

    function handleMaxVFRWindowsChange(e: Event) {
        const value = parseInt((e.target as HTMLInputElement).value, 10);
        if (!isNaN(value)) {
            settingsStore.setMaxVFRWindows(value);
            handleChange();
        }
    }

    function handleTerrainIntervalChange(e: Event) {
        const value = parseFloat((e.target as HTMLInputElement).value);
        if (!isNaN(value)) {
            settingsStore.setTerrainSampleInterval(value);
            handleChange();
        }
    }

    function handleApiKeyChange(e: Event) {
        const value = (e.target as HTMLInputElement).value;
        settingsStore.setAirportDbApiKey(value);
        handleChange();
    }

function handleWeatherSampleEnabledChange(e: Event) {
        const checked = (e.target as HTMLInputElement).checked;
        settingsStore.setWeatherSampleEnabled(checked);
        handleChange();
    }

    function handleWeatherSampleShowDotsChange(e: Event) {
        const checked = (e.target as HTMLInputElement).checked;
        settingsStore.setWeatherSampleShowDots(checked);
        handleChange();
    }

    function handleWeatherSampleIntervalChange(e: Event) {
        const value = parseInt((e.target as HTMLInputElement).value, 10);
        if (!isNaN(value)) {
            settingsStore.setWeatherSampleInterval(value);
            handleChange();
        }
    }

    // LLM settings handlers
    let showApiKey = false;
    let llmTestStatus: 'idle' | 'testing' | 'success' | 'error' = 'idle';
    let llmTestError = '';
    function handleLlmEnabledChange(e: Event) {
        const checked = (e.target as HTMLInputElement).checked;
        settingsStore.setLlmEnabled(checked);
        handleChange();
    }

    function handleLlmProviderChange(e: Event) {
        const value = (e.target as HTMLSelectElement).value as LLMProvider;
        settingsStore.setLlmProvider(value);
        llmTestStatus = 'idle';
        handleChange();
    }

    function handleLlmModelChange(e: Event) {
        const value = (e.target as HTMLSelectElement).value;
        settingsStore.setLlmModel(value);
        handleChange();
    }

    function handleLlmApiKeyChange(e: Event) {
        const value = (e.target as HTMLInputElement).value;
        settingsStore.setLlmApiKey(value);
        llmTestStatus = 'idle';
        handleChange();
    }

    function handleLlmCustomEndpointChange(e: Event) {
        const value = (e.target as HTMLInputElement).value;
        settingsStore.setLlmCustomEndpoint(value);
        llmTestStatus = 'idle';
        handleChange();
    }

    async function handleTestConnection() {
        if (!settings.llmApiKey && settings.llmProvider !== 'custom') {
            llmTestStatus = 'error';
            llmTestError = 'No API key configured';
            return;
        }
        if (settings.llmProvider === 'custom' && !settings.llmCustomEndpoint) {
            llmTestStatus = 'error';
            llmTestError = 'No endpoint URL configured';
            return;
        }
        llmTestStatus = 'testing';
        llmTestError = '';

        const providerConfig = LLM_PROVIDER_CONFIGS[settings.llmProvider];
        const endpoint = settings.llmProvider === 'custom' && settings.llmCustomEndpoint
            ? settings.llmCustomEndpoint
            : providerConfig.endpoint;
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
            ...providerConfig.extraHeaders,
        };
        if (settings.llmApiKey) {
            headers[providerConfig.authHeader] = providerConfig.authPrefix + settings.llmApiKey;
        }

        // Build a minimal request body depending on provider
        let body: string;
        if (settings.llmProvider === 'anthropic') {
            headers['anthropic-version'] = '2023-06-01';
            body = JSON.stringify({
                model: settings.llmModel || 'claude-haiku-4-5-20251001',
                max_tokens: 16,
                messages: [{ role: 'user', content: 'Hi' }],
            });
        } else {
            // OpenAI-compatible (openai, openrouter, custom)
            body = JSON.stringify({
                model: settings.llmModel,
                max_tokens: 16,
                messages: [{ role: 'user', content: 'Hi' }],
            });
        }

        try {
            const res = await fetch(endpoint, {
                method: 'POST',
                headers,
                body,
            });
            if (res.ok) {
                llmTestStatus = 'success';
            } else {
                const data = await res.json().catch(() => null);
                const msg = data?.error?.message || `HTTP ${res.status}`;
                llmTestStatus = 'error';
                llmTestError = msg;
            }
        } catch (err) {
            llmTestStatus = 'error';
            llmTestError = err instanceof Error ? err.message : 'Network error';
        }
    }

    $: showModelSelector = settings.llmProvider !== 'openrouter' && settings.llmProvider !== 'custom';
    $: availableModels = MODELS_BY_PROVIDER[settings.llmProvider] || [];

    $: totalDistance = flightPlan?.totals.distance || 0;
    $: estimatedWeatherSamples = settings.weatherSampleEnabled && totalDistance > 0
        ? Math.max(0, Math.ceil(totalDistance / settings.weatherSampleInterval) - 1)
        : 0;
</script>

<div class="settings-section">
    <!-- Aircraft & Regulations -->
    <details class="settings-group" open>
        <summary class="settings-group-header">Aircraft & Regulations</summary>
        <div class="settings-group-content">
            <div class="setting-group">
                <label class="setting-label">Aircraft Category</label>
                <div class="setting-input">
                    <select value={settings.aircraftCategory} on:change={handleAircraftCategoryChange}>
                        <option value="airplane">Airplane</option>
                        <option value="helicopter">Helicopter</option>
                    </select>
                </div>
                {#if settings.aircraftCategory === 'helicopter'}
                    <div class="setting-description">
                        Helicopters have lower visibility minimums than airplanes.
                    </div>
                {/if}
            </div>

            <div class="setting-group">
                <label class="setting-label">Regulatory Region</label>
                <div class="setting-input">
                    <select value={settings.region} on:change={handleRegionChange}>
                        <option value="canada">Canada (TC)</option>
                        <option value="usa">USA (FAA)</option>
                        <option value="europe">Europe (EASA)</option>
                    </select>
                </div>
                {#if settings.aircraftCategory === 'helicopter'}
                    <div class="setting-description">
                        Helicopter VFR minimums: Canada 1.0 SM, USA 0.5 SM, Europe 800m.
                    </div>
                {/if}
            </div>

            <div class="setting-group">
                <label class="setting-label">Aircraft Performance</label>
                <div class="setting-description">
                    TAS {settings.aircraftPerformance?.cruiseTAS ?? 100}kt, Alt {settings.aircraftPerformance?.cruiseAltitude ?? 3000}ft, ROC {settings.aircraftPerformance?.rateOfClimb ?? 500}fpm, ROD {settings.aircraftPerformance?.rateOfDescent ?? 500}fpm
                </div>
                <button class="customize-btn" on:click={() => dispatch('configureAircraft')}>
                    Configure...
                </button>
            </div>
        </div>
    </details>

    <!-- VFR Conditions -->
    <details class="settings-group" open>
        <summary class="settings-group-header">VFR Conditions</summary>
        <div class="settings-group-content">
            <div class="setting-group">
                <label class="setting-label">VFR Condition Thresholds</label>
                <div class="setting-input">
                    <select bind:value={conditionPreset} on:change={handlePresetChange}>
                        <option value="standard">Standard VFR</option>
                        <option value="conservative">Conservative</option>
                        <option value="custom">Custom</option>
                    </select>
                </div>
                <div class="setting-description">
                    Defines ceiling, visibility, wind and clearance limits for profile coloring.
                    {#if settings.aircraftCategory === 'helicopter' && conditionPreset !== 'custom'}
                        <br/><em>Using {settings.region === 'canada' ? 'Canadian' : settings.region === 'usa' ? 'US' : 'European'} helicopter minimums.</em>
                    {/if}
                </div>
                <button class="customize-btn" on:click={handleOpenModal}>
                    Customize...
                </button>
            </div>

            <div class="setting-group">
                <label class="setting-checkbox">
                    <input
                        type="checkbox"
                        checked={settings.includeNightFlights}
                        on:change={handleIncludeNightFlightsChange}
                    />
                    Include night hours in VFR window search
                </label>
                <div class="setting-description">
                    When disabled, VFR windows are limited to 30 min before sunrise to 30 min after sunset.
                </div>
            </div>

            <div class="setting-group">
                <label class="setting-label">Max VFR Windows to Find</label>
                <div class="setting-input">
                    <input
                        type="number"
                        value={settings.maxVFRWindows}
                        on:change={handleMaxVFRWindowsChange}
                        min="1"
                        max="50"
                    />
                </div>
            </div>
        </div>
    </details>

    <!-- Route Sampling -->
    <details class="settings-group" open>
        <summary class="settings-group-header">Route Sampling</summary>
        <div class="settings-group-content">
            <div class="setting-group">
                <label class="setting-label">Terrain Sample Interval</label>
                <div class="setting-input">
                    <input
                        type="number"
                        value={settings.terrainSampleInterval}
                        on:change={handleTerrainIntervalChange}
                        min="1"
                        max="10"
                        step="0.5"
                    />
                    <span class="unit">NM</span>
                </div>
                <div class="setting-description">
                    Lower = finer terrain detail.
                </div>
            </div>

            <div class="setting-group">
                <label class="setting-checkbox">
                    <input
                        type="checkbox"
                        checked={settings.weatherSampleEnabled}
                        on:change={handleWeatherSampleEnabledChange}
                    />
                    Sample weather along entire route
                </label>
                <div class="setting-description">
                    Fetch weather at intermediate points between waypoints for better en-route alert coverage.
                </div>
            </div>

            {#if settings.weatherSampleEnabled}
                <div class="setting-group">
                    <label class="setting-label">Weather Sample Interval</label>
                    <div class="setting-input">
                        <input
                            type="number"
                            value={settings.weatherSampleInterval}
                            on:change={handleWeatherSampleIntervalChange}
                            min="5"
                            max="50"
                            step="5"
                        />
                        <span class="unit">NM</span>
                    </div>
                    <div class="setting-description">
                        Lower = more weather detail.
                        {#if estimatedWeatherSamples > 0}
                            <br/>~{estimatedWeatherSamples} intermediate weather samples
                        {/if}
                    </div>
                </div>
            {/if}
        </div>
    </details>

    <!-- Display -->
    <details class="settings-group" open>
        <summary class="settings-group-header">Display</summary>
        <div class="settings-group-content">
            <div class="setting-group">
                <label class="setting-label">Profile Top Height</label>
                <div class="setting-input">
                    <input
                        type="number"
                        bind:value={maxProfileAltitude}
                        on:input={handleProfileAltitudeChange}
                        min="1000"
                        max="60000"
                        step="1000"
                    />
                    <span class="unit">ft MSL</span>
                </div>
            </div>

            <div class="setting-group">
                <label class="setting-checkbox">
                    <input
                        type="checkbox"
                        checked={settings.showLabels}
                        on:change={handleShowLabelsChange}
                    />
                    Show waypoint labels on map
                </label>
            </div>

            <div class="setting-group">
                <label class="setting-checkbox">
                    <input
                        type="checkbox"
                        checked={settings.autoTerrainElevation}
                        on:change={handleAutoTerrainChange}
                    />
                    Auto terrain elevation for departure/arrival
                </label>
                <div class="setting-description">
                    Auto-set field elevation for departure/arrival.
                </div>
            </div>

            {#if settings.weatherSampleEnabled}
                <div class="setting-group">
                    <label class="setting-checkbox">
                        <input
                            type="checkbox"
                            checked={settings.weatherSampleShowDots}
                            on:change={handleWeatherSampleShowDotsChange}
                        />
                        Show weather sample markers
                    </label>
                </div>
            {/if}
        </div>
    </details>

    <!-- Data Sources -->
    <details class="settings-group" open>
        <summary class="settings-group-header">Data Sources</summary>
        <div class="settings-group-content">
            <div class="setting-group">
                <label class="setting-label">AirportDB API Key (Optional)</label>
                <input
                    type="password"
                    class="setting-input api-key-input"
                    value={settings.airportdbApiKey}
                    on:change={handleApiKeyChange}
                    placeholder="Optional - offline data available"
                />
                <div class="setting-description">
                    <strong>Without API key:</strong> Offline data for large/medium airports in North America and Europe (from <a href="https://ourairports.com" target="_blank" rel="noopener">OurAirports</a>).<br/>
                    <strong>With API key:</strong> Global coverage + navaids. Get a free key at
                    <a href="https://airportdb.io" target="_blank" rel="noopener">airportdb.io</a>
                </div>
            </div>
        </div>
    </details>

    <!-- AI Assistant -->
    <details class="settings-group">
        <summary class="settings-group-header">AI Assistant</summary>
        <div class="settings-group-content">
            <div class="setting-group">
                <label class="setting-checkbox">
                    <input
                        type="checkbox"
                        checked={settings.llmEnabled}
                        on:change={handleLlmEnabledChange}
                    />
                    Enable AI Features
                </label>
                <div class="setting-description">
                    Get natural language weather briefings and route analysis powered by AI.
                    Requires an API key from your chosen provider.
                </div>
            </div>

            {#if settings.llmEnabled}
                <div class="setting-group">
                    <label class="setting-label">Provider</label>
                    <div class="setting-input">
                        <select value={settings.llmProvider} on:change={handleLlmProviderChange}>
                            <option value="openrouter">OpenRouter (Recommended)</option>
                            <option value="anthropic">Anthropic (Claude)</option>
                            <option value="openai">OpenAI (GPT)</option>
                            <option value="custom">Custom / Local LLM</option>
                        </select>
                    </div>
                    {#if settings.llmProvider === 'openrouter'}
                        <div class="setting-description">
                            Auto-routes to the best model for each request. Browser-friendly.
                            Get a key at <a href="https://openrouter.ai/keys" target="_blank" rel="noopener">openrouter.ai</a>
                        </div>
                    {:else if settings.llmProvider === 'anthropic'}
                        <div class="setting-description">
                            Direct Anthropic API. May have CORS issues in some browsers.
                            Get a key at <a href="https://console.anthropic.com/" target="_blank" rel="noopener">console.anthropic.com</a>
                        </div>
                    {:else if settings.llmProvider === 'custom'}
                        <div class="setting-description">
                            Connect to a local LLM (Ollama, LM Studio, llama.cpp, etc.) via an OpenAI-compatible endpoint.
                        </div>
                    {:else}
                        <div class="setting-description">
                            Direct OpenAI API. May have CORS issues in some browsers.
                            Get a key at <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener">platform.openai.com</a>
                        </div>
                    {/if}
                </div>

                {#if showModelSelector}
                    <div class="setting-group">
                        <label class="setting-label">Model</label>
                        <div class="setting-input">
                            <select
                                value={settings.llmModel}
                                on:change={handleLlmModelChange}
                            >
                                {#each availableModels as model}
                                    <option value={model.id}>{model.label}</option>
                                {/each}
                            </select>
                        </div>
                        <div class="setting-description">
                            Haiku/Mini models are fast and low-cost, ideal for briefings. Sonnet/GPT-4o are better for the AI chat.
                        </div>
                    </div>
                {/if}

                {#if settings.llmProvider === 'custom'}
                    <div class="setting-group">
                        <label class="setting-label">Endpoint URL</label>
                        <div class="setting-input">
                            <input
                                type="text"
                                value={settings.llmCustomEndpoint}
                                on:change={handleLlmCustomEndpointChange}
                                placeholder="http://localhost:11434/v1/chat/completions"
                            />
                        </div>
                        <div class="setting-description">
                            OpenAI-compatible chat completions endpoint. Default works with Ollama.
                        </div>
                    </div>

                    <div class="setting-group">
                        <label class="setting-label">Model Name</label>
                        <div class="setting-input">
                            <input
                                type="text"
                                value={settings.llmModel}
                                on:change={handleLlmModelChange}
                                placeholder="e.g. llama3, mistral, gemma2"
                            />
                        </div>
                        <div class="setting-description">
                            The model identifier as expected by your local server (e.g. from <code>ollama list</code>).
                        </div>
                    </div>
                {/if}

                {#if settings.llmProvider !== 'custom'}
                <div class="setting-group">
                    <label class="setting-label">API Key</label>
                    <div class="api-key-wrapper">
                        <input
                            type={showApiKey ? 'text' : 'password'}
                            class="setting-input api-key-input"
                            value={settings.llmApiKey}
                            on:change={handleLlmApiKeyChange}
                            placeholder="Enter your API key"
                        />
                        <button
                            class="toggle-visibility-btn"
                            on:click={() => showApiKey = !showApiKey}
                            title={showApiKey ? 'Hide key' : 'Show key'}
                        >
                            {showApiKey ? 'Hide' : 'Show'}
                        </button>
                    </div>
                    <div class="setting-description">
                        Your key is stored locally and only sent to the selected provider.
                    </div>
                </div>
                {/if}

                <div class="setting-group">
                    <button class="customize-btn" on:click={handleTestConnection} disabled={llmTestStatus === 'testing'}>
                        {llmTestStatus === 'testing' ? 'Testing...' : 'Test Connection'}
                    </button>
                    <div class="llm-status" class:status-success={llmTestStatus === 'success'} class:status-error={llmTestStatus === 'error'}>
                        {#if llmTestStatus === 'success'}
                            <span class="status-dot connected"></span> Connected
                        {:else if llmTestStatus === 'error'}
                            <span class="status-dot error"></span> {llmTestError || 'Connection failed'}
                        {:else if settings.llmApiKey || settings.llmProvider === 'custom'}
                            <span class="status-dot idle"></span> Not tested
                        {:else}
                            <span class="status-dot idle"></span> Not configured
                        {/if}
                    </div>
                </div>
            {/if}
        </div>
    </details>
</div>

<style lang="less">
    .settings-section {
        padding: 10px;
    }

    .settings-group {
        margin-bottom: 4px;
        border: 1px solid #333;
        border-radius: 6px;
        overflow: hidden;

        &[open] > .settings-group-header::after {
            transform: rotate(90deg);
        }
    }

    .settings-group-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 8px 12px;
        font-weight: 600;
        font-size: 13px;
        color: #ccc;
        background: #1e1e1e;
        cursor: pointer;
        user-select: none;
        list-style: none;

        &::-webkit-details-marker {
            display: none;
        }

        &::after {
            content: '\25B6';
            font-size: 9px;
            color: #666;
            transition: transform 0.15s ease;
        }

        &:hover {
            background: #252525;
        }
    }

    .settings-group-content {
        padding: 10px 12px;
    }

    .setting-group {
        margin-bottom: 15px;

        &:last-child {
            margin-bottom: 5px;
        }
    }

    .setting-label {
        display: block;
        font-weight: 500;
        margin-bottom: 5px;
        color: #e0e0e0;
    }

    .setting-input {
        display: flex;
        align-items: center;
        gap: 5px;

        input[type="number"] {
            width: 80px;
            padding: 5px 8px;
            border: 1px solid #555;
            border-radius: 4px;
            background: #2a2a2a;
            color: #fff;
            font-size: 14px;

            &:focus {
                outline: none;
                border-color: #4a90d9;
            }
        }

        select {
            padding: 5px 8px;
            border: 1px solid #555;
            border-radius: 4px;
            background: #2a2a2a;
            color: #fff;
            font-size: 14px;
            cursor: pointer;

            &:focus {
                outline: none;
                border-color: #4a90d9;
            }
        }

        .unit {
            color: #888;
            font-size: 13px;
        }
    }

    .setting-checkbox {
        display: flex;
        align-items: center;
        gap: 8px;
        cursor: pointer;
        color: #e0e0e0;

        input[type="checkbox"] {
            width: 16px;
            height: 16px;
            cursor: pointer;
        }
    }

    .setting-description {
        margin-top: 5px;
        font-size: 12px;
        color: #888;
        line-height: 1.4;

        a {
            color: #4a90d9;
            text-decoration: none;

            &:hover,
            &:active {
                text-decoration: underline;
            }
        }
    }

    .api-key-input {
        width: 100%;
        padding: 8px;
        border: 1px solid #555;
        border-radius: 4px;
        background: #2a2a2a;
        color: #fff;
        font-size: 14px;

        &:focus {
            outline: none;
            border-color: #4a90d9;
        }

        &::placeholder {
            color: #666;
        }
    }

    .customize-btn {
        margin-top: 8px;
        padding: 6px 12px;
        min-height: 44px;
        background: #333;
        border: 1px solid #555;
        border-radius: 4px;
        color: #ccc;
        font-size: 13px;
        cursor: pointer;
        touch-action: manipulation;
        -webkit-tap-highlight-color: transparent;

        &:hover,
        &:active {
            background: #444;
            color: #fff;
        }

        &:focus {
            outline: 2px solid rgba(74, 144, 217, 0.5);
            outline-offset: 2px;
        }

        &:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }
    }

    .api-key-wrapper {
        display: flex;
        gap: 6px;
        align-items: center;

        .api-key-input {
            flex: 1;
        }
    }

    .toggle-visibility-btn {
        padding: 6px 10px;
        background: #333;
        border: 1px solid #555;
        border-radius: 4px;
        color: #ccc;
        font-size: 12px;
        cursor: pointer;
        white-space: nowrap;

        &:hover {
            background: #444;
            color: #fff;
        }
    }

    .llm-status {
        margin-top: 8px;
        font-size: 12px;
        color: #888;
        display: flex;
        align-items: center;
        gap: 6px;

        &.status-success {
            color: #4caf50;
        }

        &.status-error {
            color: #f44336;
        }
    }

    .status-dot {
        display: inline-block;
        width: 8px;
        height: 8px;
        border-radius: 50%;

        &.connected {
            background: #4caf50;
        }

        &.error {
            background: #f44336;
        }

        &.idle {
            background: #666;
        }
    }
</style>
