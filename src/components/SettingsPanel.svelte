<script lang="ts">
    import { createEventDispatcher } from 'svelte';
    import type { FlightPlan } from '../types';
    import type { ConditionPreset } from '../types/conditionThresholds';
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
    }
</style>
