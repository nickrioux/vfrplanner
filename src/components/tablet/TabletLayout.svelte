<!--
    TabletLayout - Side panel layout for tablets (768-1024px, touch)
    Reuses existing desktop components with larger touch targets
    Two main tabs: Route | Profile
    Settings/About accessible via icon buttons opening modal overlays
-->
<script lang="ts">
    import { createEventDispatcher } from 'svelte';
    import type { FlightPlan, Waypoint, PluginSettings } from '../../types';
    import type { WaypointWeather, WeatherAlert, ForecastTimeRange } from '../../services/weatherService';
    import type { ElevationPoint } from '../../services/elevationService';
    import type { VFRWindow } from '../../services/vfrWindowService';
    import type { MinimumConditionLevel } from '../../types/vfrWindow';
    import type { VfrConditionThresholds, ConditionPreset } from '../../types/conditionThresholds';
    import type { AirportDBResult, AirportDBNavaid } from '../../services/airportdbService';
    import WaypointTable from '../WaypointTable.svelte';
    import AltitudeProfile from '../AltitudeProfile.svelte';
    import SettingsPanel from '../SettingsPanel.svelte';
    import ConditionsModal from '../ConditionsModal.svelte';
    import HelpModal from '../HelpModal.svelte';
    import AboutTab from '../AboutTab.svelte';
    import DepartureSlider from '../DepartureSlider.svelte';
    import config from '../../pluginConfig';

    const { title } = config;

    // Props - same as desktop
    export let flightPlan: FlightPlan | null;
    export let weatherData: Map<string, WaypointWeather>;
    export let weatherAlerts: Map<string, WeatherAlert[]>;
    export let settings: PluginSettings;
    export let selectedWaypointId: string | null;
    export let editingWaypointId: string | null;
    export let editingWaypointAltitudeId: string | null;
    export let isEditMode: boolean;
    export let isLoadingWeather: boolean;
    export let isLoading: boolean;
    export let error: string | null;
    export let forecastRange: ForecastTimeRange | null;
    export let departureTime: number;
    export let syncWithWindy: boolean;
    export let adjustForecastForFlightTime: boolean;
    export let isSearchingWindows: boolean;
    export let windowSearchProgress: number;
    export let windowSearchMinCondition: MinimumConditionLevel;
    export let vfrWindows: VFRWindow[] | null;
    export let windowSearchError: string | null;
    export let elevationProfile: ElevationPoint[];
    export let maxProfileAltitude: number;
    export let profileScale: number;
    export let weatherError: string | null;
    export let weatherModelWarning: string | null;
    export let showSearchPanel: boolean;
    export let searchQuery: string;
    export let searchResults: { airports: AirportDBResult[]; navaids: AirportDBNavaid[] };
    export let isSearching: boolean;
    export let searchError: string | null;
    export let showExportMenu: boolean;
    export let editingPlanName: boolean;
    export let ceilingDataReliable: boolean = true;
    export let version: string;

    const dispatch = createEventDispatcher();

    let activeTab: 'route' | 'profile' | 'settings' | 'help' | 'about' = 'route';
    let showConditionsModal = false;

    function handleConditionsSave(e: CustomEvent<VfrConditionThresholds>) {
        dispatch('conditionsSave', e.detail);
        showConditionsModal = false;
    }

    function handleConditionsCancel() {
        dispatch('conditionsCancel');
        showConditionsModal = false;
    }
</script>

<div class="plugin__mobile-header">{title}</div>

