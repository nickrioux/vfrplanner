<!-- Mobile header -->
<div class="plugin__mobile-header">
    {title}
</div>

<section
    class="plugin__content"
    class:mobile={isMobile}
>
    <!-- Panel mode title -->
    <div
        class="plugin__title plugin__title--chevron-back"
        on:click={() => bcast.emit('rqstOpen', 'menu')}
    >
        {title}
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

            <!-- Departure Time Slider -->
            {#if forecastRange}
                <div class="departure-section">
                    <div class="departure-header">
                        <span class="departure-label">🕐 Departure</span>
                        <span class="departure-time">{formatDepartureTime(departureTime)}</span>
                    </div>
                    <div class="timeline-slider">
                        <input
                            type="range"
                            min={forecastRange.start}
                            max={forecastRange.end}
                            step={3600000}
                            bind:value={departureTime}
                            on:change={handleDepartureTimeChange}
                            class="slider"
                        />
                        <div class="timeline-labels">
                            <span>{formatShortTime(forecastRange.start)}</span>
                            <span>{formatShortTime(forecastRange.end)}</span>
                        </div>
                    </div>
                    <div class="departure-footer">
                        {#if flightPlan && flightPlan.totals.ete > 0}
                            <span class="arrival-info">ETA: {formatDepartureTime(departureTime + flightPlan.totals.ete * 60000)}</span>
                        {/if}
                        <button
                            class="btn-sync"
                            class:active={syncWithWindy}
                            on:click={toggleWindySync}
                            title={syncWithWindy ? 'Synced with Windy timeline' : 'Click to sync with Windy timeline'}
                        >
                            🔗 {syncWithWindy ? 'Synced' : 'Sync'}
                        </button>
                    </div>

                    <!-- VFR Window Detection -->
                    <div class="vfr-window-section">
                        <div class="vfr-window-controls">
                            <select
                                class="condition-select"
                                bind:value={windowSearchMinCondition}
                                disabled={isSearchingWindows}
                            >
                                <option value="marginal">Marginal or better</option>
                                <option value="good">Good only</option>
                            </select>
                            <button
                                class="btn-find-windows"
                                on:click={handleFindVFRWindows}
                                disabled={isSearchingWindows || !flightPlan || flightPlan.waypoints.length < 2}
                            >
                                {#if isSearchingWindows}
                                    Searching... {Math.round(windowSearchProgress * 100)}%
                                {:else}
                                    🔍 Find VFR Windows
                                {/if}
                            </button>
                        </div>

                        {#if isSearchingWindows}
                            <div class="search-progress">
                                <div class="progress-bar">
                                    <div class="progress-fill" style="width: {windowSearchProgress * 100}%"></div>
                                </div>
                            </div>
                        {/if}

                        {#if windowSearchError}
                            <div class="window-error">{windowSearchError}</div>
                        {/if}

                        {#if vfrWindows && vfrWindows.length > 0}
                            <div class="vfr-windows-list">
                                {#each vfrWindows as window}
                                    {@const formatted = formatVFRWindow(window)}
                                    <div class="vfr-window-item" class:good={window.worstCondition === 'good'} class:marginal={window.worstCondition === 'marginal'}>
                                        <div class="window-info">
                                            <span class="window-date">{formatted.date}</span>
                                            <span class="window-time">{formatted.timeRange}</span>
                                            <span class="window-meta">
                                                <span class="window-duration">{formatted.duration}</span>
                                                <span class="window-confidence" class:high={window.confidence === 'high'} class:medium={window.confidence === 'medium'} class:low={window.confidence === 'low'}>
                                                    {window.confidence === 'high' ? '●' : window.confidence === 'medium' ? '◐' : '○'}
                                                </span>
                                            </span>
                                        </div>
                                        <button class="btn-use-window" on:click={() => useVFRWindow(window)}>Use</button>
                                    </div>
                                {/each}
                            </div>
                        {/if}
                    </div>
                </div>
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
            bind:settings
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
        <div class="about-section">
            <div class="about-header">
                <span class="about-icon">✈️</span>
                <h3>VFR Flight Planner</h3>
                <span class="about-version">v{config.version}</span>
            </div>

            <div class="about-description">
                <p><strong>Your pre-flight weather window assistant.</strong></p>
                <p>Designed by a pilot to automate the scan of ceilings, visibility, and winds across forecast models. Find your window, then verify your briefing.</p>
            </div>

            <div class="about-disclaimer">
                <h4>⚠️ Important Disclaimer</h4>
                <p>
                    <strong>This tool is for flight planning purposes only and should NOT be used as a source of official weather information.</strong>
                </p>
                <p>
                    Weather data displayed in this plugin is derived from meteorological models and may not reflect actual conditions. For official aviation weather information, always consult:
                </p>
                <ul>
                    <li><strong>United States:</strong> FAA-approved sources such as <a href="https://aviationweather.gov" target="_blank" rel="noopener">aviationweather.gov</a> (Aviation Weather Center)</li>
                    <li><strong>Canada:</strong> NAV CANADA official sources at <a href="https://flightplanning.navcanada.ca" target="_blank" rel="noopener">flightplanning.navcanada.ca</a></li>
                </ul>
                <p>
                    Pilots are responsible for obtaining proper weather briefings from official sources before any flight. This plugin does not provide METARs, TAFs, NOTAMs, PIREPs, AIRMETs, SIGMETs, or other official aviation weather products.
                </p>
            </div>

            <div class="about-credits">
                <h4>Data Sources</h4>
                <ul>
                    <li>Weather data: <a href="https://windy.com" target="_blank" rel="noopener">Windy.com</a></li>
                    <li>Airport data: <a href="https://ourairports.com" target="_blank" rel="noopener">OurAirports</a> (offline) / <a href="https://airportdb.io" target="_blank" rel="noopener">AirportDB.io</a> (API)</li>
                    <li>Elevation data: <a href="https://open-meteo.com" target="_blank" rel="noopener">Open-Meteo</a></li>
                </ul>
            </div>

            <div class="about-support">
                <h4>⛽ Support This Project</h4>
                <p>If you find this plugin useful, consider buying me a gallon of 100LL!</p>
                <a href="https://buymeacoffee.com/wingguideai" target="_blank" rel="noopener" class="coffee-link">
                    Buy me a gallon of 100LL
                </a>
            </div>
        </div>
    {/if}

    </div><!-- /main-content-scroll -->

    <!-- Conditions Modal -->
    <ConditionsModal
        visible={showConditionsModal}
        thresholds={settings.customThresholds}
        on:save={handleConditionsSave}
        on:cancel={handleConditionsCancel}
    />
</section>

<script lang="ts">
    import bcast from '@windy/broadcast';
    import { map } from '@windy/map';
    import { singleclick } from '@windy/singleclick';
    import store from '@windy/store';
    import { onDestroy, onMount, tick } from 'svelte';

    import config from './pluginConfig';
    import { readFPLFile, convertToFlightPlan, validateFPL } from './parsers/fplParser';
    import { readGPXFile } from './parsers/gpxParser';
    import { calculateFlightPlanNavigation, formatDistance, formatBearing, formatEte, calculateGroundSpeed, formatHeadwind, calculateHeadwindComponent } from './services/navigationCalc';
    import { downloadGPX } from './exporters/gpxExporter';
    import { downloadFPL } from './exporters/fplExporter';
    import {
        fetchFlightPlanWeather,
        checkWeatherAlerts,
        formatWind,
        formatTemperature,
        getForecastTimeRange,
        getCbaseTable,
        DEFAULT_ALERT_THRESHOLDS,
        type WaypointWeather,
        type WeatherAlert,
        type ForecastTimeRange,
    } from './services/weatherService';
    import { calculateProfileData, type SegmentCondition, type BestRunwayResult } from './services/profileService';
    import { getSegmentColor, getWaypointIcon, getMarkerColor, getBestRunway } from './utils/displayUtils';
    import { logger } from './services/logger';
    import { findVFRWindows, formatVFRWindow, type VFRWindow, type VFRWindowSearchResult } from './services/vfrWindowService';
    import type { MinimumConditionLevel, VFRWindowCSVData } from './types/vfrWindow';
    import { fetchRouteElevationProfile, fetchPointElevation, type ElevationPoint } from './services/elevationService';
    import {
        searchAirport,
        getAirportByICAO,
        airportToWaypoint,
        navaidToWaypoint,
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
    import { getThresholdsForPreset, type VfrConditionThresholds, type ConditionPreset } from './types/conditionThresholds';
    import AltitudeProfile from './components/AltitudeProfile.svelte';
    import SettingsPanel from './components/SettingsPanel.svelte';
    import ConditionsModal from './components/ConditionsModal.svelte';
    import WaypointTable from './components/WaypointTable.svelte';
    import { createSessionStorage } from './services/sessionStorage';

    import type { LatLon } from '@windy/interfaces';

    const { name, title } = config;

    // Session storage instance
    const sessionStorage = createSessionStorage(name);

    // State
    let flightPlan: FlightPlan | null = null;
    let selectedWaypointId: string | null = null;
    let editingWaypointId: string | null = null;
    let editingWaypointAltitudeId: string | null = null;
    let editingPlanName: boolean = false;
    let isLoading = false;
    let isDragOver = false;
    let error: string | null = null;
    let fileInput: HTMLInputElement;
    let activeTab: 'route' | 'profile' | 'settings' = 'route';

    // Conditions modal state
    let showConditionsModal = false;

    // AirportDB search state
    let searchQuery = '';
    let searchResults: { airports: AirportDBResult[]; navaids: AirportDBNavaid[] } = { airports: [], navaids: [] };
    let isSearching = false;
    let searchError: string | null = null;
    let showSearchPanel = false;
    let showExportMenu = false;

    // Edit mode state (transient, not persisted)
    // When true: markers are draggable, map clicks add waypoints, segment clicks insert waypoints
    let isEditMode = false;

    // Weather state
    let weatherData: Map<string, WaypointWeather> = new Map();
    let weatherAlerts: Map<string, WeatherAlert[]> = new Map();
    let isLoadingWeather = false;
    let weatherError: string | null = null;

    // Elevation profile state
    let elevationProfile: ElevationPoint[] = [];

    // Departure time state
    let departureTime: number = Date.now();
    let forecastRange: ForecastTimeRange | null = null;
    let syncWithWindy: boolean = true;
    let isUpdatingFromWindy: boolean = false;
    let isUpdatingToWindy: boolean = false;

    // VFR Window detection state
    let isSearchingWindows = false;
    let windowSearchProgress = 0;
    let windowSearchMinCondition: MinimumConditionLevel = 'marginal';
    let vfrWindows: VFRWindow[] | null = null;
    let windowSearchError: string | null = null;

    // Mobile detection state
    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    let isMobile = isTouchDevice || window.innerWidth < 768;

    /**
     * Reset route panel state when flight plan changes
     * Clears weather data, VFR windows, and related state
     */
    function resetRoutePanel() {
        // Clear weather state
        weatherData = new Map();
        weatherAlerts = new Map();
        weatherError = null;
        forecastRange = null;

        // Clear VFR window state
        vfrWindows = null;
        windowSearchError = null;
        windowSearchProgress = 0;
        isSearchingWindows = false;

        // Reset departure time to now
        departureTime = Date.now();

        logger.debug('Route panel state reset');
    }

    // Settings
    let settings: PluginSettings = { ...DEFAULT_SETTINGS };

    // Airport provider - automatically uses fallback when no API key
    let airportProvider: IAirportProvider = createAirportProvider(settings.airportdbApiKey);

    // Sync logger state with settings
    $: logger.setEnabled(settings.enableLogging);

    // Update airport provider when API key changes
    $: airportProvider = createAirportProvider(settings.airportdbApiKey);

    // Profile state
    let maxProfileAltitude: number = 15000;
    let profileScale: number = 511;

    // Map layers
    let routeLayer: L.LayerGroup | null = null;
    let waypointMarkers: L.LayerGroup | null = null;
    let markerMap: Map<string, L.Marker> = new Map();

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
            let plan: FlightPlan;

            // Detect file type by extension
            const isGPX = file.name.toLowerCase().endsWith('.gpx');

            if (isGPX) {
                // Parse GPX file
                const gpxResult = await readGPXFile(file);

                if (!gpxResult.success || !gpxResult.flightPlan) {
                    error = gpxResult.error || 'Failed to parse GPX file';
                    isLoading = false;
                    return;
                }

                plan = gpxResult.flightPlan;
            } else {
                // Parse FPL file
                const fplResult = await readFPLFile(file);

                if (!fplResult.success || !fplResult.flightPlan) {
                    error = fplResult.error || 'Failed to parse file';
                    isLoading = false;
                    return;
                }

                const validation = validateFPL(fplResult.flightPlan);
                if (!validation.valid) {
                    error = validation.errors.map(e => e.message).join(', ');
                    isLoading = false;
                    return;
                }

                // Convert to internal format
                plan = convertToFlightPlan(fplResult.flightPlan, file.name);
            }

            // Apply settings
            plan.aircraft.airspeed = settings.defaultAirspeed;
            plan.aircraft.defaultAltitude = settings.defaultAltitude;

            // Auto-set terrain elevation for departure/arrival if enabled
            if (settings.autoTerrainElevation && plan.waypoints.length >= 1) {
                // Fetch departure elevation
                const departureWp = plan.waypoints[0];
                const departureElevation = await fetchPointElevation(departureWp.lat, departureWp.lon, settings.enableLogging);
                if (departureElevation !== undefined) {
                    plan.waypoints[0] = { ...departureWp, altitude: departureElevation };
                    if (settings.enableLogging) {
                        logger.debug(`[Plugin] Set departure ${departureWp.name} elevation to ${departureElevation}ft`);
                    }
                }

                // Fetch arrival elevation (if different from departure)
                if (plan.waypoints.length >= 2) {
                    const arrivalWp = plan.waypoints[plan.waypoints.length - 1];
                    const arrivalElevation = await fetchPointElevation(arrivalWp.lat, arrivalWp.lon, settings.enableLogging);
                    if (arrivalElevation !== undefined) {
                        plan.waypoints[plan.waypoints.length - 1] = { ...arrivalWp, altitude: arrivalElevation };
                        if (settings.enableLogging) {
                            logger.debug(`[Plugin] Set arrival ${arrivalWp.name} elevation to ${arrivalElevation}ft`);
                        }
                    }
                }
            }

            // Fetch runway data for departure/arrival airports (uses provider - API or fallback)
            if (settings.enableLogging) {
                logger.debug(`[Plugin] Provider: ${airportProvider.getSourceName()}, waypoints: ${plan.waypoints.length}`);
            }
            if (plan.waypoints.length >= 1) {
                // Fetch departure runway data
                const departureWp = plan.waypoints[0];
                if (settings.enableLogging) {
                    logger.debug(`[Plugin] Departure: ${departureWp.name}, type: ${departureWp.type}, hasRunways: ${!!departureWp.runways}`);
                }
                if (departureWp.type === 'AIRPORT' && !departureWp.runways) {
                    try {
                        if (settings.enableLogging) {
                            logger.debug(`[Plugin] Fetching runway data for ${departureWp.name}...`);
                        }
                        const airportData = await airportProvider.searchByIcao(departureWp.name);
                        if (settings.enableLogging) {
                            logger.debug(`[Plugin] Provider response for ${departureWp.name}:`, airportData ? `${airportData.runways?.length ?? 0} runways (source: ${airportData.source})` : 'NULL');
                        }
                        if (airportData?.runways && airportData.runways.length > 0) {
                            // Provider already returns runways in the correct format
                            plan.waypoints[0] = { ...plan.waypoints[0], runways: airportData.runways };
                            if (settings.enableLogging) {
                                logger.debug(`[Plugin] Loaded ${airportData.runways.length} runways for departure ${departureWp.name}`);
                            }
                        }
                    } catch (err) {
                        if (settings.enableLogging) {
                            logger.warn(`[Plugin] Could not fetch runway data for ${departureWp.name}:`, err);
                        }
                    }
                }

                // Fetch arrival runway data (if different from departure)
                if (plan.waypoints.length >= 2) {
                    const arrivalWp = plan.waypoints[plan.waypoints.length - 1];
                    if (settings.enableLogging) {
                        logger.debug(`[Plugin] Arrival: ${arrivalWp.name}, type: ${arrivalWp.type}, hasRunways: ${!!arrivalWp.runways}`);
                    }
                    if (arrivalWp.type === 'AIRPORT' && !arrivalWp.runways && arrivalWp.name !== plan.waypoints[0].name) {
                        try {
                            if (settings.enableLogging) {
                                logger.debug(`[Plugin] Fetching runway data for ${arrivalWp.name}...`);
                            }
                            const airportData = await airportProvider.searchByIcao(arrivalWp.name);
                            if (settings.enableLogging) {
                                logger.debug(`[Plugin] Provider response for ${arrivalWp.name}:`, airportData ? `${airportData.runways?.length ?? 0} runways (source: ${airportData.source})` : 'NULL');
                            }
                            if (airportData?.runways && airportData.runways.length > 0) {
                                // Provider already returns runways in the correct format
                                plan.waypoints[plan.waypoints.length - 1] = { ...plan.waypoints[plan.waypoints.length - 1], runways: airportData.runways };
                                if (settings.enableLogging) {
                                    logger.debug(`[Plugin] Loaded ${airportData.runways.length} runways for arrival ${arrivalWp.name}`);
                                }
                            }
                        } catch (err) {
                            if (settings.enableLogging) {
                                logger.warn(`[Plugin] Could not fetch runway data for ${arrivalWp.name}:`, err);
                            }
                        }
                    }
                }
            }

            // Calculate navigation data
            const navResult = calculateFlightPlanNavigation(plan.waypoints, plan.aircraft.airspeed);
            plan = {
                ...plan,
                waypoints: navResult.waypoints,
                totals: navResult.totals,
            };

            // Reset route panel state before loading new plan
            resetRoutePanel();

            flightPlan = plan;
            updateMapLayers();
            fitMapToRoute();
            saveSession();
        } catch (err) {
            error = err instanceof Error ? err.message : 'Unknown error';
        } finally {
            isLoading = false;
        }
    }

    function clearFlightPlan() {
        flightPlan = null;
        selectedWaypointId = null;
        error = null;
        isEditMode = false;
        activeTab = 'route';
        resetRoutePanel();
        clearMapLayers();
        saveSession();
    }

    function createNewFlightPlan() {
        // Generate a name based on current date/time
        const now = new Date();
        const dateStr = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });

        flightPlan = {
            id: `plan-${Date.now()}`,
            name: `New Plan - ${dateStr} ${timeStr}`,
            waypoints: [],
            aircraft: {
                airspeed: settings.defaultAirspeed,
                defaultAltitude: settings.defaultAltitude,
            },
            totals: {
                distance: 0,
                ete: 0,
            },
            sourceFormat: 'manual',
        };

        // Clear any previous state
        selectedWaypointId = null;
        error = null;
        resetRoutePanel();

        // Enable edit mode immediately for new plans
        isEditMode = true;

        // Update map
        updateMapLayers();
        saveSession();
    }

    function selectWaypoint(wp: Waypoint) {
        selectedWaypointId = wp.id;
        map.panTo([wp.lat, wp.lon]);
    }

    function selectWaypointById(waypointId: string) {
        if (!flightPlan) return;
        const wp = flightPlan.waypoints.find(w => w.id === waypointId);
        if (wp) {
            selectWaypoint(wp);
            // Switch to route tab to show the selected waypoint
            activeTab = 'route';
        }
    }

    async function insertWaypointOnSegment(segmentIndex: number, lat: number, lon: number) {
        if (!flightPlan) return;

        // Create a new waypoint at the clicked position with default altitude
        const newWaypoint: Waypoint = {
            id: `wp_${Date.now()}`,
            name: `WP${flightPlan.waypoints.length + 1}`,
            type: 'user',
            lat,
            lon,
            altitude: flightPlan.aircraft.defaultAltitude,
        };

        // Insert the waypoint after the segment's starting waypoint
        const newWaypoints = [
            ...flightPlan.waypoints.slice(0, segmentIndex + 1),
            newWaypoint,
            ...flightPlan.waypoints.slice(segmentIndex + 1)
        ];

        // Recalculate navigation
        const navResult = calculateFlightPlanNavigation(newWaypoints, flightPlan.aircraft.airspeed);

        flightPlan = {
            ...flightPlan,
            waypoints: navResult.waypoints,
            totals: navResult.totals,
        };

        // Wait for Svelte's reactivity to complete
        await tick();

        if (settings.enableLogging) {
            logger.debug('[Plugin] Inserted waypoint:', newWaypoint.name, 'at', segmentIndex + 1, 'Total waypoints:', flightPlan.waypoints.length);
        }

        // Use requestAnimationFrame to ensure map updates after browser paint
        if (settings.enableLogging) {
            logger.debug('[Plugin] Scheduling updateMapLayers via requestAnimationFrame');
        }
        requestAnimationFrame(() => {
            if (settings.enableLogging) {
                logger.debug('[Plugin] requestAnimationFrame callback executing');
            }
            updateMapLayers();
        });

        saveSession();

        // Select the newly inserted waypoint
        selectedWaypointId = newWaypoint.id;
    }

    async function moveWaypointUp(waypointId: string) {
        if (!flightPlan) return;

        const index = flightPlan.waypoints.findIndex(wp => wp.id === waypointId);
        if (index <= 0) return; // Already at top or not found

        const newWaypoints = [...flightPlan.waypoints];
        const temp = newWaypoints[index - 1];
        newWaypoints[index - 1] = newWaypoints[index];
        newWaypoints[index] = temp;

        // Recalculate navigation
        const navResult = calculateFlightPlanNavigation(newWaypoints, flightPlan.aircraft.airspeed);

        flightPlan = {
            ...flightPlan,
            waypoints: navResult.waypoints,
            totals: navResult.totals,
        };

        // Wait for Svelte's reactivity to complete
        await tick();

        if (settings.enableLogging) {
            logger.debug('[Plugin] Moved waypoint up:', newWaypoints[index - 1].name);
        }

        // Use requestAnimationFrame to ensure map updates after browser paint
        if (settings.enableLogging) {
            logger.debug('[Plugin] Scheduling updateMapLayers via requestAnimationFrame');
        }
        requestAnimationFrame(() => {
            if (settings.enableLogging) {
                logger.debug('[Plugin] requestAnimationFrame callback executing');
            }
            updateMapLayers();
        });

        saveSession();
    }

    async function moveWaypointDown(waypointId: string) {
        if (!flightPlan) return;

        const index = flightPlan.waypoints.findIndex(wp => wp.id === waypointId);
        if (index < 0 || index >= flightPlan.waypoints.length - 1) return; // Already at bottom or not found

        const newWaypoints = [...flightPlan.waypoints];
        const temp = newWaypoints[index];
        newWaypoints[index] = newWaypoints[index + 1];
        newWaypoints[index + 1] = temp;

        // Recalculate navigation
        const navResult = calculateFlightPlanNavigation(newWaypoints, flightPlan.aircraft.airspeed);

        flightPlan = {
            ...flightPlan,
            waypoints: navResult.waypoints,
            totals: navResult.totals,
        };

        // Wait for Svelte's reactivity to complete
        await tick();

        if (settings.enableLogging) {
            logger.debug('[Plugin] Moved waypoint down:', newWaypoints[index + 1].name);
        }

        // Use requestAnimationFrame to ensure map updates after browser paint
        if (settings.enableLogging) {
            logger.debug('[Plugin] Scheduling updateMapLayers via requestAnimationFrame');
        }
        requestAnimationFrame(() => {
            if (settings.enableLogging) {
                logger.debug('[Plugin] requestAnimationFrame callback executing');
            }
            updateMapLayers();
        });

        saveSession();
    }

    function startEditWaypointName(waypointId: string) {
        editingWaypointId = waypointId;
    }

    function finishEditWaypointName(waypointId: string, newName: string) {
        if (!flightPlan) return;

        const trimmedName = newName.trim();
        if (trimmedName === '') {
            editingWaypointId = null;
            return;
        }

        flightPlan = {
            ...flightPlan,
            waypoints: flightPlan.waypoints.map(wp =>
                wp.id === waypointId ? { ...wp, name: trimmedName } : wp
            ),
        };

        editingWaypointId = null;
        updateMapLayers();
        saveSession();
    }

    function startEditPlanName() {
        editingPlanName = true;
    }

    function finishEditPlanName(newName: string) {
        if (!flightPlan) return;

        const trimmedName = newName.trim();
        if (trimmedName === '') {
            editingPlanName = false;
            return;
        }

        flightPlan = {
            ...flightPlan,
            name: trimmedName,
        };

        editingPlanName = false;
        saveSession();
    }

    function startEditWaypointAltitude(waypointId: string) {
        editingWaypointAltitudeId = waypointId;
    }

    function finishEditWaypointAltitude(waypointId: string, newAltitude: string) {
        if (!flightPlan) return;

        const altitude = parseInt(newAltitude, 10);
        if (isNaN(altitude) || altitude < 0) {
            editingWaypointAltitudeId = null;
            return;
        }

        flightPlan = {
            ...flightPlan,
            waypoints: flightPlan.waypoints.map(wp =>
                wp.id === waypointId ? { ...wp, altitude } : wp
            ),
        };

        editingWaypointAltitudeId = null;
        updateMapLayers();
        saveSession();
    }

    function getWaypointAltitude(wp: Waypoint): number {
        return wp.altitude ?? flightPlan?.aircraft.defaultAltitude ?? settings.defaultAltitude;
    }

    async function deleteWaypoint(waypointId: string) {
        if (!flightPlan) return;

        const deletedIndex = flightPlan.waypoints.findIndex(wp => wp.id === waypointId);
        const wasDeparture = deletedIndex === 0;
        const wasArrival = deletedIndex === flightPlan.waypoints.length - 1;

        const newWaypoints = flightPlan.waypoints.filter(wp => wp.id !== waypointId);

        if (newWaypoints.length === 0) {
            clearFlightPlan();
            return;
        }

        // Update altitudes for new departure/arrival if autoTerrainElevation is enabled
        if (settings.autoTerrainElevation && newWaypoints.length > 0) {
            // If we deleted the departure, the new first waypoint becomes departure
            if (wasDeparture && newWaypoints.length > 0) {
                const newDeparture = newWaypoints[0];
                const terrainElevation = await fetchPointElevation(newDeparture.lat, newDeparture.lon, settings.enableLogging);
                if (terrainElevation !== undefined) {
                    newWaypoints[0] = { ...newDeparture, altitude: terrainElevation };
                    if (settings.enableLogging) {
                        logger.debug(`[Plugin] New departure ${newDeparture.name}: ${terrainElevation} ft`);
                    }
                }
            }

            // If we deleted the arrival, the new last waypoint becomes arrival
            if (wasArrival && newWaypoints.length > 0) {
                const newArrivalIndex = newWaypoints.length - 1;
                const newArrival = newWaypoints[newArrivalIndex];
                const terrainElevation = await fetchPointElevation(newArrival.lat, newArrival.lon, settings.enableLogging);
                if (terrainElevation !== undefined) {
                    newWaypoints[newArrivalIndex] = { ...newArrival, altitude: terrainElevation };
                    if (settings.enableLogging) {
                        logger.debug(`[Plugin] New arrival ${newArrival.name}: ${terrainElevation} ft`);
                    }
                }
            }
        }

        // Recalculate navigation
        const navResult = calculateFlightPlanNavigation(newWaypoints, settings.defaultAirspeed);

        flightPlan = {
            ...flightPlan,
            waypoints: navResult.waypoints,
            totals: navResult.totals,
        };

        if (selectedWaypointId === waypointId) {
            selectedWaypointId = null;
        }

        updateMapLayers();
        saveSession();
    }

    function handleWaypointDrag(waypointId: string, newLat: number, newLon: number) {
        if (!flightPlan || !isEditMode) return;

        const newWaypoints = flightPlan.waypoints.map(wp => {
            if (wp.id === waypointId) {
                return { ...wp, lat: newLat, lon: newLon };
            }
            return wp;
        });

        // Recalculate navigation
        const navResult = calculateFlightPlanNavigation(newWaypoints, settings.defaultAirspeed);

        flightPlan = {
            ...flightPlan,
            waypoints: navResult.waypoints,
            totals: navResult.totals,
        };

        updateMapLayers();
        saveSession();
    }

    function toggleEditMode() {
        isEditMode = !isEditMode;

        // Reset cursor when exiting edit mode
        if (!isEditMode) {
            map.getContainer().style.cursor = '';
        }

        updateMapLayers();
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
        if (!flightPlan) {
            // Create new flight plan if none exists
            createNewFlightPlan();
        }
        if (!flightPlan) return;

        const waypoint = airportToWaypoint(airport);

        // Check if already in flight plan
        if (flightPlan.waypoints.some(wp => wp.name === waypoint.name)) {
            searchError = `${waypoint.name} is already in the flight plan`;
            return;
        }

        const isFirstWaypoint = flightPlan.waypoints.length === 0;
        // New waypoint will be added at the end, so it becomes the new arrival

        // Build new waypoints array with proper altitudes
        let updatedWaypoints = [...flightPlan.waypoints];

        if (settings.autoTerrainElevation) {
            // Departure or arrival: use terrain elevation (from airport or fetched)
            if (!waypoint.altitude || waypoint.altitude === 0) {
                const terrainElevation = await fetchPointElevation(waypoint.lat, waypoint.lon, settings.enableLogging);
                if (terrainElevation !== undefined) {
                    waypoint.altitude = terrainElevation;
                    waypoint.elevation = terrainElevation;
                }
            }
            if (settings.enableLogging) {
                logger.debug(`[Plugin] ${isFirstWaypoint ? 'Departure' : 'Arrival'} ${waypoint.name}: ${waypoint.altitude} ft`);
            }

            // If there was a previous arrival (now becomes middle waypoint), set it to cruising altitude
            if (updatedWaypoints.length > 1) {
                const previousArrivalIndex = updatedWaypoints.length - 1;
                const previousArrival = updatedWaypoints[previousArrivalIndex];
                // Only change if it had terrain elevation (not manually set high altitude)
                if (previousArrival.altitude !== undefined && previousArrival.altitude < settings.defaultAltitude) {
                    updatedWaypoints = updatedWaypoints.map((wp, idx) =>
                        idx === previousArrivalIndex
                            ? { ...wp, altitude: settings.defaultAltitude }
                            : wp
                    );
                    if (settings.enableLogging) {
                        logger.debug(`[Plugin] Previous arrival ${previousArrival.name} now middle waypoint: ${settings.defaultAltitude} ft`);
                    }
                }
            }
        }

        // Add new waypoint
        updatedWaypoints = [...updatedWaypoints, waypoint];

        const navResult = calculateFlightPlanNavigation(updatedWaypoints, settings.defaultAirspeed);

        flightPlan = {
            ...flightPlan,
            waypoints: navResult.waypoints,
            totals: navResult.totals,
        };

        updateMapLayers();
        saveSession();

        // Clear search after adding
        searchQuery = '';
        searchResults = { airports: [], navaids: [] };
        searchError = null;
    }

    async function addNavaidToFlightPlan(navaid: AirportDBNavaid) {
        if (!flightPlan) {
            createNewFlightPlan();
        }
        if (!flightPlan) return;

        const waypoint = navaidToWaypoint(navaid);

        // Check if already in flight plan
        if (flightPlan.waypoints.some(wp => wp.name === waypoint.name)) {
            searchError = `${waypoint.name} is already in the flight plan`;
            return;
        }

        const isFirstWaypoint = flightPlan.waypoints.length === 0;
        // New waypoint will be added at the end, so it becomes the new arrival

        // Build new waypoints array with proper altitudes
        let updatedWaypoints = [...flightPlan.waypoints];

        if (settings.autoTerrainElevation) {
            // Departure or arrival: use terrain elevation (from navaid or fetched)
            if (!waypoint.altitude || waypoint.altitude === 0) {
                const terrainElevation = await fetchPointElevation(waypoint.lat, waypoint.lon, settings.enableLogging);
                if (terrainElevation !== undefined) {
                    waypoint.altitude = terrainElevation;
                    waypoint.elevation = terrainElevation;
                }
            }
            if (settings.enableLogging) {
                logger.debug(`[Plugin] ${isFirstWaypoint ? 'Departure' : 'Arrival'} ${waypoint.name}: ${waypoint.altitude} ft`);
            }

            // If there was a previous arrival (now becomes middle waypoint), set it to cruising altitude
            if (updatedWaypoints.length > 1) {
                const previousArrivalIndex = updatedWaypoints.length - 1;
                const previousArrival = updatedWaypoints[previousArrivalIndex];
                // Only change if it had terrain elevation (not manually set high altitude)
                if (previousArrival.altitude !== undefined && previousArrival.altitude < settings.defaultAltitude) {
                    updatedWaypoints = updatedWaypoints.map((wp, idx) =>
                        idx === previousArrivalIndex
                            ? { ...wp, altitude: settings.defaultAltitude }
                            : wp
                    );
                    if (settings.enableLogging) {
                        logger.debug(`[Plugin] Previous arrival ${previousArrival.name} now middle waypoint: ${settings.defaultAltitude} ft`);
                    }
                }
            }
        }

        // Add new waypoint
        updatedWaypoints = [...updatedWaypoints, waypoint];

        const navResult = calculateFlightPlanNavigation(updatedWaypoints, settings.defaultAirspeed);

        flightPlan = {
            ...flightPlan,
            waypoints: navResult.waypoints,
            totals: navResult.totals,
        };

        updateMapLayers();
        saveSession();

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

        const { lat, lon } = latLon;
        const isFirstWaypoint = flightPlan.waypoints.length === 0;

        // Build new waypoints array with proper altitudes
        let updatedWaypoints = [...flightPlan.waypoints];

        // Fetch terrain elevation for departure or arrival waypoints (if setting enabled)
        let altitude: number | undefined;
        if (settings.autoTerrainElevation) {
            // Departure or arrival: use terrain elevation
            altitude = await fetchPointElevation(lat, lon, settings.enableLogging);
            if (settings.enableLogging) {
                logger.debug(`[Plugin] ${isFirstWaypoint ? 'Departure' : 'Arrival'} waypoint terrain elevation: ${altitude ?? 'N/A'} ft`);
            }

            // If there was a previous arrival (now becomes middle waypoint), set it to cruising altitude
            if (updatedWaypoints.length > 1) {
                const previousArrivalIndex = updatedWaypoints.length - 1;
                const previousArrival = updatedWaypoints[previousArrivalIndex];
                // Only change if it had terrain elevation (not manually set high altitude)
                if (previousArrival.altitude !== undefined && previousArrival.altitude < settings.defaultAltitude) {
                    updatedWaypoints = updatedWaypoints.map((wp, idx) =>
                        idx === previousArrivalIndex
                            ? { ...wp, altitude: settings.defaultAltitude }
                            : wp
                    );
                    if (settings.enableLogging) {
                        logger.debug(`[Plugin] Previous arrival ${previousArrival.name} now middle waypoint: ${settings.defaultAltitude} ft`);
                    }
                }
            }
        }

        // Create new waypoint with terrain elevation for departure/arrival
        const newWaypoint: Waypoint = {
            id: `wp-${Date.now()}`,
            name: `WPT${flightPlan.waypoints.length + 1}`,
            type: 'USER WAYPOINT',
            lat,
            lon,
            altitude: altitude, // terrain elevation for departure/arrival
        };

        // Add new waypoint
        updatedWaypoints = [...updatedWaypoints, newWaypoint];

        // Recalculate navigation
        const navResult = calculateFlightPlanNavigation(updatedWaypoints, settings.defaultAirspeed);

        flightPlan = {
            ...flightPlan,
            waypoints: navResult.waypoints,
            totals: navResult.totals,
        };

        // Stay in edit mode after adding waypoint
        updateMapLayers();
        saveSession();
    }

    function handleSettingsChange() {
        if (!flightPlan) return;

        // Track old default altitude to update enroute waypoints
        const oldDefaultAltitude = flightPlan.aircraft.defaultAltitude;
        const newDefaultAltitude = settings.defaultAltitude;

        // Update aircraft settings
        flightPlan.aircraft.airspeed = settings.defaultAirspeed;
        flightPlan.aircraft.defaultAltitude = newDefaultAltitude;

        // Update enroute waypoints that were using the old default altitude
        // Enroute = not first (departure) or last (arrival) waypoint
        let updatedWaypoints = flightPlan.waypoints;
        if (oldDefaultAltitude !== newDefaultAltitude && flightPlan.waypoints.length > 2) {
            updatedWaypoints = flightPlan.waypoints.map((wp, index) => {
                const isEnroute = index > 0 && index < flightPlan.waypoints.length - 1;
                // Update enroute waypoints that have the old default altitude
                if (isEnroute && wp.altitude === oldDefaultAltitude) {
                    return { ...wp, altitude: newDefaultAltitude };
                }
                return wp;
            });
        }

        // Recalculate navigation with new airspeed
        const navResult = calculateFlightPlanNavigation(updatedWaypoints, settings.defaultAirspeed);

        flightPlan = {
            ...flightPlan,
            waypoints: navResult.waypoints,
            totals: navResult.totals,
        };

        updateMapLayers();
        saveSession();
    }

    function handleOpenConditionsModal() {
        showConditionsModal = true;
    }

    function handleConditionsSave(event: CustomEvent<VfrConditionThresholds>) {
        settings.customThresholds = event.detail;
        settings.conditionPreset = 'custom';
        showConditionsModal = false;
        // Trigger re-render and save
        handleSettingsChange();
    }

    function handleConditionsCancel() {
        showConditionsModal = false;
    }

    function handlePresetChange(event: CustomEvent<ConditionPreset>) {
        settings.conditionPreset = event.detail;
        if (event.detail !== 'custom') {
            settings.customThresholds = { ...getThresholdsForPreset(event.detail) };
        }
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
        if (!flightPlan || flightPlan.waypoints.length < 2) return;

        // Reverse the waypoints array
        const reversedWaypoints = [...flightPlan.waypoints].reverse();

        // Update flight plan name if it follows the pattern "A to B"
        let newName = flightPlan.name;
        const nameMatch = flightPlan.name.match(/^(.+?)\s+to\s+(.+)$/i);
        if (nameMatch) {
            newName = `${nameMatch[2]} to ${nameMatch[1]}`;
        } else if (flightPlan.waypoints.length >= 2) {
            // Fallback: use first and last waypoint names
            const first = reversedWaypoints[0].name;
            const last = reversedWaypoints[reversedWaypoints.length - 1].name;
            newName = `${first} to ${last}`;
        }

        // Recalculate navigation with reversed waypoints
        const navResult = calculateFlightPlanNavigation(reversedWaypoints, settings.defaultAirspeed);

        // Clear weather data since arrival times will be incorrect after reversing
        weatherData = new Map();
        weatherAlerts = new Map();
        weatherError = null;

        flightPlan = {
            ...flightPlan,
            name: newName,
            waypoints: navResult.waypoints,
            totals: navResult.totals,
        };

        // Clear selected waypoint
        selectedWaypointId = null;

        // Update map layers
        updateMapLayers();
        fitMapToRoute();
        saveSession();
    }

    async function handleReadWeather() {
        if (!flightPlan) return;

        isLoadingWeather = true;
        weatherError = null;

        try {
            // Get forecast time range if not already loaded
            if (!forecastRange && flightPlan.waypoints.length > 0) {
                const firstWp = flightPlan.waypoints[0];
                forecastRange = await getForecastTimeRange(firstWp.lat, firstWp.lon);

                // Initialize departure time
                if (forecastRange) {
                    if (syncWithWindy) {
                        // If sync is enabled, use Windy's current timestamp
                        const windyTimestamp = store.get('timestamp') as number;
                        if (windyTimestamp) {
                            departureTime = Math.max(forecastRange.start, Math.min(windyTimestamp, forecastRange.end));
                        } else {
                            // Fallback to now if Windy timestamp not available
                            const now = Date.now();
                            departureTime = Math.max(forecastRange.start, Math.min(now, forecastRange.end));
                        }
                    } else {
                        // If sync is disabled, use current time
                        const now = Date.now();
                        departureTime = Math.max(forecastRange.start, Math.min(now, forecastRange.end));
                    }
                }
            }

            // Fetch weather for all waypoints at their estimated arrival times
            // Use the planned altitude for wind data
            const plannedAltitude = flightPlan.aircraft.defaultAltitude;
            
            // Add overall timeout to prevent infinite hanging (60 seconds total)
            const weatherFetchPromise = fetchFlightPlanWeather(
                flightPlan.waypoints,
                name,
                departureTime,
                plannedAltitude,
                settings.enableLogging
            );

            const overallTimeout = new Promise<Map<string, WaypointWeather>>((_, reject) => {
                setTimeout(() => {
                    reject(new Error('Weather fetch operation timed out after 60 seconds'));
                }, 60000);
            });

            weatherData = await Promise.race([weatherFetchPromise, overallTimeout]);

            if (settings.enableLogging) {
                logger.debug(`[Plugin] Weather fetch complete: ${weatherData.size} waypoints with weather data`);
                if (weatherData.size > 0) {
                    logger.debug(`[Plugin] Weather data keys:`, Array.from(weatherData.keys()));
                    // Log detailed weather for each waypoint
                    weatherData.forEach((wx, waypointId) => {
                        const wp = flightPlan?.waypoints.find(w => w.id === waypointId);
                        logger.debug(`[Plugin] Weather for ${wp?.name || waypointId}:`, {
                            wind: `${Math.round(wx.windDir)}° @ ${Math.round(wx.windSpeed)} kt`,
                            gust: wx.windGust ? `${Math.round(wx.windGust)} kt` : 'none',
                            temp: `${Math.round(wx.temperature)}°C`,
                            cloudBase: wx.cloudBase ? `${Math.round(wx.cloudBase)}m AGL` : 'clear',
                            visibility: wx.visibility ? `${wx.visibility.toFixed(1)} km` : 'N/A',
                            pressure: wx.pressure ? `${Math.round(wx.pressure)} hPa` : 'N/A',
                            windAltitude: wx.windAltitude ? `${wx.windAltitude} ft` : 'surface'
                        });
                    });
                }
            }

            // Check for alerts at each waypoint
            // Wind/gust alerts only apply to terminal waypoints (departure/arrival)
            weatherAlerts = new Map();
            const waypointCount = flightPlan.waypoints.length;
            weatherData.forEach((wx, waypointId) => {
                // Determine if this is a terminal waypoint (first or last)
                const waypointIndex = flightPlan!.waypoints.findIndex(wp => wp.id === waypointId);
                const isTerminal = waypointIndex === 0 || waypointIndex === waypointCount - 1;
                const alerts = checkWeatherAlerts(wx, DEFAULT_ALERT_THRESHOLDS, plannedAltitude, isTerminal);
                if (alerts.length > 0) {
                    weatherAlerts.set(waypointId, alerts);
                }
            });

            // Fetch terrain elevation profile along the route
            try {
                if (settings.enableLogging) {
                    logger.debug(`[Plugin] Fetching terrain elevation profile from Open-Meteo (sampling every ${settings.terrainSampleInterval} NM)...`);
                }
                elevationProfile = await fetchRouteElevationProfile(
                    flightPlan.waypoints,
                    settings.terrainSampleInterval,
                    settings.enableLogging
                );
                if (settings.enableLogging) {
                    logger.debug(`[Plugin] Terrain profile: ${elevationProfile.length} elevation points`);
                }
            } catch (elevError) {
                logger.error('[Plugin] Error fetching elevation profile:', elevError);
                elevationProfile = []; // Continue without terrain data
            }

            // Recalculate navigation with wind corrections
            recalculateWithWind();

            // Update map tooltips with the new weather data
            updateMapLayers();
        } catch (err) {
            weatherError = err instanceof Error ? err.message : 'Failed to fetch weather';
            logger.error('[Plugin] Error fetching weather:', err);
            // Ensure weatherData is at least an empty Map on error
            if (!weatherData || weatherData.size === 0) {
                weatherData = new Map();
            }
        } finally {
            isLoadingWeather = false;
        }
    }

    function recalculateWithWind() {
        if (!flightPlan) return;

        logger.debug('=== FLIGHT TIME CALCULATION WITH WIND ===');
        logger.debug(`TAS (True Airspeed): ${settings.defaultAirspeed} kt`);
        logger.debug(`Default Cruise Altitude: ${settings.defaultAltitude} ft`);
        logger.debug('NOTE: All tracks and wind directions are in TRUE NORTH reference');
        logger.debug('');

        // Debug: Show all wind data for each waypoint
        logger.debug('=== WIND DATA BY WAYPOINT ===');
        flightPlan.waypoints.forEach((wp, idx) => {
            const wx = weatherData.get(wp.id);
            if (wx) {
                logger.debug(`WP${idx} ${wp.name || 'UNNAMED'} (alt: ${wp.altitude || 'N/A'} ft):`);
                logger.debug(`  Wind reported: ${wx.windDir?.toFixed(0)}° @ ${wx.windSpeed?.toFixed(0)} kt`);
                logger.debug(`  Wind level used: ${wx.windLevel || 'unknown'}`);
                logger.debug(`  Wind altitude: ${wx.windAltitude || 'surface'} ft`);
                if (wx.verticalWinds && wx.verticalWinds.length > 0) {
                    logger.debug(`  Vertical wind profile:`);
                    wx.verticalWinds.forEach(vw => {
                        logger.debug(`    ${vw.level} (${vw.altitudeFeet} ft): ${vw.windDir.toFixed(0)}° @ ${vw.windSpeed.toFixed(0)} kt`);
                    });
                }
            } else {
                logger.debug(`WP${idx} ${wp.name || 'UNNAMED'}: No weather data`);
            }
        });
        logger.debug('');

        // Recalculate ground speed for each leg with wind correction
        const updatedWaypoints = flightPlan.waypoints.map((wp, index) => {
            if (index === 0) return wp;

            const prevWp = flightPlan!.waypoints[index - 1];
            const wx = weatherData.get(wp.id);

            if (wx && wp.bearing !== undefined) {
                // Calculate ground speed with wind correction
                const gs = calculateGroundSpeed(
                    settings.defaultAirspeed,
                    wp.bearing,
                    wx.windDir,
                    wx.windSpeed
                );

                // Calculate headwind component for logging
                const headwind = calculateHeadwindComponent(wp.bearing, wx.windDir, wx.windSpeed);

                // Recalculate ETE with ground speed
                const distance = wp.distance || 0;
                const ete = gs > 0 ? (distance / gs) * 60 : 0; // minutes

                // Calculate crosswind component for logging
                const trackRad = (wp.bearing * Math.PI) / 180;
                const windRad = (wx.windDir * Math.PI) / 180;
                const crosswind = wx.windSpeed * Math.sin(windRad - trackRad);

                // Log leg details with full calculation breakdown
                logger.debug(`LEG ${index}: ${prevWp.name || 'WPT'} → ${wp.name || 'WPT'}`);
                logger.debug(`  Distance: ${distance.toFixed(1)} NM`);
                logger.debug(`  Track (TRUE): ${wp.bearing.toFixed(0)}°`);
                logger.debug(`  Wind (TRUE): ${wx.windDir.toFixed(0)}° @ ${wx.windSpeed.toFixed(0)} kt`);
                logger.debug(`  --- Ground Speed Calculation ---`);
                logger.debug(`    Wind angle relative to track: ${((wx.windDir - wp.bearing + 360) % 360).toFixed(0)}°`);
                logger.debug(`    Formula: headwind = windSpeed × cos(windDir - track)`);
                logger.debug(`           = ${wx.windSpeed.toFixed(1)} × cos(${wx.windDir.toFixed(0)}° - ${wp.bearing.toFixed(0)}°)`);
                logger.debug(`           = ${wx.windSpeed.toFixed(1)} × cos(${(wx.windDir - wp.bearing).toFixed(0)}°)`);
                logger.debug(`           = ${wx.windSpeed.toFixed(1)} × ${Math.cos((wx.windDir - wp.bearing) * Math.PI / 180).toFixed(3)}`);
                logger.debug(`           = ${headwind.toFixed(1)} kt (${headwind >= 0 ? 'HEADWIND' : 'TAILWIND'})`);
                logger.debug(`    Crosswind: ${Math.abs(crosswind).toFixed(1)} kt from ${crosswind >= 0 ? 'RIGHT' : 'LEFT'}`);
                logger.debug(`    Ground Speed = TAS - headwind`);
                logger.debug(`                 = ${settings.defaultAirspeed} - (${headwind.toFixed(1)})`);
                logger.debug(`                 = ${gs.toFixed(1)} kt`);
                logger.debug(`  --- ETE Calculation ---`);
                logger.debug(`    ETE = Distance / Ground Speed × 60`);
                logger.debug(`        = ${distance.toFixed(1)} / ${gs.toFixed(1)} × 60`);
                logger.debug(`        = ${ete.toFixed(1)} min (${Math.floor(ete / 60)}h ${Math.round(ete % 60)}m)`);
                logger.debug('');

                return {
                    ...wp,
                    groundSpeed: gs,
                    ete,
                };
            } else {
                // Log leg without wind data
                const distance = wp.distance || 0;
                const ete = wp.ete || 0;
                logger.debug(`LEG ${index}: ${prevWp.name || 'WPT'} → ${wp.name || 'WPT'}`);
                logger.debug(`  Distance: ${distance.toFixed(1)} NM`);
                logger.debug(`  Track (TRUE): ${wp.bearing !== undefined ? wp.bearing.toFixed(0) + '°' : 'N/A'}`);
                logger.debug(`  Wind: No wind data available`);
                logger.debug(`  Ground Speed: ${settings.defaultAirspeed} kt (using TAS, no wind correction)`);
                logger.debug(`  ETE: ${ete.toFixed(1)} min`);
                logger.debug('');
            }

            return wp;
        });

        // Recalculate totals
        const totalEte = updatedWaypoints.reduce((sum, wp) => sum + (wp.ete || 0), 0);
        const totalDistance = updatedWaypoints.reduce((sum, wp) => sum + (wp.distance || 0), 0);

        // Calculate distance-weighted average headwind
        let weightedHeadwindSum = 0;
        updatedWaypoints.forEach((wp, index) => {
            if (index === 0) return;
            const wx = weatherData.get(wp.id);
            if (wx && wp.bearing !== undefined && wp.distance) {
                const headwind = calculateHeadwindComponent(wp.bearing, wx.windDir, wx.windSpeed);
                weightedHeadwindSum += headwind * wp.distance;
            }
        });
        const averageHeadwind = totalDistance > 0 ? weightedHeadwindSum / totalDistance : undefined;

        // Log summary
        logger.debug('=== FLIGHT SUMMARY ===');
        logger.debug(`Total Distance: ${totalDistance.toFixed(1)} NM`);
        logger.debug(`Total ETE: ${totalEte.toFixed(1)} min (${Math.floor(totalEte / 60)}h ${Math.round(totalEte % 60)}m)`);
        if (averageHeadwind !== undefined) {
            logger.debug(`Average Headwind: ${averageHeadwind >= 0 ? '+' : ''}${averageHeadwind.toFixed(1)} kt`);
        }
        logger.debug('=====================================');
        logger.debug('');

        flightPlan = {
            ...flightPlan,
            waypoints: updatedWaypoints,
            totals: {
                ...flightPlan.totals,
                ete: totalEte,
                averageHeadwind,
            },
        };
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

    // Departure time formatting and handling
    function formatDepartureTime(timestamp: number): string {
        const date = new Date(timestamp);
        const now = new Date();
        const isToday = date.toDateString() === now.toDateString();
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const isTomorrow = date.toDateString() === tomorrow.toDateString();

        const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        if (isToday) {
            return `Today ${timeStr}`;
        } else if (isTomorrow) {
            return `Tomorrow ${timeStr}`;
        } else {
            const dateStr = date.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
            return `${dateStr} ${timeStr}`;
        }
    }

    function formatShortTime(timestamp: number): string {
        const date = new Date(timestamp);
        const now = new Date();
        const isToday = date.toDateString() === now.toDateString();

        if (isToday) {
            return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        } else {
            return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
        }
    }

    async function handleDepartureTimeChange() {
        // Re-fetch weather for the new departure time
        if (flightPlan && forecastRange) {
            // Update Windy's timeline if sync is enabled and not triggered by Windy
            if (syncWithWindy && !isUpdatingFromWindy && !isUpdatingToWindy) {
                isUpdatingToWindy = true;
                try {
                    store.set('timestamp', departureTime);
                } finally {
                    // Use a small delay to avoid race conditions
                    setTimeout(() => {
                        isUpdatingToWindy = false;
                    }, 100);
                }
            }
            await handleReadWeather();
            saveSession();
        }
    }

    function handleWindyTimestampChange(newTimestamp: number) {
        // Only sync if enabled and we have a forecast range
        // Skip if we're currently updating Windy (to avoid loops)
        if (!syncWithWindy || !forecastRange || isLoadingWeather || isUpdatingToWindy) return;

        // Clamp to forecast range
        const clampedTime = Math.max(forecastRange.start, Math.min(newTimestamp, forecastRange.end));

        // Only update if significantly different (avoid infinite loops)
        // Reduced threshold to 5 seconds for better responsiveness
        if (Math.abs(clampedTime - departureTime) > 5000) {
            isUpdatingFromWindy = true;
            departureTime = clampedTime;
            handleReadWeather().finally(() => {
                isUpdatingFromWindy = false;
            });
        }
    }

    function toggleWindySync() {
        syncWithWindy = !syncWithWindy;
        if (syncWithWindy && forecastRange) {
            // Sync to current Windy timestamp
            const windyTimestamp = store.get('timestamp') as number;
            if (windyTimestamp) {
                // Use setTimeout to avoid immediate trigger during toggle
                setTimeout(() => {
                    handleWindyTimestampChange(windyTimestamp);
                }, 50);
            }
        } else if (!syncWithWindy) {
            // When disabling sync, ensure flags are reset
            isUpdatingFromWindy = false;
            isUpdatingToWindy = false;
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
     */
    async function handleFindVFRWindows() {
        if (!flightPlan || flightPlan.waypoints.length < 2) {
            windowSearchError = 'Need at least 2 waypoints to search for VFR windows';
            return;
        }

        if (flightPlan.totals.ete <= 0) {
            windowSearchError = 'Cannot search without valid flight time (ETE)';
            return;
        }

        isSearchingWindows = true;
        windowSearchProgress = 0;
        windowSearchError = null;
        vfrWindows = null;

        try {
            const result = await findVFRWindows(
                flightPlan.waypoints,
                flightPlan.aircraft.defaultAltitude,
                flightPlan.totals.ete,
                {
                    minimumCondition: windowSearchMinCondition,
                    maxConcurrent: 4,
                    maxWindows: settings.maxVFRWindows,
                    startFrom: Date.now(), // Always start search from now
                    collectDetailedData: settings.enableLogging, // Collect for CSV export only when debug logging enabled
                    includeNightFlights: settings.includeNightFlights,
                    routeCoordinates: { lat: flightPlan.waypoints[0].lat, lon: flightPlan.waypoints[0].lon },
                },
                (progress) => {
                    windowSearchProgress = progress;
                },
                settings.enableLogging
            );

            vfrWindows = result.windows;

            if (result.windows.length === 0) {
                if (result.limitedBy) {
                    windowSearchError = result.limitedBy;
                } else {
                    windowSearchError = `No ${windowSearchMinCondition === 'good' ? 'good' : 'acceptable'} VFR windows found in forecast period`;
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
            windowSearchError = err instanceof Error ? err.message : 'Error searching for VFR windows';
        } finally {
            isSearchingWindows = false;
        }
    }

    /**
     * Use a found VFR window by setting the departure time to its start
     */
    async function useVFRWindow(window: VFRWindow) {
        departureTime = window.startTime;

        // Update Windy's timeline to show weather at this time on the map
        // Set flag to avoid triggering handleWindyTimestampChange feedback loop
        isUpdatingToWindy = true;
        try {
            store.set('timestamp', window.startTime);
        } finally {
            setTimeout(() => {
                isUpdatingToWindy = false;
            }, 100);
        }

        // Refresh weather data for the route panel with the new departure time
        if (flightPlan) {
            await handleReadWeather();
            saveSession();
        }
    }

    // Map layer management
    function updateMapLayers() {
        if (settings.enableLogging) {
            logger.debug('[Plugin] updateMapLayers called, waypoints:', flightPlan?.waypoints.length);
            logger.debug('[Plugin] routeLayer exists:', !!routeLayer, 'waypointMarkers exists:', !!waypointMarkers);
        }

        clearMapLayers();

        if (settings.enableLogging) {
            logger.debug('[Plugin] After clearMapLayers: routeLayer:', !!routeLayer, 'waypointMarkers:', !!waypointMarkers);
        }

        if (!flightPlan || flightPlan.waypoints.length === 0) return;

        // Calculate profile data to get segment conditions
        const thresholds = getThresholdsForPreset(settings.conditionPreset, settings.customThresholds);
        const profileData = calculateProfileData(
            flightPlan.waypoints,
            weatherData,
            flightPlan.aircraft.defaultAltitude,
            elevationProfile,
            thresholds
        );

        // Create route with color-coded segments
        routeLayer = new L.LayerGroup();

        // Create a polyline segment for each pair of waypoints
        for (let i = 0; i < flightPlan.waypoints.length - 1; i++) {
            const wp1 = flightPlan.waypoints[i];
            const wp2 = flightPlan.waypoints[i + 1];
            // Find the correct profile point by waypoint ID (profileData may contain terrain samples between waypoints)
            const wp1ProfilePoint = profileData.find(p => p.waypointId === wp1.id);
            const condition = wp1ProfilePoint?.condition;

            const segmentCoords: [number, number][] = [
                [wp1.lat, wp1.lon],
                [wp2.lat, wp2.lon]
            ];

            const segmentColor = getSegmentColor(condition);

            const segment = new L.Polyline(segmentCoords, {
                color: segmentColor,
                weight: 4,
                opacity: 0.8,
            });

            // Add click handler to insert waypoint on this segment
            segment.on('click', (e: L.LeafletMouseEvent) => {
                if (isEditMode) {
                    L.DomEvent.stopPropagation(e);
                    insertWaypointOnSegment(i, e.latlng.lat, e.latlng.lng);
                }
            });

            // Change cursor when hovering if edit mode is enabled
            segment.on('mouseover', () => {
                if (isEditMode) {
                    map.getContainer().style.cursor = 'crosshair';
                }
            });

            segment.on('mouseout', () => {
                map.getContainer().style.cursor = '';
            });

            routeLayer.addLayer(segment);
        }

        map.addLayer(routeLayer);

        if (settings.enableLogging) {
            logger.debug('[Plugin] Added routeLayer to map with', flightPlan.waypoints.length - 1, 'segments');
        }

        // Create waypoint markers
        waypointMarkers = new L.LayerGroup();
        markerMap.clear();

        flightPlan.waypoints.forEach((wp, index) => {
            let marker: L.Marker | L.CircleMarker;

            if (isEditMode) {
                // Use regular marker for dragging in edit mode
                marker = new L.Marker([wp.lat, wp.lon], {
                    draggable: true,
                    icon: L.divIcon({
                        className: 'wp-marker',
                        html: `<div style="
                            width: 16px;
                            height: 16px;
                            border-radius: 50%;
                            background: ${getMarkerColor(wp.type)};
                            border: 2px solid white;
                            box-shadow: 0 2px 4px rgba(0,0,0,0.3);
                        "></div>`,
                        iconSize: [16, 16],
                        iconAnchor: [8, 8],
                    }),
                });

                marker.on('dragend', (e: L.DragEndEvent) => {
                    const latlng = e.target.getLatLng();
                    handleWaypointDrag(wp.id, latlng.lat, latlng.lng);
                });

                markerMap.set(wp.id, marker as L.Marker);
            } else {
                // Use circle marker (non-draggable)
                marker = new L.CircleMarker([wp.lat, wp.lon], {
                    radius: 8,
                    fillColor: getMarkerColor(wp.type),
                    color: '#fff',
                    weight: 2,
                    opacity: 1,
                    fillOpacity: 0.8,
                });
            }

            // Build tooltip content with weather and condition info
            let tooltipContent = `<b>${index + 1}. ${wp.name}</b>${wp.comment ? `<br/><i>${wp.comment}</i>` : ''}`;

            // Add altitude information
            const altitude = wp.altitude ?? flightPlan.aircraft.defaultAltitude;
            tooltipContent += '<br/><div style="margin-top: 2px; font-size: 11px;">';
            tooltipContent += `✈️ Altitude: ${Math.round(altitude)} ft MSL`;

            // Add terrain elevation if available
            // Find the correct profile point by waypoint ID (profileData may contain terrain samples between waypoints)
            const pointData = profileData.find(p => p.waypointId === wp.id);
            if (pointData?.terrainElevation !== undefined) {
                const clearance = altitude - pointData.terrainElevation;
                tooltipContent += ` | ⛰️ Terrain: ${Math.round(pointData.terrainElevation)} ft`;
                tooltipContent += ` (${clearance >= 0 ? '+' : ''}${Math.round(clearance)} ft)`;
            }
            tooltipContent += '</div>';

            // Add weather data if available (matching Route Panel display)
            const wx = getWaypointWeather(wp.id);
            if (wx) {
                tooltipContent += '<br/><div style="margin-top: 4px;">';
                tooltipContent += `💨 ${formatWind(wx.windSpeed, wx.windDir, wx.windAltitude)}`;
                if (wx.windLevel && wx.windLevel !== 'surface') {
                    tooltipContent += ` <span style="font-size: 9px; color: #888;">(${wx.windLevel})</span>`;
                }
                tooltipContent += ` | 🌡️ ${formatTemperature(wx.temperature)}`;
                tooltipContent += ` | ☁️ ${wx.cloudBaseDisplay ?? 'CLR'}`;
                tooltipContent += '</div>';

                // Add vertical wind profile if available
                if (wx.verticalWinds && wx.verticalWinds.length > 0) {
                    tooltipContent += '<div style="margin-top: 6px; padding-top: 4px; border-top: 1px solid #444; font-size: 10px;">';
                    tooltipContent += '<b>📊 Winds Aloft:</b><br/>';
                    tooltipContent += '<table style="font-size: 10px; line-height: 1.3; margin-top: 2px;">';
                    // Show winds from highest to lowest altitude
                    const sortedWinds = [...wx.verticalWinds].sort((a, b) => b.altitudeFeet - a.altitudeFeet);
                    sortedWinds.forEach(w => {
                        const isCurrentLevel = wx.windLevel?.includes(w.level);
                        const highlight = isCurrentLevel ? ' style="color: #4CAF50; font-weight: bold;"' : '';
                        tooltipContent += `<tr${highlight}>`;
                        tooltipContent += `<td style="padding-right: 8px;">${w.level}</td>`;
                        tooltipContent += `<td style="padding-right: 4px; text-align: right;">${Math.round(w.altitudeFeet).toLocaleString()}ft</td>`;
                        tooltipContent += `<td style="text-align: right;">${String(Math.round(w.windDir)).padStart(3, '0')}°/${Math.round(w.windSpeed)}kt</td>`;
                        tooltipContent += '</tr>';
                    });
                    tooltipContent += '</table>';
                    tooltipContent += '</div>';
                }

                // Add runway info for terminal waypoints (departure/arrival)
                const isTerminal = index === 0 || index === flightPlan.waypoints.length - 1;
                if (isTerminal && wp.runways && wp.runways.length > 0) {
                    const surfaceWindSpeed = wx.surfaceWindSpeed ?? wx.windSpeed;
                    const surfaceWindDir = wx.surfaceWindDir ?? wx.windDir;
                    const bestRwy = getBestRunway(wp.runways, surfaceWindDir, surfaceWindSpeed, wx.windGust);

                    if (bestRwy) {
                        tooltipContent += '<div style="margin-top: 6px; padding-top: 4px; border-top: 1px solid #444; font-size: 11px;">';
                        tooltipContent += `<b>🛬 Surface Wind:</b> ${Math.round(surfaceWindDir)}° @ ${Math.round(surfaceWindSpeed)}kt`;
                        if (wx.windGust) {
                            const gustColor = wx.windGust > 35 ? '#e74c3c' : (wx.windGust > 25 ? '#f39c12' : '#9b59b6');
                            tooltipContent += ` <span style="color: ${gustColor}; font-weight: bold;">G${Math.round(wx.windGust)}kt</span>`;
                        }
                        tooltipContent += '<br/>';
                        tooltipContent += `<b>Best Runway:</b> <span style="color: #3498db; font-weight: bold;">${bestRwy.runwayIdent}</span>`;
                        tooltipContent += ` (hdg ${Math.round(bestRwy.runwayHeading)}°)`;
                        tooltipContent += '<br/>';

                        // Crosswind
                        const xwindColor = bestRwy.crosswindKt > 20 ? '#e74c3c' : (bestRwy.crosswindKt > 15 ? '#f39c12' : '#2ecc71');
                        let xwindText = `Xwind: ${Math.round(bestRwy.crosswindKt)}`;
                        if (bestRwy.gustCrosswindKt) {
                            xwindText += `<span style="color: #9b59b6; font-weight: bold;">G${Math.round(bestRwy.gustCrosswindKt)}</span>`;
                        }
                        xwindText += 'kt';
                        tooltipContent += `<span style="color: ${xwindColor};">${xwindText}</span>`;

                        // Headwind/Tailwind
                        if (bestRwy.headwindKt < 0) {
                            const tailColor = bestRwy.headwindKt < -10 ? '#e74c3c' : '#e67e22';
                            let tailText = `Tailwind: ${Math.round(Math.abs(bestRwy.headwindKt))}`;
                            if (bestRwy.gustHeadwindKt && bestRwy.gustHeadwindKt < 0) {
                                tailText += `<span style="color: #9b59b6; font-weight: bold;">G${Math.round(Math.abs(bestRwy.gustHeadwindKt))}</span>`;
                            }
                            tailText += 'kt';
                            tooltipContent += ` | <span style="color: ${tailColor};">${tailText}</span>`;
                        } else {
                            let headText = `Headwind: ${Math.round(bestRwy.headwindKt)}`;
                            if (bestRwy.gustHeadwindKt && bestRwy.gustHeadwindKt >= 0) {
                                headText += `<span style="color: #9b59b6; font-weight: bold;">G${Math.round(bestRwy.gustHeadwindKt)}</span>`;
                            }
                            headText += 'kt';
                            tooltipContent += ` | <span style="color: #2ecc71;">${headText}</span>`;
                        }
                        tooltipContent += '</div>';
                    }
                }
            }

            // Add navigation data if not departure
            if (index > 0) {
                tooltipContent += '<br/><div style="margin-top: 2px; font-size: 11px;">';
                tooltipContent += `${formatBearing(wp.bearing || 0)} | ${formatDistance(wp.distance || 0)}`;
                if (wp.groundSpeed) {
                    tooltipContent += ` | GS ${Math.round(wp.groundSpeed)}kt`;
                }
                tooltipContent += '</div>';
            }

            // Add condition information if available
            if (pointData?.condition) {
                const conditionColor = getSegmentColor(pointData.condition);
                tooltipContent += `<br/><span style="color: ${conditionColor}; font-weight: bold; margin-top: 4px; display: inline-block;">Conditions: ${pointData.condition.toUpperCase()}</span>`;

                if (pointData.conditionReasons && pointData.conditionReasons.length > 0) {
                    tooltipContent += '<br/><span style="font-size: 10px;">';
                    pointData.conditionReasons.forEach(reason => {
                        tooltipContent += `<br/>⚠️ ${reason}`;
                    });
                    tooltipContent += '</span>';
                }
            }

            // When showLabels is enabled, show simple permanent labels
            // Otherwise, show detailed tooltip on hover
            if (settings.showLabels) {
                const labelContent = `<b>${index + 1}. ${wp.name}</b>`;
                marker.bindTooltip(labelContent, {
                    permanent: true,
                    direction: 'top',
                    className: 'waypoint-label',
                    offset: [0, -10],
                });
            } else {
                marker.bindTooltip(tooltipContent, {
                    permanent: false,
                    direction: 'top',
                });
            }

            marker.on('click', () => {
                selectedWaypointId = wp.id;
            });

            waypointMarkers?.addLayer(marker);
        });

        if (settings.enableLogging) {
            logger.debug('[Plugin] Created', flightPlan.waypoints.length, 'waypoint markers');
        }

        map.addLayer(waypointMarkers);

        if (settings.enableLogging) {
            logger.debug('[Plugin] Added waypointMarkers layer to map');
            logger.debug('[Plugin] Map has', map.getLayers ? map.getLayers().length : 'unknown', 'layers');
        }
    }

    function clearMapLayers() {
        if (routeLayer) {
            routeLayer.remove();
            routeLayer = null;
        }

        if (waypointMarkers) {
            waypointMarkers.remove();
            waypointMarkers = null;
        }

        markerMap.clear();
    }

    function fitMapToRoute() {
        if (!flightPlan || flightPlan.waypoints.length === 0) return;

        const bounds = L.latLngBounds(
            flightPlan.waypoints.map(wp => [wp.lat, wp.lon] as [number, number])
        );

        map.fitBounds(bounds, { padding: [50, 50] });
    }

    // Session persistence functions

    function saveSession() {
        try {
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
                departureTime,
                syncWithWindy,
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

    function loadSession() {
        try {
            const sessionData = sessionStorage.load();
            if (!sessionData) return;

            const data = sessionData as any;

            // Restore settings
            if (data.settings) {
                settings = { ...DEFAULT_SETTINGS, ...data.settings };
            }

            // Restore departure time and sync setting
            if (data.departureTime) {
                departureTime = data.departureTime;
            }
            if (typeof data.syncWithWindy === 'boolean') {
                syncWithWindy = data.syncWithWindy;
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
                flightPlan = restoredPlan;
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

    export const onopen = (_params: unknown) => {
        // Load session when plugin opens
        loadSession();
        if (flightPlan) {
            updateMapLayers();
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

    .departure-section {
        padding: 0 10px 10px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        margin-bottom: 10px;
    }

    .departure-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 8px;
    }

    .departure-label {
        font-size: 12px;
        color: rgba(255, 255, 255, 0.7);
    }

    .departure-time {
        font-size: 13px;
        font-weight: 500;
        color: #3498db;
    }

    .timeline-slider {
        position: relative;
    }

    .slider {
        width: 100%;
        height: 6px;
        -webkit-appearance: none;
        appearance: none;
        background: rgba(255, 255, 255, 0.1);
        border-radius: 3px;
        outline: none;
        cursor: pointer;

        &::-webkit-slider-thumb {
            -webkit-appearance: none;
            appearance: none;
            width: 18px;
            height: 18px;
            background: #3498db;
            border-radius: 50%;
            cursor: pointer;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
            transition: transform 0.15s ease;

            &:hover {
                transform: scale(1.1);
            }
        }

        &::-moz-range-thumb {
            width: 18px;
            height: 18px;
            background: #3498db;
            border-radius: 50%;
            cursor: pointer;
            border: none;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
        }
    }

    .timeline-labels {
        display: flex;
        justify-content: space-between;
        margin-top: 4px;
        font-size: 10px;
        color: rgba(255, 255, 255, 0.5);
    }

    .departure-footer {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-top: 6px;
    }

    .arrival-info {
        font-size: 11px;
        color: rgba(255, 255, 255, 0.6);
    }

    .btn-sync {
        padding: 4px 8px;
        min-height: 44px;
        background: rgba(255, 255, 255, 0.1);
        border: none;
        border-radius: 4px;
        color: rgba(255, 255, 255, 0.6);
        cursor: pointer;
        font-size: 10px;
        transition: all 0.15s ease;
        touch-action: manipulation;
        -webkit-tap-highlight-color: transparent;

        &:hover {
            background: rgba(255, 255, 255, 0.15);
            color: rgba(255, 255, 255, 0.8);
        }

        &:active {
            transform: scale(0.98);
        }

        &:focus {
            outline: 2px solid rgba(255, 255, 255, 0.3);
            outline-offset: 2px;
        }

        &.active {
            background: rgba(39, 174, 96, 0.3);
            color: #27ae60;
        }
    }

    /* VFR Window Detection */
    .vfr-window-section {
        margin-top: 10px;
        padding-top: 10px;
        border-top: 1px solid rgba(255, 255, 255, 0.1);
    }

    .vfr-window-controls {
        display: flex;
        gap: 8px;
        align-items: center;
    }

    .condition-select {
        flex: 0 0 auto;
        padding: 6px 8px;
        background: rgba(255, 255, 255, 0.1);
        border: 1px solid rgba(255, 255, 255, 0.2);
        border-radius: 4px;
        color: rgba(255, 255, 255, 0.9);
        font-size: 11px;
        cursor: pointer;

        &:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }
    }

    .btn-find-windows {
        flex: 1;
        padding: 6px 10px;
        min-height: 44px;
        background: rgba(52, 152, 219, 0.3);
        border: 1px solid rgba(52, 152, 219, 0.5);
        border-radius: 4px;
        color: #3498db;
        cursor: pointer;
        font-size: 11px;
        transition: all 0.15s ease;
        touch-action: manipulation;
        -webkit-tap-highlight-color: transparent;

        &:hover:not(:disabled) {
            background: rgba(52, 152, 219, 0.4);
        }

        &:active:not(:disabled) {
            transform: scale(0.98);
        }

        &:focus {
            outline: 2px solid rgba(52, 152, 219, 0.5);
            outline-offset: 2px;
        }

        &:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }
    }

    .search-progress {
        margin-top: 8px;
    }

    .progress-bar {
        height: 4px;
        background: rgba(255, 255, 255, 0.1);
        border-radius: 2px;
        overflow: hidden;
    }

    .progress-fill {
        height: 100%;
        background: #3498db;
        transition: width 0.2s ease;
    }

    .window-error {
        margin-top: 8px;
        padding: 6px 8px;
        background: rgba(231, 76, 60, 0.2);
        border-radius: 4px;
        color: rgba(255, 255, 255, 0.8);
        font-size: 11px;
    }

    .vfr-windows-list {
        margin-top: 8px;
        display: flex;
        flex-direction: column;
        gap: 6px;
    }

    .vfr-window-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 8px 10px;
        background: rgba(255, 255, 255, 0.05);
        border-radius: 4px;
        border-left: 3px solid #757575;
        min-height: 44px;
        transition: background 0.15s ease;

        &:hover,
        &:active {
            background: rgba(255, 255, 255, 0.1);
        }

        &.good {
            border-left-color: #4caf50;
            background: rgba(76, 175, 80, 0.1);

            &:hover,
            &:active {
                background: rgba(76, 175, 80, 0.15);
            }
        }

        &.marginal {
            border-left-color: #ff9800;
            background: rgba(255, 152, 0, 0.1);

            &:hover,
            &:active {
                background: rgba(255, 152, 0, 0.15);
            }
        }
    }

    .window-info {
        display: flex;
        flex-direction: column;
        gap: 2px;
    }

    .window-date {
        font-size: 11px;
        font-weight: 600;
        color: rgba(255, 255, 255, 0.95);
    }

    .window-time {
        font-size: 12px;
        font-weight: 500;
        color: rgba(255, 255, 255, 0.8);
    }

    .window-meta {
        display: flex;
        gap: 8px;
        align-items: center;
    }

    .window-duration {
        font-size: 10px;
        color: rgba(255, 255, 255, 0.6);
    }

    .window-confidence {
        font-size: 10px;
        color: rgba(255, 255, 255, 0.5);

        &.high {
            color: #4caf50;
        }

        &.medium {
            color: #ff9800;
        }

        &.low {
            color: #f44336;
        }
    }

    .btn-use-window {
        padding: 4px 12px;
        min-height: 44px;
        background: rgba(52, 152, 219, 0.3);
        border: 1px solid rgba(52, 152, 219, 0.5);
        border-radius: 4px;
        color: #3498db;
        cursor: pointer;
        font-size: 11px;
        transition: all 0.15s ease;
        touch-action: manipulation;
        -webkit-tap-highlight-color: transparent;

        &:hover {
            background: rgba(52, 152, 219, 0.5);
        }

        &:active {
            transform: scale(0.98);
        }

        &:focus {
            outline: 2px solid rgba(52, 152, 219, 0.5);
            outline-offset: 2px;
        }
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

    .about-section {
        padding: 15px;
        overflow-y: auto;
    }

    .about-header {
        display: flex;
        align-items: center;
        gap: 10px;
        margin-bottom: 15px;
        padding-bottom: 12px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);

        .about-icon {
            font-size: 24px;
        }

        h3 {
            margin: 0;
            font-size: 16px;
            font-weight: 600;
            color: white;
            flex: 1;
        }

        .about-version {
            font-size: 12px;
            color: rgba(255, 255, 255, 0.5);
            background: rgba(255, 255, 255, 0.1);
            padding: 3px 8px;
            border-radius: 4px;
        }
    }

    .about-description {
        margin-bottom: 15px;

        p {
            margin: 0;
            font-size: 13px;
            color: rgba(255, 255, 255, 0.7);
            line-height: 1.5;
        }
    }

    .about-disclaimer {
        background: rgba(231, 76, 60, 0.15);
        border: 1px solid rgba(231, 76, 60, 0.3);
        border-radius: 6px;
        padding: 12px;
        margin-bottom: 15px;

        h4 {
            margin: 0 0 10px 0;
            font-size: 13px;
            font-weight: 600;
            color: #e74c3c;
        }

        p {
            margin: 0 0 10px 0;
            font-size: 12px;
            color: rgba(255, 255, 255, 0.8);
            line-height: 1.5;

            &:last-child {
                margin-bottom: 0;
            }
        }

        ul {
            margin: 10px 0;
            padding-left: 20px;

            li {
                font-size: 12px;
                color: rgba(255, 255, 255, 0.8);
                line-height: 1.6;
                margin-bottom: 5px;
            }
        }

        a {
            color: #3498db;
            text-decoration: none;

            &:hover,
            &:active {
                text-decoration: underline;
            }
        }
    }

    .about-credits {
        background: rgba(255, 255, 255, 0.05);
        border-radius: 6px;
        padding: 12px;

        h4 {
            margin: 0 0 8px 0;
            font-size: 12px;
            font-weight: 600;
            color: rgba(255, 255, 255, 0.7);
        }

        ul {
            margin: 0;
            padding-left: 20px;

            li {
                font-size: 12px;
                color: rgba(255, 255, 255, 0.6);
                line-height: 1.6;
            }
        }

        a {
            color: #3498db;
            text-decoration: none;

            &:hover,
            &:active {
                text-decoration: underline;
            }
        }
    }

    .about-support {
        margin-top: 15px;
        background: rgba(255, 200, 87, 0.1);
        border-radius: 6px;
        padding: 12px;
        text-align: center;

        h4 {
            margin: 0 0 8px 0;
            font-size: 13px;
            font-weight: 600;
            color: rgba(255, 255, 255, 0.85);
        }

        p {
            margin: 0 0 12px 0;
            font-size: 12px;
            color: rgba(255, 255, 255, 0.6);
        }

        .coffee-link {
            display: inline-block;
            padding: 8px 16px;
            background: #ffdd00;
            color: #000;
            font-weight: 600;
            font-size: 13px;
            text-decoration: none;
            border-radius: 5px;
            transition: background 0.2s;

            &:hover,
            &:active {
                background: #e5c700;
                text-decoration: none;
            }
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
