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

    function handleAirspeedChange(e: Event) {
        const value = parseInt((e.target as HTMLInputElement).value, 10);
        if (!isNaN(value)) {
            settingsStore.setDefaultAirspeed(value);
            handleChange();
        }
    }

    function handleAltitudeChange(e: Event) {
        const value = parseInt((e.target as HTMLInputElement).value, 10);
        if (!isNaN(value)) {
            settingsStore.setDefaultAltitude(value);
            handleChange();
        }
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

    function handleEnableLoggingChange(e: Event) {
        const checked = (e.target as HTMLInputElement).checked;
        settingsStore.setEnableLogging(checked);
        handleChange();
    }

    $: totalDistance = flightPlan?.totals.distance || 0;
    $: estimatedSamples = Math.ceil(totalDistance / settings.terrainSampleInterval) + (flightPlan?.waypoints.length || 0);
</script>

<div class="settings-section">
    <div class="setting-group">
        <label class="setting-label">Aircraft Category</label>
        <div class="setting-input">
            <select value={settings.aircraftCategory} on:change={handleAircraftCategoryChange}>
                <option value="airplane">Airplane</option>
                <option value="helicopter">Helicopter</option>
            </select>
        </div>
        <div class="setting-description">
            Helicopters have lower visibility minimums than airplanes.
        </div>
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
        <div class="setting-description">
            {#if settings.aircraftCategory === 'helicopter'}
                Helicopter VFR minimums: Canada 1.0 SM, USA 0.5 SM, Europe 800m.
            {:else}
                Affects VFR minimums for profile condition evaluation.
            {/if}
        </div>
    </div>

    <div class="setting-divider"></div>

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

    <div class="setting-divider"></div>

    <div class="setting-group">
        <label class="setting-label">Default Airspeed (TAS)</label>
        <div class="setting-input">
            <input
                type="number"
                value={settings.defaultAirspeed}
                on:change={handleAirspeedChange}
                min="50"
                max="500"
            />
            <span class="unit">kt</span>
        </div>
    </div>

    <div class="setting-group">
        <label class="setting-label">Default Altitude</label>
        <div class="setting-input">
            <input
                type="number"
                value={settings.defaultAltitude}
                on:change={handleAltitudeChange}
                min="0"
                max="45000"
                step="500"
            />
            <span class="unit">ft</span>
        </div>
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
            Automatically fetch terrain elevation for first and last waypoints when importing or creating a flight plan.
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
        <div class="setting-description">
            Maximum number of VFR windows to find across the forecast period (up to 10 days).
        </div>
    </div>

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
            Distance between terrain elevation samples. Lower = more detail, but slower.
            <br/>Current: {settings.terrainSampleInterval} NM interval will fetch ~{estimatedSamples} elevation points
        </div>
    </div>

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
        <div class="setting-description">
            Maximum altitude displayed on the altitude profile graph.
        </div>
    </div>

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

<style lang="less">
    .settings-section {
        padding: 10px;
    }

    .setting-group {
        margin-bottom: 15px;
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

    .setting-info {
        margin-top: 20px;
        padding: 10px;
        background: #1a1a1a;
        border-radius: 4px;

        p {
            margin: 0;
            font-size: 12px;
            color: #888;
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

    .setting-divider {
        height: 1px;
        background: #333;
        margin: 15px 0;
    }
</style>