<section class="tablet-layout plugin__content">
    <!-- Tab navigation -->
    <div class="tablet-topbar">
        <div class="tablet-tabs">
            {#if flightPlan}
                <button class="tablet-tab" class:active={activeTab === 'route'} on:click={() => activeTab = 'route'}>
                    Route
                </button>
                <button
                    class="tablet-tab"
                    class:active={activeTab === 'profile'}
                    on:click={() => activeTab = 'profile'}
                    disabled={!flightPlan || flightPlan.waypoints.length < 2}
                >
                    Profile
                </button>
                <button class="tablet-tab" class:active={activeTab === 'settings'} on:click={() => activeTab = 'settings'}>
                    Settings
                </button>
            {/if}
            <button class="tablet-tab" class:active={activeTab === 'help'} on:click={() => activeTab = 'help'}>
                Help
            </button>
            {#if flightPlan}
                <button class="tablet-tab" class:active={activeTab === 'about'} on:click={() => activeTab = 'about'}>
                    About
                </button>
            {/if}
        </div>
    </div>

    <!-- Main content scroll area -->
    <div class="tablet-content">
        <!-- Import/Plan header -->
        <div class="import-section">
            <div
                class="drop-zone"
                on:dragover|preventDefault
                on:drop|preventDefault={(e) => dispatch('fileSelect', e.dataTransfer?.files?.[0])}
            >
                <input
                    type="file"
                    accept=".fpl,.xml,.gpx,application/xml,text/xml,application/gpx+xml,*/*"
                    on:change={(e) => dispatch('fileSelect', e.target?.files?.[0])}
                    style="display: none"
                    id="tablet-file-input"
                />
                {#if isLoading}
                    <span class="loading">Loading...</span>
                {:else if !flightPlan}
                    <div class="drop-zone-content">
                        <span class="drop-icon">✈️</span>
                        <span>Drop .fpl/.gpx file or</span>
                        <div class="drop-zone-buttons">
                            <button class="btn-browse" on:click={() => document.getElementById('tablet-file-input')?.click()}>
                                Browse...
                            </button>
                            <button class="btn-new" on:click={() => dispatch('createNewFlightPlan')}>
                                ✈️ New Plan
                            </button>
                        </div>
                    </div>
                {:else}
                    <div class="flight-plan-loaded">
                        {#if editingPlanName}
                            <input
                                type="text"
                                class="plan-name-input"
                                value={flightPlan.name}
                                on:blur={(e) => dispatch('finishEditPlanName', e.currentTarget.value)}
                                on:keydown={(e) => {
                                    if (e.key === 'Enter') dispatch('finishEditPlanName', e.currentTarget.value);
                                    if (e.key === 'Escape') editingPlanName = false;
                                }}
                                on:click|stopPropagation
                                autofocus
                            />
                        {:else}
                            <span class="plan-name" on:click|stopPropagation={() => dispatch('startEditPlanName')}
                                title="Click to rename"
                            >{flightPlan.name}</span>
                        {/if}
                        <button class="btn-clear" on:click={() => dispatch('clearFlightPlan')} title="Clear flight plan">✕</button>
                    </div>
                {/if}
            </div>
            {#if error}
                <div class="error-message">{error}</div>
            {/if}
        </div>

        <!-- Route tab content -->
        {#if activeTab === 'route'}
            {#if flightPlan}
                <!-- Action buttons -->
                <div class="action-buttons">
                    <div class="action-row">
                        <button
                            class="btn-action btn-weather"
                            class:has-alerts={weatherAlerts.size > 0}
                            on:click={() => dispatch('readWeather')}
                            disabled={isLoadingWeather}
                        >
                            {#if isLoadingWeather}⏳ Loading...{:else}🌤️ Read Wx{/if}
                        </button>
                        <button class="btn-action" on:click={() => dispatch('reverseRoute')}>🔄 Reverse</button>
                        <button
                            class="btn-action"
                            class:btn-edit-active={isEditMode}
                            on:click={() => dispatch('toggleEditMode')}
                        >
                            {isEditMode ? '✏️ Done' : '✏️ Edit'}
                        </button>
                    </div>
                    <div class="action-row action-row-center">
                        <div class="export-dropdown">
                            <button class="btn-action" on:click|stopPropagation={() => dispatch('showExportMenuChange', !showExportMenu)}>
                                📥 Export {showExportMenu ? '▴' : '▾'}
                            </button>
                            {#if showExportMenu}
                                <div class="export-backdrop" on:click={() => dispatch('showExportMenuChange', false)}></div>
                                <div class="export-menu">
                                    <button on:click={() => { dispatch('exportGPX'); dispatch('showExportMenuChange', false); }}>📄 GPX file</button>
                                    <button on:click={() => { dispatch('exportFPL'); dispatch('showExportMenuChange', false); }}>📄 FPL file (ForeFlight)</button>
                                    <button on:click={() => { dispatch('sendToDistancePlanning'); dispatch('showExportMenuChange', false); }}>🗺️ Windy Distance & Planning</button>
                                </div>
                            {/if}
                        </div>
                    </div>
                    <div class="weather-options">
                        <label class="checkbox-label" title="Adjust forecast for flight time">
                            <input
                                type="checkbox"
                                checked={adjustForecastForFlightTime}
                                on:change={(e) => dispatch('toggleAdjustForecast', e.currentTarget.checked)}
                            />
                            Adjust forecast for flight time
                        </label>
                    </div>
                </div>

                <!-- Search Panel toggle -->
                <div class="search-section">
                    <button
                        class="btn-search-toggle"
                        class:active={showSearchPanel}
                        on:click={() => dispatch('toggleSearchPanel')}
                    >
                        🔍 {showSearchPanel ? 'Hide Search' : 'Search Airports'}
                    </button>
                    {#if showSearchPanel}
                        <div class="search-panel">
                            <div class="search-input-row">
                                <input
                                    type="text"
                                    class="search-input"
                                    placeholder="Enter ICAO code..."
                                    value={searchQuery}
                                    on:input={(e) => dispatch('searchQueryChange', e.currentTarget.value)}
                                    on:keydown={(e) => e.key === 'Enter' && dispatch('search')}
                                />
                                <button class="btn-search" on:click={() => dispatch('search')} disabled={isSearching}>
                                    {isSearching ? '...' : '🔍'}
                                </button>
                            </div>
                            {#if searchError}
                                <div class="search-error">{searchError}</div>
                            {/if}
                            {#if searchResults.airports.length > 0 || searchResults.navaids.length > 0}
                                <div class="search-results">
                                    {#each searchResults.airports as airport}
                                        <div class="search-result-item" on:click={() => dispatch('addAirport', airport)}>
                                            <span class="result-icon">✈️</span>
                                            <span class="result-id">{airport.icao_code}</span>
                                            <span class="result-name">{airport.name}</span>
                                            <button class="btn-add-result">+</button>
                                        </div>
                                    {/each}
                                    {#each searchResults.navaids as navaid}
                                        <div class="search-result-item" on:click={() => dispatch('addNavaid', navaid)}>
                                            <span class="result-icon">📡</span>
                                            <span class="result-id">{navaid.ident || navaid.name}</span>
                                            <span class="result-name">{navaid.name}</span>
                                            <button class="btn-add-result">+</button>
                                        </div>
                                    {/each}
                                </div>
                            {/if}
                        </div>
                    {/if}
                </div>

                {#if weatherError}
                    <div class="weather-error">{weatherError}</div>
                {/if}
                {#if weatherModelWarning}
                    <div class="weather-model-warning">⚠️ {weatherModelWarning}</div>
                {/if}

                <!-- Departure Slider -->
                {#if forecastRange}
                    <DepartureSlider
                        {departureTime}
                        {forecastRange}
                        {syncWithWindy}
                        totalEte={flightPlan?.totals?.ete || 0}
                        canSearch={flightPlan && flightPlan.waypoints.length >= 2}
                        {isSearchingWindows}
                        {windowSearchProgress}
                        windowSearchError={windowSearchError}
                        {vfrWindows}
                        {windowSearchMinCondition}
                        on:change={(e) => dispatch('departureTimeChange', e.detail)}
                        on:syncToggle
                        on:findWindows
                        on:useWindow
                        on:minConditionChange
                    />
                {/if}

                <!-- Waypoint Table -->
                {#if flightPlan.waypoints.length > 0}
                    <WaypointTable
                        {flightPlan}
                        {weatherData}
                        {weatherAlerts}
                        {settings}
                        {selectedWaypointId}
                        {editingWaypointId}
                        {editingWaypointAltitudeId}
                        {ceilingDataReliable}
                        on:selectWaypoint
                        on:startEditWaypointName
                        on:finishEditWaypointName
                        on:cancelEditWaypointName
                        on:startEditWaypointAltitude
                        on:finishEditWaypointAltitude
                        on:cancelEditWaypointAltitude
                        on:moveWaypointUp
                        on:moveWaypointDown
                        on:deleteWaypoint
                    />
                {/if}
            {/if}
        {/if}

        <!-- Profile tab -->
        {#if activeTab === 'profile' && flightPlan && flightPlan.waypoints.length >= 2}
            {#if weatherData.size === 0}
                <div class="profile-empty">
                    <p>Please click "Read Wx" to fetch weather data before viewing the profile.</p>
                </div>
            {:else}
                <AltitudeProfile
                    {flightPlan}
                    {weatherData}
                    {elevationProfile}
                    {settings}
                    maxAltitude={maxProfileAltitude}
                    scale={profileScale}
                    on:waypointClick
                />
            {/if}
        {/if}

        <!-- Settings tab -->
        {#if activeTab === 'settings' && flightPlan}
            <SettingsPanel
                bind:maxProfileAltitude
                {flightPlan}
                conditionPreset={settings.conditionPreset}
                on:change={() => dispatch('settingsChange')}
                on:profileAltitudeChange
                on:openConditionsModal={() => showConditionsModal = true}
                on:presetChange
            />
        {/if}

        <!-- Help tab -->
        {#if activeTab === 'help'}
            <HelpModal on:close={() => activeTab = 'route'} />
        {/if}

        <!-- About tab -->
        {#if activeTab === 'about' && flightPlan}
            <AboutTab {version} />
        {/if}
    </div>

    <!-- Conditions Modal (keeps modal since it's a save/cancel dialog) -->
    <ConditionsModal
        visible={showConditionsModal}
        thresholds={settings.customThresholds}
        on:save={handleConditionsSave}
        on:cancel={handleConditionsCancel}
    />
</section>

<style lang="less">
    .tablet-layout {
        display: flex;
        flex-direction: column;
        height: 100%;
    }

    .tablet-topbar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 8px 12px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        flex-shrink: 0;
    }

    .tablet-tabs {
        display: flex;
        gap: 4px;
    }

    .tablet-tab {
        padding: 10px 20px;
        min-height: 48px;
        background: rgba(255, 255, 255, 0.05);
        border: none;
        border-radius: 8px;
        color: rgba(255, 255, 255, 0.7);
        cursor: pointer;
        font-size: 15px;
        touch-action: manipulation;
        -webkit-tap-highlight-color: transparent;

        &.active {
            background: #3498db;
            color: white;
        }

        &:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }
    }

    .tablet-content {
        flex: 1;
        overflow-y: auto;
        overflow-x: hidden;
        padding: 0 12px 12px;
        -webkit-overflow-scrolling: touch;
    }

    /* Larger touch targets for tablet */
    .tablet-layout :global(.btn-action) {
        min-height: 48px;
        padding: 10px 12px;
        font-size: 14px;
    }

    .tablet-layout :global(.search-result-item) {
        min-height: 48px;
    }

    .tablet-layout :global(.btn-add-result) {
        min-height: 48px;
        min-width: 48px;
    }

    /* Reuse desktop styles for remaining elements */
    .import-section { padding: 10px; }

    .drop-zone {
        border: 2px dashed rgba(255, 255, 255, 0.3);
        border-radius: 8px;
        padding: 20px;
        text-align: center;
    }

    .drop-zone-content {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 8px;
    }

    .drop-icon { font-size: 32px; }

    .drop-zone-buttons {
        display: flex;
        gap: 8px;
        margin-top: 8px;
    }

    .btn-browse, .btn-new {
        padding: 10px 20px;
        min-height: 48px;
        border: none;
        border-radius: 8px;
        color: white;
        cursor: pointer;
        font-size: 15px;
        touch-action: manipulation;
    }

    .btn-browse { background: #3498db; }
    .btn-new { background: #27ae60; }

    .flight-plan-loaded {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
    }

    .plan-name {
        font-weight: 500;
        color: #3498db;
        cursor: pointer;
        padding: 4px 8px;
        min-height: 48px;
        display: inline-flex;
        align-items: center;
    }

    .plan-name-input {
        flex: 1;
        background: rgba(0, 0, 0, 0.3);
        border: 1px solid #3498db;
        border-radius: 4px;
        color: #3498db;
        font-size: 14px;
        padding: 4px 8px;
        outline: none;
    }

    .btn-clear {
        padding: 4px 8px;
        min-height: 48px;
        background: rgba(255, 255, 255, 0.1);
        border: none;
        border-radius: 4px;
        color: rgba(255, 255, 255, 0.7);
        cursor: pointer;

        &:active {
            background: rgba(231, 76, 60, 0.3);
            color: #e74c3c;
        }
    }

    .loading { color: #3498db; }

    .error-message {
        margin-top: 10px;
        padding: 8px;
        background: rgba(231, 76, 60, 0.2);
        border-radius: 4px;
        color: #e74c3c;
        font-size: 12px;
    }

    .action-buttons {
        display: flex;
        flex-direction: column;
        gap: 6px;
        padding: 0 10px 10px;
    }

    .action-row {
        display: flex;
        gap: 6px;

        &.action-row-center {
            justify-content: center;
        }
    }

    .btn-action {
        flex: 1;
        padding: 10px 12px;
        min-height: 48px;
        background: rgba(255, 255, 255, 0.1);
        border: none;
        border-radius: 8px;
        color: rgba(255, 255, 255, 0.9);
        cursor: pointer;
        font-size: 14px;
        touch-action: manipulation;

        &:active:not(:disabled) { transform: scale(0.98); }
        &:disabled { opacity: 0.6; cursor: not-allowed; }
        &.btn-weather.has-alerts {
            background: rgba(243, 156, 18, 0.3);
            border: 1px solid #f39c12;
        }
        &.btn-edit-active {
            background: #27ae60;
            color: white;
        }
    }

    .export-dropdown {
        position: relative;
        width: calc(33.33% - 4px);

        > .btn-action { width: 100%; flex: none; }
    }

    .export-backdrop {
        position: fixed;
        top: 0; left: 0; right: 0; bottom: 0;
        z-index: 99;
    }

    .export-menu {
        position: absolute;
        top: 100%;
        left: 0; right: 0;
        margin-top: 4px;
        background: #2a2a2a;
        border: 1px solid #444;
        border-radius: 4px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
        z-index: 100;
        overflow: hidden;

        button {
            display: block;
            width: 100%;
            padding: 12px;
            background: transparent;
            border: none;
            color: rgba(255, 255, 255, 0.9);
            font-size: 14px;
            text-align: left;
            cursor: pointer;
            min-height: 48px;

            &:active { background: rgba(255, 255, 255, 0.1); }
            &:not(:last-child) { border-bottom: 1px solid #444; }
        }
    }

    .weather-options {
        display: flex;
        align-items: center;
        padding: 4px 0;
        font-size: 12px;

        .checkbox-label {
            display: flex;
            align-items: center;
            gap: 6px;
            cursor: pointer;
            color: rgba(255, 255, 255, 0.7);

            input[type="checkbox"] { margin: 0; cursor: pointer; }
        }
    }

    .search-section { margin: 10px; }

    .btn-search-toggle {
        width: 100%;
        padding: 12px 15px;
        min-height: 48px;
        background: rgba(52, 152, 219, 0.2);
        border: 1px solid rgba(52, 152, 219, 0.5);
        border-radius: 8px;
        color: rgba(255, 255, 255, 0.9);
        cursor: pointer;
        font-size: 14px;
        touch-action: manipulation;

        &.active {
            background: rgba(52, 152, 219, 0.4);
            border-color: #3498db;
        }
    }

    .search-panel {
        margin-top: 10px;
        padding: 10px;
        background: rgba(0, 0, 0, 0.2);
        border-radius: 6px;
    }

    .search-input-row {
        display: flex;
        gap: 6px;
    }

    .search-input {
        flex: 1;
        padding: 10px;
        background: rgba(0, 0, 0, 0.3);
        border: 1px solid rgba(255, 255, 255, 0.2);
        border-radius: 4px;
        color: white;
        font-size: 14px;

        &::placeholder { color: rgba(255, 255, 255, 0.5); }
        &:focus { outline: none; border-color: #3498db; }
    }

    .btn-search {
        padding: 10px 14px;
        min-height: 48px;
        background: rgba(52, 152, 219, 0.3);
        border: 1px solid #3498db;
        border-radius: 4px;
        color: white;
        cursor: pointer;
        font-size: 16px;

        &:disabled { opacity: 0.5; cursor: not-allowed; }
    }

    .search-error {
        margin-top: 8px;
        padding: 6px 8px;
        background: rgba(231, 76, 60, 0.2);
        border-radius: 4px;
        color: #e74c3c;
        font-size: 12px;
    }

    .search-results {
        margin-top: 8px;
        max-height: 200px;
        overflow-y: auto;
        border-radius: 4px;
        background: rgba(0, 0, 0, 0.2);
    }

    .search-result-item {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 10px;
        min-height: 48px;
        cursor: pointer;
        border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        touch-action: manipulation;

        &:active { background: rgba(52, 152, 219, 0.2); }
        &:last-child { border-bottom: none; }
    }

    .result-icon { font-size: 14px; flex-shrink: 0; }
    .result-id { font-weight: 600; color: #3498db; font-size: 13px; min-width: 45px; }
    .result-name { flex: 1; font-size: 12px; color: rgba(255, 255, 255, 0.8); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .btn-add-result {
        padding: 4px 10px;
        min-height: 48px; min-width: 48px;
        background: rgba(39, 174, 96, 0.3);
        border: 1px solid #27ae60;
        border-radius: 3px;
        color: white;
        cursor: pointer;
        font-size: 16px; font-weight: bold;
        touch-action: manipulation;
    }

    .weather-error {
        margin: 0 10px 10px;
        padding: 8px;
        background: rgba(231, 76, 60, 0.2);
        border-radius: 4px;
        color: #e74c3c;
        font-size: 12px;
    }

    .weather-model-warning {
        margin: 0 10px 10px;
        padding: 8px;
        background: rgba(243, 156, 18, 0.2);
        border-radius: 4px;
        color: #f39c12;
        font-size: 12px;
    }

    .profile-empty {
        padding: 20px;
        text-align: center;
        color: rgba(255, 255, 255, 0.7);
        font-size: 14px;

        p { margin: 0; }
    }
</style>
