<!-- Mobile header -->
<div class="plugin__mobile-header">
    {title}
</div>

<section
    class="plugin__content"
    class:mobile={isMobile}
>
    <!-- Panel mode title -->
    <div class="plugin__title-row">
        <div
            class="plugin__title plugin__title--chevron-back"
            on:click={() => bcast.emit('rqstOpen', 'menu')}
        >
            {title}
        </div>
        <button class="btn-help" on:click={() => showHelpModal = true} title="Help">?</button>
    </div>

    <!-- Main content -->
    <div class="main-content-scroll">

    <!-- Tabs -->
    {#if flightPlan}
        <div class="tabs">
            <button
                class="tab"
                class:active={activeTab === 'route'}
                on:click={() => activeTab = 'route'}
            >Route</button>
            <button
                class="tab"
                class:active={activeTab === 'profile'}
                on:click={() => activeTab = 'profile'}
                disabled={!flightPlan || flightPlan.waypoints.length < 2}
            >Profile</button>
            <button
                class="tab"
                class:active={activeTab === 'settings'}
                on:click={() => activeTab = 'settings'}
            >Settings</button>
            <button
                class="tab"
                class:active={activeTab === 'about'}
                on:click={() => activeTab = 'about'}
            >About</button>
        </div>
    {/if}

    <!-- Import Section -->
    <div class="import-section">
        <div
            class="drop-zone"
            class:drag-over={isDragOver}
            on:dragover={handleDragOver}
            on:dragleave={handleDragLeave}
            on:drop={handleDrop}
        >
            <input
                type="file"
                accept=".fpl,.xml,.gpx"
                on:change={handleFileSelect}
                bind:this={fileInput}
                style="display: none"
            />
            {#if isLoading}
                <span class="loading">Loading...</span>
            {:else if !flightPlan}
                <div class="drop-zone-content">
                    <span class="drop-icon">✈️</span>
                    <span>Drop .fpl/.gpx file or</span>
                    <div class="drop-zone-buttons">
                        <button class="btn-browse" on:click={() => fileInput?.click()}>
                            Browse...
                        </button>
                        <button class="btn-new" on:click={createNewFlightPlan}>
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
                            on:blur={(e) => finishEditPlanName(e.currentTarget.value)}
                            on:keydown={(e) => {
                                if (e.key === 'Enter') finishEditPlanName(e.currentTarget.value);
                                if (e.key === 'Escape') editingPlanName = false;
                            }}
                            on:click|stopPropagation
                            autofocus
                        />
                    {:else}
                        <span
                            class="plan-name"
                            on:click|stopPropagation={startEditPlanName}
                            title="Click to rename"
                        >{flightPlan.name}</span>
                    {/if}
                    <button class="btn-clear" on:click={clearFlightPlan} title="Clear flight plan">✕</button>
                </div>
            {/if}
        </div>
        {#if error}
            <div class="error-message">{error}</div>
        {/if}
    </div>

    <!-- Route Tab -->
    {#if activeTab === 'route'}
        <!-- Action Buttons -->
        {#if flightPlan}
            <div class="action-buttons">
                <div class="action-row">
                    <button
                        class="btn-action btn-weather"
                        class:has-alerts={hasAnyAlerts()}
                        on:click={handleReadWeather}
                        disabled={isLoadingWeather}
                        title="Fetch weather for all waypoints"
                    >
                        {#if isLoadingWeather}
                            ⏳ Loading...
                        {:else}
                            🌤️ Read Wx
                        {/if}
                    </button>
                    <button
                        class="btn-action"
                        on:click={handleReverseRoute}
                        title="Reverse the route order"
                    >
                        🔄 Reverse
                    </button>
                    <button
                        class="btn-action"
                        class:btn-edit-active={isEditMode}
                        on:click={toggleEditMode}
                        title={isEditMode ? 'Exit edit mode (Esc)' : 'Edit: add/move waypoints'}
                    >
                        {isEditMode ? '✏️ Done' : '✏️ Edit'}
                    </button>
                </div>
                <div class="action-row action-row-center">
                    <div class="export-dropdown">
                        <button
                            class="btn-action"
                            on:click|stopPropagation={() => showExportMenu = !showExportMenu}
                            title="Export flight plan"
                        >
                            📥 Export {showExportMenu ? '▴' : '▾'}
                        </button>
                        {#if showExportMenu}
                            <div class="export-backdrop" on:click={() => showExportMenu = false}></div>
                            <div class="export-menu">
                                <button on:click={() => { handleExportGPX(); showExportMenu = false; }}>
                                    📄 GPX file
                                </button>
                                <button on:click={() => { handleExportFPL(); showExportMenu = false; }}>
                                    📄 FPL file (ForeFlight)
                                </button>
                                <button on:click={() => { handleSendToDistancePlanning(); showExportMenu = false; }}>
                                    🗺️ Windy Distance & Planning
                                </button>
                            </div>
                        {/if}
                    </div>
                </div>
                <div class="weather-options">
                    <label class="checkbox-label" title="When enabled, weather at each waypoint is forecast for your estimated arrival time. When disabled, all waypoints show weather for departure time.">
                        <input
                            type="checkbox"
                            checked={adjustForecastForFlightTime}
                            on:change={(e) => weatherStore.setAdjustForecastForFlightTime(e.currentTarget.checked)}
                        />
                        Adjust forecast for flight time
                    </label>
                </div>
            </div>
        {/if}

        <!-- Airport Search Section (always visible in Route tab) -->
        <div class="search-section">
            <button
                class="btn-search-toggle"
                class:active={showSearchPanel}
                on:click={toggleSearchPanel}
                title="Search airports by ICAO code"
            >
                🔍 {showSearchPanel ? 'Hide Search' : 'Search Airports'}
            </button>

            {#if showSearchPanel}
                <div class="search-panel">
                    <div class="search-input-row">
                        <input
                            type="text"
                            class="search-input"
                            placeholder="Enter ICAO code (e.g., CYQB, KJFK)..."
                            bind:value={searchQuery}
                            on:keydown={(e) => e.key === 'Enter' && handleSearch()}
                        />
                        <button
                            class="btn-search"
                            on:click={handleSearch}
                            disabled={isSearching}
                            title="Search by ICAO code"
                        >
                            {isSearching ? '...' : '🔍'}
                        </button>
                    </div>
                    {#if searchError}
                        <div class="search-error">{searchError}</div>
                    {/if}
                    {#if searchResults.airports.length > 0 || searchResults.navaids.length > 0}
                        <div class="search-results">
                            {#each searchResults.airports as airport}
                                {@const info = getAirportDisplayInfo(airport)}
                                <div class="search-result-item" on:click={() => addAirportToFlightPlan(airport)}>
                                    <span class="result-icon">✈️</span>
                                    <span class="result-id">{info.identifier}</span>
                                    <span class="result-name">{info.name}</span>
                                    <span class="result-type">{info.type}</span>
                                    <button class="btn-add-result" title="Add to flight plan">+</button>
                                </div>
                            {/each}
                            {#each searchResults.navaids as navaid}
                                {@const info = getNavaidDisplayInfo(navaid)}
                                <div class="search-result-item" on:click={() => addNavaidToFlightPlan(navaid)}>
                                    <span class="result-icon">📡</span>
                                    <span class="result-id">{info.identifier}</span>
                                    <span class="result-name">{info.name}</span>
                                    <span class="result-type">{info.type}{info.frequency ? ` ${info.frequency}` : ''}</span>
                                    <button class="btn-add-result" title="Add to flight plan">+</button>
                                </div>
                            {/each}
                        </div>
                    {/if}
                    {#if airportProvider.isUsingFallback()}
                        <div class="search-hint fallback-indicator" title={airportProvider.getCoverageDescription() || ''}>
                            Using offline airport data ({airportProvider.getCoverageDescription()})
                        </div>
                    {/if}
                </div>
            {/if}
        </div>

        {#if flightPlan}
            {#if weatherError}
                <div class="weather-error">{weatherError}</div>
            {/if}
            {#if weatherModelWarning}
                <div class="weather-model-warning">⚠️ {weatherModelWarning}</div>
            {/if}

            <!-- Departure Time Slider -->
            {#if forecastRange}
                <DepartureSlider
                    departureTime={departureTime}
                    {forecastRange}
                    syncWithWindy={syncWithWindy}
                    totalEte={flightPlan?.totals?.ete || 0}
                    canSearch={flightPlan && flightPlan.waypoints.length >= 2}
                    {isSearchingWindows}
                    {windowSearchProgress}
                    {windowSearchError}
                    {vfrWindows}
                    windowSearchMinCondition={windowSearchMinCondition}
                    on:change={handleDepartureTimeChange}
                    on:syncToggle={toggleWindySync}
                    on:findWindows={handleFindVFRWindows}
                    on:useWindow={(e) => useVFRWindow(e.detail)}
                    on:minConditionChange={(e) => vfrWindowStore.setMinCondition(e.detail)}
                />
            {/if}
        {/if}

        <!-- Waypoint Table -->
        {#if flightPlan && flightPlan.waypoints.length > 0}
            <WaypointTable
                {flightPlan}
                {weatherData}
                {weatherAlerts}
                {settings}
                {selectedWaypointId}
                {editingWaypointId}
                {editingWaypointAltitudeId}
                ceilingDataReliable={true}
                on:selectWaypoint={(e) => selectWaypoint(e.detail)}
                on:startEditWaypointName={(e) => startEditWaypointName(e.detail)}
                on:finishEditWaypointName={(e) => finishEditWaypointName(e.detail.waypointId, e.detail.newName)}
                on:cancelEditWaypointName={() => editingWaypointId = null}
                on:startEditWaypointAltitude={(e) => startEditWaypointAltitude(e.detail)}
                on:finishEditWaypointAltitude={(e) => finishEditWaypointAltitude(e.detail.waypointId, e.detail.newAltitude)}
                on:cancelEditWaypointAltitude={() => editingWaypointAltitudeId = null}
                on:moveWaypointUp={(e) => moveWaypointUp(e.detail)}
                on:moveWaypointDown={(e) => moveWaypointDown(e.detail)}
                on:deleteWaypoint={(e) => deleteWaypoint(e.detail)}
            />

            <div class="setting-info">
                <p>Tip: Use the Edit button to add, move, or insert waypoints on the map. Press Escape to exit edit mode.</p>
            </div>
        {/if}
    {/if}

    <!-- Profile Tab -->
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
                on:waypointClick={(e) => selectWaypointById(e.detail)}
            />
        {/if}
    {/if}

    <!-- Settings Tab -->
    {#if activeTab === 'settings' && flightPlan}
        <!-- Settings Panel Component -->
        <SettingsPanel
            bind:maxProfileAltitude
            {flightPlan}
            conditionPreset={settings.conditionPreset}
            on:change={handleSettingsChange}
            on:profileAltitudeChange={handleProfileAltitudeChange}
            on:openConditionsModal={handleOpenConditionsModal}
            on:presetChange={handlePresetChange}
        />
    {/if}

    <!-- About Tab -->
    {#if activeTab === 'about' && flightPlan}
        <AboutTab version={config.version} />
    {/if}

    </div><!-- /main-content-scroll -->

    <!-- Conditions Modal -->
    <ConditionsModal
        visible={showConditionsModal}
        thresholds={settings.customThresholds}
        on:save={handleConditionsSave}
        on:cancel={handleConditionsCancel}
    />

    <!-- Help Modal -->
    {#if showHelpModal}
        <HelpModal on:close={() => showHelpModal = false} />
    {/if}
</section>

<script lang="ts">
    import bcast from '@windy/broadcast';
    import { map } from '@windy/map';
    import { singleclick } from '@windy/singleclick';
    import store from '@windy/store';
    import { onDestroy, onMount, tick } from 'svelte';

    import config from './pluginConfig';
    import { formatDistance, formatBearing, formatEte, calculateGroundSpeed, formatHeadwind, calculateHeadwindComponent } from './services/navigationCalc';
    import { downloadGPX } from './exporters/gpxExporter';
    import { downloadFPL } from './exporters/fplExporter';
    import {
        getForecastTimeRange,
        DEFAULT_ALERT_THRESHOLDS,
        type WaypointWeather,
        type WeatherAlert,
        type ForecastTimeRange,
    } from './services/weatherService';
    import type { SegmentCondition, BestRunwayResult } from './services/profileService';
    import { getWaypointIcon } from './utils/displayUtils';
    import { logger } from './services/logger';
    import { findVFRWindows, type VFRWindow, type VFRWindowSearchResult } from './services/vfrWindowService';
    import type { MinimumConditionLevel, VFRWindowCSVData } from './types/vfrWindow';
    import { fetchRouteElevationProfile, type ElevationPoint } from './services/elevationService';
    import {
        searchAirport,
        getAirportByICAO,
        getAirportDisplayInfo,
        getNavaidDisplayInfo,
        type AirportDBResult,
        type AirportDBNavaid,
    } from './services/airportdbService';
    import {
        createAirportProvider,
        type IAirportProvider,
        type AirportSearchResult,
    } from './services/airportProvider';
    import type { FlightPlan, Waypoint, WaypointType, PluginSettings, RunwayInfo } from './types';
    import { DEFAULT_SETTINGS } from './types';
    import { type VfrConditionThresholds, type ConditionPreset, getThresholdsForPreset } from './types/conditionThresholds';
    import { getActiveThresholds } from './services/vfrConditionRules';
    import AltitudeProfile from './components/AltitudeProfile.svelte';
    import SettingsPanel from './components/SettingsPanel.svelte';
    import ConditionsModal from './components/ConditionsModal.svelte';
    import WaypointTable from './components/WaypointTable.svelte';
    import HelpModal from './components/HelpModal.svelte';
    import AboutTab from './components/AboutTab.svelte';
    import DepartureSlider from './components/DepartureSlider.svelte';
    import { createSessionStorage } from './services/sessionStorage';
    import { routeStore, type RouteSettings } from './stores/routeStore';
    import {
        weatherStore,
        vfrWindowStore,
        departureTimeStore,
        type WeatherState,
        type VFRWindowState,
        type DepartureTimeState,
    } from './stores/weatherStore';
    import { settingsStore } from './stores/settingsStore';
    import {
        initWeatherController,
        fetchWeatherForRoute,
        searchVFRWindows,
        useVFRWindow as controllerUseVFRWindow,
        resetWeatherState,
        handleWindyTimestampChange as controllerHandleWindyTimestampChange,
    } from './controllers/weatherController';
    import {
        initRouteController,
        loadFlightPlanFile,
        clearFlightPlan as controllerClearFlightPlan,
        createNewFlightPlan as controllerCreateNewFlightPlan,
        addAirportToFlightPlan as controllerAddAirportToFlightPlan,
        addNavaidToFlightPlan as controllerAddNavaidToFlightPlan,
        addWaypointFromMapClick,
        insertWaypointOnSegment as controllerInsertWaypointOnSegment,
        deleteWaypoint as controllerDeleteWaypoint,
        moveWaypointUp as controllerMoveWaypointUp,
        moveWaypointDown as controllerMoveWaypointDown,
        handleWaypointDrag as controllerHandleWaypointDrag,
        updateWaypointName as controllerUpdateWaypointName,
        updateWaypointAltitude as controllerUpdateWaypointAltitude,
        updatePlanName as controllerUpdatePlanName,
        reverseRoute as controllerReverseRoute,
        handleAircraftSettingsChange,
        selectWaypoint as controllerSelectWaypoint,
        selectWaypointById as controllerSelectWaypointById,
        toggleEditMode as controllerToggleEditMode,
    } from './controllers/routeController';
    import {
        initMapController,
        updateMapLayers,
        clearMapLayers,
        fitMapToRoute,
    } from './controllers/mapController';

    import type { LatLon } from '@windy/interfaces';

    const { name, title } = config;

    // Session storage instance
    const sessionStorage = createSessionStorage(name);

    // Route store subscription - provides flightPlan, selectedWaypointId, editingWaypointId, isEditMode
    $: flightPlan = $routeStore.flightPlan;
    $: selectedWaypointId = $routeStore.selectedWaypointId;
    $: editingWaypointId = $routeStore.editingWaypointId;
    $: isEditMode = $routeStore.isEditMode;
    $: routeError = $routeStore.error;

    // UI-only state (not managed by store)
    let editingWaypointAltitudeId: string | null = null;
    let editingPlanName: boolean = false;
    let isLoading = false;
    let isDragOver = false;
    let error: string | null = null;
    let fileInput: HTMLInputElement;
    let activeTab: 'route' | 'profile' | 'settings' = 'route';

    // Conditions modal state
    let showConditionsModal = false;
    let showHelpModal = false;

    // AirportDB search state
    let searchQuery = '';
    let searchResults: { airports: AirportDBResult[]; navaids: AirportDBNavaid[] } = { airports: [], navaids: [] };
    let isSearching = false;
    let searchError: string | null = null;
    let showSearchPanel = false;
    let showExportMenu = false;

    // Weather state - from weatherStore
    $: weatherData = $weatherStore.weatherData;
    $: weatherAlerts = $weatherStore.weatherAlerts;
    $: isLoadingWeather = $weatherStore.isLoadingWeather;
    $: weatherError = $weatherStore.weatherError;
    $: weatherModelWarning = $weatherStore.weatherModelWarning;
    $: elevationProfile = $weatherStore.elevationProfile;
    $: forecastRange = $weatherStore.forecastRange;
    $: adjustForecastForFlightTime = $weatherStore.adjustForecastForFlightTime;

    // Departure time state - from departureTimeStore
    $: departureTime = $departureTimeStore.time;
    $: syncWithWindy = $departureTimeStore.syncWithWindy;

    // VFR Window detection state - from vfrWindowStore
    $: isSearchingWindows = $vfrWindowStore.isSearching;
    $: windowSearchProgress = $vfrWindowStore.progress;
    $: windowSearchMinCondition = $vfrWindowStore.minCondition;
    $: vfrWindows = $vfrWindowStore.windows;
    $: windowSearchError = $vfrWindowStore.error;

    // Mobile detection state
    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    let isMobile = isTouchDevice || window.innerWidth < 768;

    /**
     * Reset route panel state when flight plan changes
     * Clears weather data, VFR windows, and related state
     */
    function resetRoutePanel() {
        resetWeatherState();
    }

    // Settings - reactive subscription to settingsStore
    $: settings = $settingsStore;

    // Airport provider - automatically uses fallback when no API key
    let airportProvider: IAirportProvider = createAirportProvider(settings.airportdbApiKey);

    // Sync logger state with settings
    $: logger.setEnabled(settings.enableLogging);

    // Update airport provider when API key changes
    $: airportProvider = createAirportProvider(settings.airportdbApiKey);

    // Profile state
    let maxProfileAltitude: number = 15000;
    let profileScale: number = 511;


    // Drag and drop handlers
    function handleDragOver(event: DragEvent) {
        event.preventDefault();
        isDragOver = true;
    }

    function handleDragLeave() {
        isDragOver = false;
    }

    async function handleDrop(event: DragEvent) {
        event.preventDefault();
        isDragOver = false;

        const files = event.dataTransfer?.files;
        if (files && files.length > 0) {
            await loadFile(files[0]);
        }
    }

    async function handleFileSelect(event: Event) {
        const input = event.target as HTMLInputElement;
        if (input.files && input.files.length > 0) {
            await loadFile(input.files[0]);
        }
    }

    async function loadFile(file: File) {
        error = null;
        isLoading = true;

        try {
            const result = await loadFlightPlanFile(file);
            if (!result.success) {
                error = result.error || 'Failed to load file';
            } else {
                // Fit map to route after successful load
                fitMapToRoute();
                // Auto-fetch weather for the loaded plan
                await fetchWeatherForRoute();
            }
        } finally {
            isLoading = false;
        }
    }

    function clearFlightPlan() {
        controllerClearFlightPlan();
        error = null;
        activeTab = 'route';
        clearMapLayers();
    }

    async function createNewFlightPlan() {
        error = null;
        await controllerCreateNewFlightPlan();
    }

    function selectWaypoint(wp: Waypoint) {
        controllerSelectWaypoint(wp, (lat, lon) => map.panTo([lat, lon]));
    }

    function selectWaypointById(waypointId: string) {
        const wp = controllerSelectWaypointById(waypointId, (lat, lon) => map.panTo([lat, lon]));
        if (wp) {
            // Switch to route tab to show the selected waypoint
            activeTab = 'route';
        }
    }

    async function insertWaypointOnSegment(segmentIndex: number, lat: number, lon: number) {
        await controllerInsertWaypointOnSegment(segmentIndex, lat, lon);
    }

    async function moveWaypointUp(waypointId: string) {
        await controllerMoveWaypointUp(waypointId);
    }

    async function moveWaypointDown(waypointId: string) {
        await controllerMoveWaypointDown(waypointId);
    }

    function startEditWaypointName(waypointId: string) {
        routeStore.setEditingWaypoint(waypointId);
    }

    function finishEditWaypointName(waypointId: string, newName: string) {
        controllerUpdateWaypointName(waypointId, newName);
    }

    function startEditPlanName() {
        editingPlanName = true;
    }

    function finishEditPlanName(newName: string) {
        const trimmedName = newName.trim();
        if (trimmedName === '') {
            editingPlanName = false;
            return;
        }
        controllerUpdatePlanName(trimmedName);
        editingPlanName = false;
    }

    function startEditWaypointAltitude(waypointId: string) {
        editingWaypointAltitudeId = waypointId;
    }

    function finishEditWaypointAltitude(waypointId: string, newAltitude: string) {
        if (controllerUpdateWaypointAltitude(waypointId, newAltitude)) {
            editingWaypointAltitudeId = null;
        } else {
            editingWaypointAltitudeId = null;
        }
    }

    function getWaypointAltitude(wp: Waypoint): number {
        return wp.altitude ?? flightPlan?.aircraft.defaultAltitude ?? settings.defaultAltitude;
    }

    async function deleteWaypoint(waypointId: string) {
        await controllerDeleteWaypoint(waypointId);
    }

    function handleWaypointDrag(waypointId: string, newLat: number, newLon: number) {
        controllerHandleWaypointDrag(waypointId, newLat, newLon);
    }

    function toggleEditMode() {
        controllerToggleEditMode(() => {
            map.getContainer().style.cursor = '';
        });
    }

    // Convert AirportSearchResult to AirportDBResult format for compatibility
    function searchResultToAirportDB(result: AirportSearchResult): AirportDBResult {
        return {
            icao_code: result.icao,
            iata_code: result.iata || '',
            name: result.name,
            type: result.type,
            latitude_deg: result.lat,
            longitude_deg: result.lon,
            elevation_ft: result.elevation,
            continent: '',
            iso_country: result.region.split('-')[0],
            iso_region: result.region,
            municipality: result.municipality || '',
            scheduled_service: '',
            gps_code: result.icao,
            local_code: '',
            home_link: '',
            wikipedia_link: '',
            keywords: '',
            runways: result.runways.map(rwy => ({
                id: rwy.id,
                airport_ref: '',
                airport_ident: result.icao,
                length_ft: rwy.lengthFt,
                width_ft: rwy.widthFt,
                surface: rwy.surface,
                lighted: rwy.lighted,
                closed: rwy.closed,
                le_ident: rwy.lowEnd.ident,
                le_latitude_deg: 0,
                le_longitude_deg: 0,
                le_elevation_ft: 0,
                le_heading_degT: rwy.lowEnd.headingTrue,
                he_ident: rwy.highEnd.ident,
                he_latitude_deg: 0,
                he_longitude_deg: 0,
                he_elevation_ft: 0,
                he_heading_degT: rwy.highEnd.headingTrue,
            })),
            freqs: [],
            country: { id: '', code: result.region.split('-')[0], name: '', continent: '', wikipedia_link: '', keywords: '' },
            region: { id: '', code: result.region, local_code: '', name: '', continent: '', iso_country: result.region.split('-')[0], wikipedia_link: '', keywords: '' },
            navaids: [],
            station: { icao_code: '', distance: 0 },
        };
    }

    // Airport Search Functions
    async function handleSearch() {
        if (!searchQuery.trim()) {
            searchResults = { airports: [], navaids: [] };
            return;
        }

        isSearching = true;
        searchError = null;

        try {
            // Use provider (API or fallback based on API key availability)
            const result = await airportProvider.searchByIcao(searchQuery.trim());
            if (result) {
                // Convert to AirportDBResult format for compatibility
                const airport = searchResultToAirportDB(result);

                // For API results, fetch full data to get navaids
                let navaids: AirportDBNavaid[] = [];
                if (!airportProvider.isUsingFallback() && settings.airportdbApiKey) {
                    const fullData = await getAirportByICAO(result.icao, settings.airportdbApiKey);
                    if (fullData?.navaids) {
                        navaids = fullData.navaids;
                    }
                }

                searchResults = {
                    airports: [airport],
                    navaids
                };
            } else {
                searchResults = { airports: [], navaids: [] };
                if (airportProvider.isUsingFallback()) {
                    const coverage = airportProvider.getCoverageDescription();
                    searchError = `Airport not found in offline database. Coverage: ${coverage}`;
                } else {
                    searchError = 'No airport found. Try an exact ICAO code (e.g., CYQB, KJFK)';
                }
            }
        } catch (err) {
            searchError = err instanceof Error ? err.message : 'Search failed';
            searchResults = { airports: [], navaids: [] };
        } finally {
            isSearching = false;
        }
    }

    async function addAirportToFlightPlan(airport: AirportDBResult) {
        const result = await controllerAddAirportToFlightPlan(airport);
        if (!result.success) {
            searchError = result.error || 'Failed to add airport';
            return;
        }

        // Clear search after adding
        searchQuery = '';
        searchResults = { airports: [], navaids: [] };
        searchError = null;
    }

    async function addNavaidToFlightPlan(navaid: AirportDBNavaid) {
        const result = await controllerAddNavaidToFlightPlan(navaid);
        if (!result.success) {
            searchError = result.error || 'Failed to add navaid';
            return;
        }

        // Clear search after adding
        searchQuery = '';
        searchResults = { airports: [], navaids: [] };
        searchError = null;
    }

    function toggleSearchPanel() {
        showSearchPanel = !showSearchPanel;
        if (!showSearchPanel) {
            searchQuery = '';
            searchResults = { airports: [], navaids: [] };
            searchError = null;
        }
    }

    async function handleMapClick(latLon: LatLon) {
        if (!isEditMode || !flightPlan) return;
        await addWaypointFromMapClick(latLon.lat, latLon.lon);
    }

    function handleSettingsChange() {
        handleAircraftSettingsChange(settings.defaultAirspeed, settings.defaultAltitude);
    }

    function handleOpenConditionsModal() {
        showConditionsModal = true;
    }

    function handleConditionsSave(event: CustomEvent<VfrConditionThresholds>) {
        settingsStore.setCustomThresholds(event.detail);
        showConditionsModal = false;
        // Trigger re-render and save
        handleSettingsChange();
    }

    function handleConditionsCancel() {
        showConditionsModal = false;
    }

    function handlePresetChange(event: CustomEvent<ConditionPreset>) {
        settingsStore.setConditionPreset(event.detail);
        handleSettingsChange();
    }

    function handleProfileAltitudeChange(event: CustomEvent<number>) {
        maxProfileAltitude = event.detail;
    }

    function handleExportGPX() {
        if (!flightPlan) return;
        downloadGPX(flightPlan);
    }

    function handleExportFPL() {
        if (!flightPlan) return;
        downloadFPL(flightPlan);
    }

    function handleSendToDistancePlanning() {
        if (!flightPlan || flightPlan.waypoints.length === 0) return;

        // Build waypoints string: lat1,lon1;lat2,lon2;...
        // Format matches Windy's distance URL format: /distance/lat1,lon1;lat2,lon2;...
        const waypoints = flightPlan.waypoints
            .map(wp => `${wp.lat.toFixed(4)},${wp.lon.toFixed(4)}`)
            .join(';');

        // Construct Windy URL with waypoints in the path
        const windyUrl = `https://www.windy.com/distance/${waypoints}`;

        // Open in new window
        window.open(windyUrl, '_blank', 'noopener,noreferrer');
    }

    function handleReverseRoute() {
        controllerReverseRoute();
    }

    /**
     * Fetch weather for the current flight plan
     * Delegates to weatherController
     */
    async function handleReadWeather() {
        await fetchWeatherForRoute();
        saveSession();
    }

    function getWaypointWeather(waypointId: string): WaypointWeather | undefined {
        return weatherData.get(waypointId);
    }

    function getWaypointAlerts(waypointId: string): WeatherAlert[] {
        return weatherAlerts.get(waypointId) || [];
    }

    function hasAnyAlerts(): boolean {
        return weatherAlerts.size > 0;
    }

    function getAlertSeverityClass(alerts: WeatherAlert[]): string {
        if (alerts.some(a => a.severity === 'warning')) return 'warning';
        if (alerts.some(a => a.severity === 'caution')) return 'caution';
        return '';
    }

    /**
     * Handle departure time change from DepartureSlider
     * Updates store and re-fetches weather
     */
    async function handleDepartureTimeChange(event?: CustomEvent<number>) {
        const newTime = event?.detail ?? departureTime;
        departureTimeStore.setTime(newTime);

        // Update Windy's timeline if sync is enabled
        const depState = departureTimeStore.getState();
        if (depState.syncWithWindy && !depState.isUpdatingFromWindy) {
            departureTimeStore.setUpdatingToWindy(true);
            try {
                store.set('timestamp', newTime);
            } finally {
                setTimeout(() => {
                    departureTimeStore.setUpdatingToWindy(false);
                }, 100);
            }
        }

        // Re-fetch weather for the new departure time
        if (flightPlan && forecastRange) {
            await handleReadWeather();
        }
    }

    /**
     * Handle Windy timestamp change (sync from Windy timeline to plugin)
     */
    function handleWindyTimestampChange(newTimestamp: number) {
        const depState = departureTimeStore.getState();

        // Only sync if enabled and we have a forecast range
        // Skip if we're currently updating Windy (to avoid loops)
        if (!depState.syncWithWindy || !forecastRange || isLoadingWeather || depState.isUpdatingToWindy) return;

        // Clamp to forecast range
        const clampedTime = Math.max(forecastRange.start, Math.min(newTimestamp, forecastRange.end));

        // Only update if significantly different (avoid infinite loops)
        if (Math.abs(clampedTime - departureTime) > 5000) {
            departureTimeStore.setUpdatingFromWindy(true);
            departureTimeStore.setTime(clampedTime);
            handleReadWeather().finally(() => {
                departureTimeStore.setUpdatingFromWindy(false);
            });
        }
    }

    /**
     * Toggle sync between plugin departure time and Windy timeline
     */
    function toggleWindySync() {
        const currentSync = departureTimeStore.getState().syncWithWindy;
        departureTimeStore.setSyncWithWindy(!currentSync);

        if (!currentSync && forecastRange) {
            // Sync to current Windy timestamp when enabling
            const windyTimestamp = store.get('timestamp') as number;
            if (windyTimestamp) {
                setTimeout(() => {
                    handleWindyTimestampChange(windyTimestamp);
                }, 50);
            }
        }
        saveSession();
    }

    /**
     * Download VFR window search data as CSV (pivoted: one row per departure time)
     */
    function downloadVFRWindowCSV(csvData: VFRWindowCSVData) {
        // Helper to format timestamp in Eastern timezone (ISO-like format without comma)
        const formatEastern = (ts: number): string => {
            const d = new Date(ts);
            const options: Intl.DateTimeFormatOptions = {
                timeZone: 'America/New_York',
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                hour12: false,
            };
            const parts = new Intl.DateTimeFormat('en-US', options).formatToParts(d);
            const get = (type: string) => parts.find(p => p.type === type)?.value || '';
            // Format as YYYY-MM-DD HH:MM (no comma, easy to parse)
            return `${get('year')}-${get('month')}-${get('day')} ${get('hour')}:${get('minute')}`;
        };

        // Group rows by departure time
        const byDepartureTime = new Map<number, typeof csvData.rows>();
        for (const row of csvData.rows) {
            if (!byDepartureTime.has(row.departureTime)) {
                byDepartureTime.set(row.departureTime, []);
            }
            byDepartureTime.get(row.departureTime)!.push(row);
        }

        // Get unique waypoint names in order
        const firstGroup = byDepartureTime.values().next().value;
        if (!firstGroup || firstGroup.length === 0) return;
        const waypointNames = firstGroup.map((r: typeof csvData.rows[0]) => r.waypointName);

        // Build header: DepartureTime_ET, then for each waypoint: WP_Arrival_ET, WP_Wind, WP_Cbase_ft, WP_Condition, WP_Reasons
        const headers = ['DepartureTime_ET'];
        for (const wpName of waypointNames) {
            headers.push(
                `${wpName}_Arrival_ET`,
                `${wpName}_Wind_kt`,
                `${wpName}_WindDir`,
                `${wpName}_Gust_kt`,
                `${wpName}_Temp_C`,
                `${wpName}_Cbase_ft`,
                `${wpName}_Vis_m`,
                `${wpName}_Condition`,
                `${wpName}_Reasons`
            );
        }

        // Build rows
        const rows: string[] = [];
        for (const [depTime, waypointRows] of byDepartureTime) {
            const rowData: string[] = [formatEastern(depTime)];

            // Sort waypoints by index to ensure correct order
            waypointRows.sort((a, b) => a.waypointIndex - b.waypointIndex);

            for (const wp of waypointRows) {
                rowData.push(
                    formatEastern(wp.arrivalTime),
                    wp.windSpeed.toFixed(0),
                    wp.windDir.toFixed(0),
                    wp.windGust?.toFixed(0) ?? '',
                    wp.temperature.toFixed(1),
                    wp.cloudBaseFt?.toFixed(0) ?? '',
                    wp.visibility?.toFixed(0) ?? '',
                    wp.condition,
                    `"${wp.conditionReasons.replace(/"/g, '""')}"`
                );
            }
            rows.push(rowData.join(','));
        }

        // Add metadata as comments
        const metadata = [
            `# VFR Window Search - Generated: ${csvData.generatedAt}`,
            `# Search Range: ${csvData.searchRange.start} to ${csvData.searchRange.end}`,
            `# Minimum Condition: ${csvData.minimumCondition}`,
            `# Times shown in Eastern Time (America/New_York)`,
            '',
        ];

        const csvContent = [...metadata, headers.join(','), ...rows].join('\n');

        // Create and trigger download
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `vfr-window-search-${new Date().toISOString().slice(0, 19).replace(/[:-]/g, '')}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        if (settings.enableLogging) {
            logger.debug(`[Plugin] CSV exported with ${byDepartureTime.size} departure times, ${waypointNames.length} waypoints`);
        }
    }

    /**
     * Find VFR windows where conditions are acceptable along the entire route
     * Delegates to weatherController, but keeps CSV export logic here
     */
    async function handleFindVFRWindows() {
        if (!flightPlan || flightPlan.waypoints.length < 2) {
            vfrWindowStore.setError('Need at least 2 waypoints to search for VFR windows');
            return;
        }

        if (flightPlan.totals.ete <= 0) {
            vfrWindowStore.setError('Cannot search without valid flight time (ETE)');
            return;
        }

        vfrWindowStore.setSearching(true);
        vfrWindowStore.setProgress(0);
        vfrWindowStore.setError(null);
        vfrWindowStore.setWindows(null);

        try {
            // Use aircraft-aware thresholds for VFR window search
            const searchThresholds = getActiveThresholds(settings);
            const result = await findVFRWindows(
                flightPlan.waypoints,
                flightPlan.aircraft.defaultAltitude,
                flightPlan.totals.ete,
                {
                    minimumCondition: windowSearchMinCondition,
                    maxConcurrent: 4,
                    maxWindows: settings.maxVFRWindows,
                    startFrom: Date.now(),
                    collectDetailedData: settings.enableLogging,
                    includeNightFlights: settings.includeNightFlights,
                    routeCoordinates: { lat: flightPlan.waypoints[0].lat, lon: flightPlan.waypoints[0].lon },
                    thresholds: searchThresholds,
                },
                (progress) => {
                    vfrWindowStore.setProgress(progress);
                },
                settings.enableLogging
            );

            vfrWindowStore.setWindows(result.windows);

            if (result.windows.length === 0) {
                if (result.limitedBy) {
                    vfrWindowStore.setError(result.limitedBy);
                } else {
                    const conditionLabel = windowSearchMinCondition === 'good' ? 'good' : 'acceptable';
                    vfrWindowStore.setError(`No ${conditionLabel} VFR windows found in forecast period`);
                }
            }

            // Export CSV data if available and debug logging is enabled
            if (settings.enableLogging && result.csvData) {
                downloadVFRWindowCSV(result.csvData);
            }

            if (settings.enableLogging) {
                logger.debug('[Plugin] VFR window search complete:', result);
            }
        } catch (err) {
            logger.error('[Plugin] Error searching for VFR windows:', err);
            vfrWindowStore.setError(err instanceof Error ? err.message : 'Error searching for VFR windows');
        } finally {
            vfrWindowStore.setSearching(false);
        }
    }

    /**
     * Use a found VFR window by setting the departure time to its start
     */
    async function useVFRWindow(window: VFRWindow) {
        await controllerUseVFRWindow(window);
    }

    // Session persistence functions

    function saveSession() {
        try {
            // Get current state from stores
            const depState = departureTimeStore.getState();
            const wxState = weatherStore.getState();

            const sessionData = {
                flightPlan: flightPlan ? {
                    ...flightPlan,
                    departureTime: flightPlan.departureTime ? flightPlan.departureTime.getTime() : undefined,
                    waypoints: flightPlan.waypoints.map(wp => ({
                        ...wp,
                        eta: wp.eta ? wp.eta.getTime() : undefined,
                    })),
                } : null,
                settings,
                departureTime: depState.time,
                syncWithWindy: depState.syncWithWindy,
                adjustForecastForFlightTime: wxState.adjustForecastForFlightTime,
                activeTab,
                maxProfileAltitude,
                profileScale,
                version: '1.0',
            };

            sessionStorage.save(sessionData);
        } catch (err) {
            logger.warn('Failed to save session:', err);
        }
    }

    async function loadSession() {
        try {
            const sessionData = sessionStorage.load();
            if (!sessionData) return;

            const data = sessionData as any;

            // Restore settings to store
            if (data.settings) {
                settingsStore.loadSettings(data.settings);
            }

            // Restore departure time and sync setting to stores
            if (data.departureTime) {
                departureTimeStore.setTime(data.departureTime);
            }
            if (typeof data.syncWithWindy === 'boolean') {
                departureTimeStore.setSyncWithWindy(data.syncWithWindy);
            }
            if (typeof data.adjustForecastForFlightTime === 'boolean') {
                weatherStore.setAdjustForecastForFlightTime(data.adjustForecastForFlightTime);
            }
            if (data.activeTab) {
                activeTab = data.activeTab;
            }
            if (typeof data.maxProfileAltitude === 'number') {
                maxProfileAltitude = data.maxProfileAltitude;
            }
            if (typeof data.profileScale === 'number') {
                profileScale = data.profileScale;
            }

            // Restore flight plan
            if (data.flightPlan) {
                const restoredPlan: FlightPlan = {
                    ...data.flightPlan,
                    departureTime: data.flightPlan.departureTime
                        ? new Date(data.flightPlan.departureTime)
                        : undefined,
                    waypoints: data.flightPlan.waypoints.map((wp: any) => ({
                        ...wp,
                        eta: wp.eta ? new Date(wp.eta) : undefined,
                    })),
                };
                routeStore.setFlightPlan(restoredPlan);
                // Wait for reactive updates to propagate before updating map
                await tick();
                updateMapLayers();
                fitMapToRoute();
            }
        } catch (err) {
            logger.warn('Failed to load session:', err);
            sessionStorage.clear();
        }
    }

    // Note: Session is saved explicitly at key points (load file, add/delete waypoint, change settings, etc.)
    // This avoids excessive saves on every reactive update

    export const onopen = async (_params: unknown) => {
        // Load session when plugin opens
        await loadSession();
        if (flightPlan) {
            updateMapLayers();
            // Auto-fetch weather if route has waypoints
            if (flightPlan.waypoints.length > 0) {
                await handleReadWeather();
            }
        }
    };

    function handleKeyDown(e: KeyboardEvent) {
        if (e.key === 'Escape' && isEditMode) {
            toggleEditMode();
        }
    }

    // Window resize handler for mobile detection
    function handleWindowResize() {
        isMobile = isTouchDevice || window.innerWidth < 768;
    }

    onMount(() => {
        // Initialize weather controller with dependencies
        initWeatherController({
            pluginName: name,
            onMapUpdate: () => updateMapLayers(),
            onSaveSession: () => saveSession(),
        });

        // Initialize route controller with dependencies
        initRouteController({
            getAirportProvider: () => airportProvider,
            onMapUpdate: () => updateMapLayers(),
            onSaveSession: () => saveSession(),
            onResetWeather: () => resetWeatherState(),
        });

        // Initialize map controller with callbacks
        initMapController({
            onSegmentClick: (segmentIndex, lat, lon) => insertWaypointOnSegment(segmentIndex, lat, lon),
            onMarkerDrag: (waypointId, lat, lon) => handleWaypointDrag(waypointId, lat, lon),
            onMarkerClick: (waypointId) => routeStore.selectWaypoint(waypointId),
        });

        singleclick.on(name, handleMapClick);
        // Listen to Windy's timeline changes
        store.on('timestamp', handleWindyTimestampChange);
        // Listen for keyboard shortcuts
        window.addEventListener('keydown', handleKeyDown);
        // Listen for window resize to update mobile state
        window.addEventListener('resize', handleWindowResize);
    });

    onDestroy(() => {
        clearMapLayers();
        singleclick.off(name, handleMapClick);
        // Clean up Windy timestamp listener
        store.off('timestamp', handleWindyTimestampChange);
        // Clean up keyboard listener
        window.removeEventListener('keydown', handleKeyDown);
        // Clean up window resize listener
        window.removeEventListener('resize', handleWindowResize);
        // Restore rhpane display if it was hidden
        const pluginRhpane = document.querySelector('.plugin-rhpane') as HTMLElement;
        if (pluginRhpane) {
            pluginRhpane.style.display = '';
        }
    });
</script>

<style lang="less">
    /* Title row with help button */
    .plugin__title-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding-right: 8px;
    }

    .btn-help {
        width: 24px;
        height: 24px;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.1);
        border: 1px solid rgba(255, 255, 255, 0.3);
        color: rgba(255, 255, 255, 0.8);
        font-size: 14px;
        font-weight: bold;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.15s ease;

        &:hover {
            background: rgba(74, 144, 226, 0.3);
            border-color: rgba(74, 144, 226, 0.5);
            color: #fff;
        }
    }

    /* Scrollable content wrapper */
    .main-content-scroll {
        display: flex;
        flex-direction: column;
        flex: 1;
        overflow-y: auto;
        overflow-x: hidden;
        min-height: 0; /* Important for flex scroll */
        padding: 0 12px 12px 12px;
    }

    /* Waypoint permanent labels on map */
    :global(.waypoint-label) {
        background: rgba(30, 30, 46, 0.9) !important;
        border: 1px solid rgba(255, 255, 255, 0.3) !important;
        border-radius: 4px !important;
        padding: 2px 6px !important;
        font-size: 11px !important;
        color: #fff !important;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3) !important;
        white-space: nowrap !important;
    }

    :global(.waypoint-label::before) {
        border-top-color: rgba(30, 30, 46, 0.9) !important;
    }

    /* Setting toggle buttons */
    .setting-toggle {
        display: flex;
        gap: 4px;
    }

    .toggle-btn {
        flex: 1;
        padding: 8px 12px;
        background: rgba(255, 255, 255, 0.1);
        border: 1px solid rgba(255, 255, 255, 0.2);
        border-radius: 4px;
        color: rgba(255, 255, 255, 0.7);
        cursor: pointer;
        font-size: 12px;
        transition: all 0.15s ease;

        &:hover,
        &:active {
            background: rgba(255, 255, 255, 0.15);
        }

        &.active {
            background: #3498db;
            border-color: #3498db;
            color: white;
        }
    }

    .tabs {
        display: flex;
        padding: 0 10px;
        gap: 4px;
        margin-bottom: 10px;
    }

    .tab {
        flex: 1;
        padding: 8px 12px;
        min-height: 44px;
        background: rgba(255, 255, 255, 0.05);
        border: none;
        border-radius: 4px;
        color: rgba(255, 255, 255, 0.7);
        cursor: pointer;
        font-size: 13px;
        transition: all 0.15s ease;
        touch-action: manipulation;
        -webkit-tap-highlight-color: transparent;

        &:hover,
        &:active {
            background: rgba(255, 255, 255, 0.1);
        }

        &:focus {
            outline: 2px solid rgba(52, 152, 219, 0.5);
            outline-offset: 2px;
        }

        &:focus:not(:focus-visible) {
            outline: none;
        }

        &.active {
            background: #3498db;
            color: white;
        }

        &:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }
    }

    .profile-empty {
        padding: 20px;
        text-align: center;
        color: rgba(255, 255, 255, 0.7);
        font-size: 13px;

        p {
            margin: 0;
        }
    }

    .import-section {
        padding: 10px;
    }

    .drop-zone {
        border: 2px dashed rgba(255, 255, 255, 0.3);
        border-radius: 8px;
        padding: 20px;
        text-align: center;
        transition: all 0.2s ease;
        cursor: pointer;

        &.drag-over {
            border-color: #3498db;
            background: rgba(52, 152, 219, 0.1);
        }

        &:hover,
        &:active {
            border-color: rgba(255, 255, 255, 0.5);
        }

        &:focus {
            outline: 2px solid rgba(52, 152, 219, 0.5);
            outline-offset: 2px;
        }
    }

    .drop-zone-content {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 8px;
    }

    .drop-icon {
        font-size: 32px;
    }

    .drop-zone-buttons {
        display: flex;
        gap: 8px;
        margin-top: 8px;
    }

    .btn-browse {
        padding: 6px 16px;
        min-height: 44px;
        background: #3498db;
        border: none;
        border-radius: 4px;
        color: white;
        cursor: pointer;
        font-size: 13px;
        touch-action: manipulation;
        -webkit-tap-highlight-color: transparent;

        &:hover {
            background: #2980b9;
        }

        &:active {
            transform: scale(0.98);
        }

        &:focus {
            outline: 2px solid rgba(52, 152, 219, 0.5);
            outline-offset: 2px;
        }
    }

    .btn-new {
        padding: 6px 16px;
        min-height: 44px;
        background: #27ae60;
        border: none;
        border-radius: 4px;
        color: white;
        cursor: pointer;
        font-size: 13px;
        touch-action: manipulation;
        -webkit-tap-highlight-color: transparent;

        &:hover {
            background: #219a52;
        }

        &:active {
            transform: scale(0.98);
        }

        &:focus {
            outline: 2px solid rgba(39, 174, 96, 0.5);
            outline-offset: 2px;
        }
    }

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
        padding: 2px 6px;
        min-height: 44px;
        display: inline-flex;
        align-items: center;
        border-radius: 4px;
        transition: background 0.2s;
        touch-action: manipulation;
        -webkit-tap-highlight-color: transparent;

        &:hover,
        &:active {
            background: rgba(255, 255, 255, 0.1);
        }

        &:focus {
            outline: 2px solid rgba(52, 152, 219, 0.5);
            outline-offset: 2px;
        }
    }

    .plan-name-input {
        flex: 1;
        background: rgba(0, 0, 0, 0.3);
        border: 1px solid #3498db;
        border-radius: 4px;
        color: #3498db;
        font-size: 14px;
        font-weight: 500;
        padding: 4px 8px;
        outline: none;
        min-width: 0;
    }

    .btn-clear {
        padding: 4px 8px;
        min-height: 44px;
        background: rgba(255, 255, 255, 0.1);
        border: none;
        border-radius: 4px;
        color: rgba(255, 255, 255, 0.7);
        cursor: pointer;
        touch-action: manipulation;
        -webkit-tap-highlight-color: transparent;

        &:hover {
            background: rgba(231, 76, 60, 0.3);
            color: #e74c3c;
        }

        &:active {
            transform: scale(0.98);
        }

        &:focus {
            outline: 2px solid rgba(231, 76, 60, 0.5);
            outline-offset: 2px;
        }
    }

    .loading {
        color: #3498db;
    }

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

    .weather-options {
        display: flex;
        align-items: center;
        padding: 4px 0;
        font-size: 11px;

        .checkbox-label {
            display: flex;
            align-items: center;
            gap: 6px;
            cursor: pointer;
            color: rgba(255, 255, 255, 0.7);

            input[type="checkbox"] {
                margin: 0;
                cursor: pointer;
            }

            &:hover {
                color: rgba(255, 255, 255, 0.9);
            }
        }
    }

    .btn-action {
        flex: 1;
        padding: 6px 8px;
        min-height: 36px;
        background: rgba(255, 255, 255, 0.1);
        border: none;
        border-radius: 4px;
        color: rgba(255, 255, 255, 0.9);
        cursor: pointer;
        font-size: 12px;
        transition: all 0.15s ease;
        touch-action: manipulation;
        -webkit-tap-highlight-color: transparent;

        &:hover {
            background: rgba(255, 255, 255, 0.15);
        }

        &:active:not(:disabled) {
            transform: scale(0.98);
        }

        &:focus {
            outline: none;
        }

        &:focus-visible {
            outline: 2px solid rgba(255, 255, 255, 0.3);
            outline-offset: 2px;
        }

        &.active {
            background: #27ae60;
            color: white;
        }

        &:disabled {
            opacity: 0.6;
            cursor: not-allowed;
        }

        &.btn-weather.has-alerts {
            background: rgba(243, 156, 18, 0.3);
            border: 1px solid #f39c12;
        }

        &.btn-edit-active {
            background: #27ae60;
            color: white;
            box-shadow: 0 0 8px rgba(39, 174, 96, 0.5);
        }
    }

    /* Export Dropdown */
    .export-dropdown {
        position: relative;
        width: calc(33.33% - 4px); /* Same width as buttons in first row */

        > .btn-action {
            width: 100%;
            flex: none;
        }
    }

    .export-backdrop {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        z-index: 99;
    }

    .export-menu {
        position: absolute;
        top: 100%;
        left: 0;
        right: 0;
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
            padding: 10px 12px;
            background: transparent;
            border: none;
            color: rgba(255, 255, 255, 0.9);
            font-size: 13px;
            text-align: left;
            cursor: pointer;
            transition: background 0.15s ease;

            &:hover {
                background: rgba(255, 255, 255, 0.1);
            }

            &:not(:last-child) {
                border-bottom: 1px solid #444;
            }
        }
    }

    /* Airport Search Section */
    .search-section {
        margin: 10px;
    }

    .btn-search-toggle {
        width: 100%;
        padding: 10px 15px;
        min-height: 44px;
        background: rgba(52, 152, 219, 0.2);
        border: 1px solid rgba(52, 152, 219, 0.5);
        border-radius: 6px;
        color: rgba(255, 255, 255, 0.9);
        cursor: pointer;
        font-size: 13px;
        transition: all 0.15s ease;
        touch-action: manipulation;
        -webkit-tap-highlight-color: transparent;

        &:hover,
        &:active {
            background: rgba(52, 152, 219, 0.3);
        }

        &:focus {
            outline: 2px solid rgba(52, 152, 219, 0.5);
            outline-offset: 2px;
        }

        &:focus:not(:focus-visible) {
            outline: none;
        }

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
        padding: 8px 10px;
        background: rgba(0, 0, 0, 0.3);
        border: 1px solid rgba(255, 255, 255, 0.2);
        border-radius: 4px;
        color: white;
        font-size: 13px;

        &::placeholder {
            color: rgba(255, 255, 255, 0.5);
        }

        &:focus {
            outline: none;
            border-color: #3498db;
        }
    }

    .btn-search {
        padding: 8px 12px;
        background: rgba(52, 152, 219, 0.3);
        border: 1px solid #3498db;
        border-radius: 4px;
        color: white;
        cursor: pointer;
        font-size: 14px;

        &:hover:not(:disabled) {
            background: rgba(52, 152, 219, 0.5);
        }

        &:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }
    }

    .search-error {
        margin-top: 8px;
        padding: 6px 8px;
        background: rgba(231, 76, 60, 0.2);
        border-radius: 4px;
        color: #e74c3c;
        font-size: 11px;
    }

    .search-hint {
        margin-top: 8px;
        padding: 8px;
        background: rgba(52, 152, 219, 0.1);
        border-radius: 4px;
        color: rgba(255, 255, 255, 0.7);
        font-size: 11px;
        text-align: center;
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
        padding: 8px 10px;
        min-height: 44px;
        cursor: pointer;
        transition: background 0.15s;
        border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        touch-action: manipulation;
        -webkit-tap-highlight-color: transparent;

        &:hover,
        &:active {
            background: rgba(52, 152, 219, 0.2);
        }

        &:focus {
            outline: 2px solid rgba(52, 152, 219, 0.5);
            outline-offset: -2px;
        }

        &:last-child {
            border-bottom: none;
        }
    }

    .result-icon {
        font-size: 14px;
        flex-shrink: 0;
    }

    .result-id {
        font-weight: 600;
        color: #3498db;
        font-size: 12px;
        min-width: 45px;
    }

    .result-name {
        flex: 1;
        font-size: 11px;
        color: rgba(255, 255, 255, 0.8);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }

    .result-type {
        font-size: 10px;
        color: rgba(255, 255, 255, 0.5);
        flex-shrink: 0;
    }

    .btn-add-result {
        padding: 2px 8px;
        min-height: 44px;
        min-width: 44px;
        background: rgba(39, 174, 96, 0.3);
        border: 1px solid #27ae60;
        border-radius: 3px;
        color: white;
        cursor: pointer;
        font-size: 14px;
        font-weight: bold;
        touch-action: manipulation;
        -webkit-tap-highlight-color: transparent;

        &:hover,
        &:active {
            background: rgba(39, 174, 96, 0.5);
        }

        &:focus {
            outline: 2px solid rgba(39, 174, 96, 0.5);
            outline-offset: 2px;
        }
    }

    .api-key-input {
        font-family: monospace;
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

    .settings-section {
        padding: 10px;
    }

    .setting-group {
        margin-bottom: 16px;
    }

    .setting-label {
        display: block;
        font-size: 12px;
        color: rgba(255, 255, 255, 0.7);
        margin-bottom: 6px;
    }

    .setting-input {
        display: flex;
        align-items: center;
        gap: 8px;

        input[type="number"] {
            width: 100px;
            padding: 8px;
            background: rgba(255, 255, 255, 0.1);
            border: 1px solid rgba(255, 255, 255, 0.2);
            border-radius: 4px;
            color: white;
            font-size: 14px;

            &:focus {
                outline: none;
                border-color: #3498db;
            }
        }

        .unit {
            font-size: 12px;
            color: rgba(255, 255, 255, 0.5);
        }
    }

    .setting-checkbox {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 13px;
        color: rgba(255, 255, 255, 0.9);
        cursor: pointer;

        input[type="checkbox"] {
            width: 16px;
            height: 16px;
            cursor: pointer;
        }
    }

    .setting-description {
        margin-top: 6px;
        font-size: 11px;
        color: rgba(255, 255, 255, 0.5);
        line-height: 1.4;
    }

    .setting-info {
        margin-top: 20px;
        padding: 10px;
        background: rgba(52, 152, 219, 0.1);
        border-radius: 4px;
        font-size: 12px;
        color: rgba(255, 255, 255, 0.6);

        p {
            margin: 0;
        }
    }

    /* ===== Mobile-specific Styles ===== */
    :global(.plugin__content.mobile) {
        /* Larger touch targets for tabs */
        .tab {
            min-height: 48px;
            font-size: 15px;
        }

        /* Larger touch targets on mobile */
        .action-buttons {
            .btn-action {
                min-height: 44px;
                padding: 8px 10px;
            }
        }
    }
</style>
