<div class="plugin__mobile-header">
    {title}
</div>
<section class="plugin__content">
    <div
        class="plugin__title plugin__title--chevron-back"
        on:click={() => bcast.emit('rqstOpen', 'menu')}
    >
        {title}
    </div>

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
                accept=".fpl,.xml"
                on:change={handleFileSelect}
                bind:this={fileInput}
                style="display: none"
            />
            {#if isLoading}
                <span class="loading">Loading...</span>
            {:else if !flightPlan}
                <div class="drop-zone-content">
                    <span class="drop-icon">✈️</span>
                    <span>Drop .fpl file here</span>
                    <button class="btn-browse" on:click={() => fileInput?.click()}>
                        Browse...
                    </button>
                </div>
            {:else}
                <div class="flight-plan-loaded">
                    <span class="plan-name">{flightPlan.name}</span>
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
                <button class="btn-action" on:click={handleExportGPX} title="Export as GPX">
                    📥 Export GPX
                </button>
                <button
                    class="btn-action"
                    on:click={handleSendToDistancePlanning}
                    title="Open route in Windy Distance & Planning (new window)"
                >
                    🗺️ Send to D&P
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
                    class:active={isAddingWaypoint}
                    on:click={toggleAddWaypoint}
                    title="Click on map to add waypoint"
                >
                    {isAddingWaypoint ? '✓ Click map' : '➕ Add Point'}
                </button>
            </div>
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
                </div>
            {/if}
        {/if}

        <!-- Waypoint Table -->
        {#if flightPlan && flightPlan.waypoints.length > 0}
            <div class="waypoint-section">
                <div class="section-header">
                    <span>Waypoints ({flightPlan.waypoints.length})</span>
                    <span class="totals">
                        {formatDistance(flightPlan.totals.distance)} · {formatEte(flightPlan.totals.ete)}
                        {#if flightPlan.totals.averageHeadwind !== undefined}
                            · {formatHeadwind(flightPlan.totals.averageHeadwind)}
                        {/if}
                    </span>
                </div>
                <div class="waypoint-table">
                    {#each flightPlan.waypoints as wp, index (wp.id)}
                        {@const wx = getWaypointWeather(wp.id)}
                        {@const alerts = getWaypointAlerts(wp.id)}
                        <div
                            class="waypoint-row"
                            class:selected={selectedWaypointId === wp.id}
                            class:has-warning={alerts.some(a => a.severity === 'warning')}
                            class:has-caution={alerts.some(a => a.severity === 'caution')}
                            on:click={() => selectWaypoint(wp)}
                        >
                            <div class="wp-index">{index + 1}</div>
                            <div class="wp-info">
                                <div class="wp-name">
                                    <span class="wp-type-icon">{getWaypointIcon(wp.type)}</span>
                                    {wp.name}
                                    {#if alerts.length > 0}
                                        <span class="alert-badge" class:warning={alerts.some(a => a.severity === 'warning')}>
                                            ⚠️
                                        </span>
                                    {/if}
                                </div>
                                {#if wp.comment}
                                    <div class="wp-comment">{wp.comment}</div>
                                {/if}
                                {#if wx}
                                    <div class="wp-weather">
                                        <span class="wx-wind" title={wx.windAltitude ? `Wind at ${Math.round(wx.windAltitude)}ft` : 'Wind'}>💨 {formatWind(wx.windSpeed, wx.windDir, wx.windAltitude)}</span>
                                        <span class="wx-temp" title="Temperature">🌡️ {formatTemperature(wx.temperature)}</span>
                                        <span
                                            class="wx-cloud"
                                            class:clickable={wx.cloudBase !== undefined}
                                            title={wx.cloudBase !== undefined ? 'Click to view full cbase table in console' : 'Cloud base (ECMWF) - N/A'}
                                            on:click={() => {
                                                if (wx.cloudBase !== undefined && wp) {
                                                    getCbaseTable(wp.lat, wp.lon, wp.name, settings.enableLogging);
                                                }
                                            }}
                                        >
                                            ☁️ {wx.cloudBaseDisplay ?? 'N/A'}
                                        </span>
                                    </div>
                                {/if}
                            </div>
                            <div class="wp-nav">
                                {#if index > 0}
                                    <div class="wp-bearing">{formatBearing(wp.bearing || 0)}</div>
                                    <div class="wp-distance">{formatDistance(wp.distance || 0)}</div>
                                    {#if wp.groundSpeed}
                                        <div class="wp-gs" title="Ground speed">GS {Math.round(wp.groundSpeed)}</div>
                                    {/if}
                                {:else}
                                    <div class="wp-bearing">---</div>
                                    <div class="wp-distance">DEP</div>
                                {/if}
                            </div>
                            <button
                                class="btn-delete"
                                on:click|stopPropagation={() => deleteWaypoint(wp.id)}
                                title="Delete waypoint"
                            >🗑</button>
                        </div>
                        {#if alerts.length > 0}
                            <div class="alert-row">
                                {#each alerts as alert}
                                    <span class="alert-item" class:warning={alert.severity === 'warning'}>
                                        {alert.message}
                                    </span>
                                {/each}
                            </div>
                        {/if}
                    {/each}
                </div>
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
                {settings}
                maxAltitude={maxProfileAltitude}
                scale={profileScale}
                on:waypointClick={(e) => selectWaypointById(e.detail)}
            />
        {/if}
    {/if}

    <!-- Settings Tab -->
    {#if activeTab === 'settings' && flightPlan}
        <div class="settings-section">
            <div class="setting-group">
                <label class="setting-label">Default Airspeed (TAS)</label>
                <div class="setting-input">
                    <input
                        type="number"
                        bind:value={settings.defaultAirspeed}
                        on:change={handleSettingsChange}
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
                        bind:value={settings.defaultAltitude}
                        on:change={handleSettingsChange}
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
                        bind:checked={settings.allowDrag}
                        on:change={handleSettingsChange}
                    />
                    Allow waypoint dragging
                </label>
            </div>

            <div class="setting-group">
                <label class="setting-checkbox">
                    <input
                        type="checkbox"
                        bind:checked={settings.showLabels}
                        on:change={handleSettingsChange}
                    />
                    Show waypoint labels on map
                </label>
            </div>

            <div class="setting-group">
                <label class="setting-checkbox">
                    <input
                        type="checkbox"
                        bind:checked={settings.enableLogging}
                        on:change={handleSettingsChange}
                    />
                    Enable debug logging
                </label>
            </div>

            <div class="setting-info">
                <p>Tip: {settings.allowDrag ? 'Drag markers on map to reposition waypoints' : 'Enable dragging to reposition waypoints'}</p>
            </div>
        </div>
    {/if}
</section>

<script lang="ts">
    import bcast from '@windy/broadcast';
    import { map } from '@windy/map';
    import { singleclick } from '@windy/singleclick';
    import store from '@windy/store';
    import { onDestroy, onMount } from 'svelte';

    import config from './pluginConfig';
    import { readFPLFile, convertToFlightPlan, validateFPL } from './parsers/fplParser';
    import { calculateFlightPlanNavigation, formatDistance, formatBearing, formatEte, calculateGroundSpeed, formatHeadwind, calculateHeadwindComponent } from './services/navigationCalc';
    import { downloadGPX } from './exporters/gpxExporter';
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
    import { calculateProfileData, type SegmentCondition } from './services/profileService';
    import type { FlightPlan, Waypoint, WaypointType, PluginSettings } from './types';
    import { DEFAULT_SETTINGS } from './types';
    import AltitudeProfile from './components/AltitudeProfile.svelte';

    import type { LatLon } from '@windy/interfaces';

    const { name, title } = config;

    // Storage key for session persistence
    const STORAGE_KEY = `vfr-planner-session-${name}`;

    // State
    let flightPlan: FlightPlan | null = null;
    let selectedWaypointId: string | null = null;
    let isLoading = false;
    let isDragOver = false;
    let error: string | null = null;
    let fileInput: HTMLInputElement;
    let activeTab: 'route' | 'profile' | 'settings' = 'route';
    let isAddingWaypoint = false;

    // Weather state
    let weatherData: Map<string, WaypointWeather> = new Map();
    let weatherAlerts: Map<string, WeatherAlert[]> = new Map();
    let isLoadingWeather = false;
    let weatherError: string | null = null;

    // Departure time state
    let departureTime: number = Date.now();
    let forecastRange: ForecastTimeRange | null = null;
    let syncWithWindy: boolean = true;
    let isUpdatingFromWindy: boolean = false;
    let isUpdatingToWindy: boolean = false;

    // Settings
    let settings: PluginSettings = { ...DEFAULT_SETTINGS };

    // Profile state
    let maxProfileAltitude: number = 15000;
    let profileScale: number = 511;

    // Map layers
    let routeLayer: L.LayerGroup | null = null;
    let waypointMarkers: L.LayerGroup | null = null;
    let markerMap: Map<string, L.Marker> = new Map();

    /**
     * Get segment color based on VFR condition
     */
    function getSegmentColor(condition?: SegmentCondition): string {
        switch (condition) {
            case 'good':
                return '#4caf50'; // Green
            case 'marginal':
                return '#ff9800'; // Orange/Yellow
            case 'poor':
                return '#f44336'; // Red
            case 'unknown':
            default:
                return '#757575'; // Gray
        }
    }

    // Waypoint icons by type
    function getWaypointIcon(type: WaypointType): string {
        switch (type) {
            case 'AIRPORT': return '🛫';
            case 'VOR': return '📡';
            case 'NDB': return '📻';
            case 'INT':
            case 'INT-VRP': return '📍';
            case 'USER WAYPOINT':
            default: return '📌';
        }
    }

    function getMarkerColor(type: WaypointType): string {
        switch (type) {
            case 'AIRPORT': return '#e74c3c';
            case 'VOR': return '#3498db';
            case 'NDB': return '#9b59b6';
            case 'INT':
            case 'INT-VRP': return '#2ecc71';
            case 'USER WAYPOINT':
            default: return '#f39c12';
        }
    }

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
            const result = await readFPLFile(file);

            if (!result.success || !result.flightPlan) {
                error = result.error || 'Failed to parse file';
                isLoading = false;
                return;
            }

            const validation = validateFPL(result.flightPlan);
            if (!validation.valid) {
                error = validation.errors.map(e => e.message).join(', ');
                isLoading = false;
                return;
            }

            // Convert to internal format
            let plan = convertToFlightPlan(result.flightPlan, file.name);

            // Apply settings
            plan.aircraft.airspeed = settings.defaultAirspeed;
            plan.aircraft.defaultAltitude = settings.defaultAltitude;

            // Calculate navigation data
            const navResult = calculateFlightPlanNavigation(plan.waypoints, plan.aircraft.airspeed);
            plan = {
                ...plan,
                waypoints: navResult.waypoints,
                totals: navResult.totals,
            };

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
        isAddingWaypoint = false;
        activeTab = 'route';
        weatherData = new Map();
        weatherAlerts = new Map();
        weatherError = null;
        forecastRange = null;
        departureTime = Date.now();
        clearMapLayers();
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

    function deleteWaypoint(waypointId: string) {
        if (!flightPlan) return;

        const newWaypoints = flightPlan.waypoints.filter(wp => wp.id !== waypointId);

        if (newWaypoints.length === 0) {
            clearFlightPlan();
            return;
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
        if (!flightPlan || !settings.allowDrag) return;

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

    function toggleAddWaypoint() {
        isAddingWaypoint = !isAddingWaypoint;
    }

    function handleMapClick(latLon: LatLon) {
        if (!isAddingWaypoint || !flightPlan) return;

        const { lat, lon } = latLon;

        // Create new waypoint
        const newWaypoint: Waypoint = {
            id: `wp-${Date.now()}`,
            name: `WPT${flightPlan.waypoints.length + 1}`,
            type: 'USER WAYPOINT',
            lat,
            lon,
        };

        const newWaypoints = [...flightPlan.waypoints, newWaypoint];

        // Recalculate navigation
        const navResult = calculateFlightPlanNavigation(newWaypoints, settings.defaultAirspeed);

        flightPlan = {
            ...flightPlan,
            waypoints: navResult.waypoints,
            totals: navResult.totals,
        };

        isAddingWaypoint = false;
        updateMapLayers();
        saveSession();
    }

    function handleSettingsChange() {
        if (!flightPlan) return;

        // Update aircraft settings
        flightPlan.aircraft.airspeed = settings.defaultAirspeed;
        flightPlan.aircraft.defaultAltitude = settings.defaultAltitude;

        // Recalculate navigation with new airspeed
        const navResult = calculateFlightPlanNavigation(flightPlan.waypoints, settings.defaultAirspeed);

        flightPlan = {
            ...flightPlan,
            waypoints: navResult.waypoints,
            totals: navResult.totals,
        };

        updateMapLayers();
        saveSession();
    }

    function handleExportGPX() {
        if (!flightPlan) return;
        downloadGPX(flightPlan);
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

            // Check for alerts at each waypoint
            weatherAlerts = new Map();
            weatherData.forEach((wx, waypointId) => {
                const alerts = checkWeatherAlerts(wx, DEFAULT_ALERT_THRESHOLDS, plannedAltitude);
                if (alerts.length > 0) {
                    weatherAlerts.set(waypointId, alerts);
                }
            });

            // Recalculate navigation with wind corrections
            recalculateWithWind();

            // Update map tooltips with the new weather data
            updateMapLayers();
        } catch (err) {
            weatherError = err instanceof Error ? err.message : 'Failed to fetch weather';
            console.error('[VFR Planner] Error fetching weather:', err);
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

                // Recalculate ETE with ground speed
                const distance = wp.distance || 0;
                const ete = gs > 0 ? (distance / gs) * 60 : 0; // minutes

                return {
                    ...wp,
                    groundSpeed: gs,
                    ete,
                };
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

    // Map layer management
    function updateMapLayers() {
        clearMapLayers();

        if (!flightPlan || flightPlan.waypoints.length === 0) return;

        // Calculate profile data to get segment conditions
        const profileData = calculateProfileData(
            flightPlan.waypoints,
            weatherData,
            flightPlan.aircraft.defaultAltitude
        );

        // Create route with color-coded segments
        routeLayer = new L.LayerGroup();

        // Create a polyline segment for each pair of waypoints
        for (let i = 0; i < flightPlan.waypoints.length - 1; i++) {
            const wp1 = flightPlan.waypoints[i];
            const wp2 = flightPlan.waypoints[i + 1];
            const condition = profileData[i]?.condition;

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

            routeLayer.addLayer(segment);
        }

        map.addLayer(routeLayer);

        // Create waypoint markers
        waypointMarkers = new L.LayerGroup();
        markerMap.clear();

        flightPlan.waypoints.forEach((wp, index) => {
            let marker: L.Marker | L.CircleMarker;

            if (settings.allowDrag) {
                // Use regular marker for dragging
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

            // Add weather data if available (matching Route Panel display)
            const wx = getWaypointWeather(wp.id);
            if (wx) {
                tooltipContent += '<br/><div style="margin-top: 4px;">';
                tooltipContent += `💨 ${formatWind(wx.windSpeed, wx.windDir, wx.windAltitude)}`;
                tooltipContent += ` | 🌡️ ${formatTemperature(wx.temperature)}`;
                tooltipContent += ` | ☁️ ${wx.cloudBaseDisplay ?? 'N/A'}`;
                tooltipContent += '</div>';
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
            const pointData = profileData[index];
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

            marker.bindTooltip(tooltipContent, {
                permanent: false,
                direction: 'top',
            });

            marker.on('click', () => {
                selectedWaypointId = wp.id;
            });

            waypointMarkers?.addLayer(marker);
        });

        map.addLayer(waypointMarkers);
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
                version: '1.0', // For future migration
            };
            localStorage.setItem(STORAGE_KEY, JSON.stringify(sessionData));
        } catch (error) {
            console.warn('[VFR Planner] Failed to save session:', error);
        }
    }

    function loadSession() {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (!saved) return;

            const sessionData = JSON.parse(saved);
            
            // Restore settings
            if (sessionData.settings) {
                settings = { ...DEFAULT_SETTINGS, ...sessionData.settings };
            }

            // Restore departure time and sync setting
            if (sessionData.departureTime) {
                departureTime = sessionData.departureTime;
            }
            if (typeof sessionData.syncWithWindy === 'boolean') {
                syncWithWindy = sessionData.syncWithWindy;
            }
            if (sessionData.activeTab) {
                activeTab = sessionData.activeTab;
            }
            if (typeof sessionData.maxProfileAltitude === 'number') {
                maxProfileAltitude = sessionData.maxProfileAltitude;
            }
            if (typeof sessionData.profileScale === 'number') {
                profileScale = sessionData.profileScale;
            }

            // Restore flight plan
            if (sessionData.flightPlan) {
                const restoredPlan: FlightPlan = {
                    ...sessionData.flightPlan,
                    departureTime: sessionData.flightPlan.departureTime 
                        ? new Date(sessionData.flightPlan.departureTime) 
                        : undefined,
                    waypoints: sessionData.flightPlan.waypoints.map((wp: any) => ({
                        ...wp,
                        eta: wp.eta ? new Date(wp.eta) : undefined,
                    })),
                };
                flightPlan = restoredPlan;
                updateMapLayers();
                fitMapToRoute();
            }
        } catch (error) {
            console.warn('[VFR Planner] Failed to load session:', error);
            // Clear corrupted session data
            localStorage.removeItem(STORAGE_KEY);
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

    onMount(() => {
        singleclick.on(name, handleMapClick);
        // Listen to Windy's timeline changes
        store.on('timestamp', handleWindyTimestampChange);
    });

    onDestroy(() => {
        clearMapLayers();
        singleclick.off(name, handleMapClick);
        // Clean up Windy timestamp listener
        store.off('timestamp', handleWindyTimestampChange);
    });
</script>

<style lang="less">
    .tabs {
        display: flex;
        padding: 0 10px;
        gap: 4px;
        margin-bottom: 10px;
    }

    .tab {
        flex: 1;
        padding: 8px 12px;
        background: rgba(255, 255, 255, 0.05);
        border: none;
        border-radius: 4px;
        color: rgba(255, 255, 255, 0.7);
        cursor: pointer;
        font-size: 13px;
        transition: all 0.15s ease;

        &:hover {
            background: rgba(255, 255, 255, 0.1);
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

        &:hover {
            border-color: rgba(255, 255, 255, 0.5);
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

    .btn-browse {
        margin-top: 8px;
        padding: 6px 16px;
        background: #3498db;
        border: none;
        border-radius: 4px;
        color: white;
        cursor: pointer;
        font-size: 13px;

        &:hover {
            background: #2980b9;
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
    }

    .btn-clear {
        padding: 4px 8px;
        background: rgba(255, 255, 255, 0.1);
        border: none;
        border-radius: 4px;
        color: rgba(255, 255, 255, 0.7);
        cursor: pointer;

        &:hover {
            background: rgba(231, 76, 60, 0.3);
            color: #e74c3c;
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
        background: rgba(255, 255, 255, 0.1);
        border: none;
        border-radius: 4px;
        color: rgba(255, 255, 255, 0.6);
        cursor: pointer;
        font-size: 10px;
        transition: all 0.15s ease;

        &:hover {
            background: rgba(255, 255, 255, 0.15);
            color: rgba(255, 255, 255, 0.8);
        }

        &.active {
            background: rgba(39, 174, 96, 0.3);
            color: #27ae60;
        }
    }

    .action-buttons {
        display: flex;
        gap: 8px;
        padding: 0 10px 10px;
    }

    .btn-action {
        flex: 1;
        padding: 8px 12px;
        background: rgba(255, 255, 255, 0.1);
        border: none;
        border-radius: 4px;
        color: rgba(255, 255, 255, 0.9);
        cursor: pointer;
        font-size: 12px;
        transition: all 0.15s ease;

        &:hover {
            background: rgba(255, 255, 255, 0.15);
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
    }

    .weather-error {
        margin: 0 10px 10px;
        padding: 8px;
        background: rgba(231, 76, 60, 0.2);
        border-radius: 4px;
        color: #e74c3c;
        font-size: 12px;
    }

    .waypoint-section {
        padding: 0 10px 10px;
    }

    .section-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 8px 0;
        font-size: 12px;
        color: rgba(255, 255, 255, 0.7);
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    }

    .totals {
        font-weight: 500;
        color: #3498db;
    }

    .waypoint-table {
        max-height: 350px;
        overflow-y: auto;
    }

    .waypoint-row {
        display: flex;
        align-items: center;
        padding: 8px 4px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        cursor: pointer;
        transition: background 0.15s ease;

        &:hover {
            background: rgba(255, 255, 255, 0.05);

            .btn-delete {
                opacity: 1;
            }
        }

        &.selected {
            background: rgba(52, 152, 219, 0.2);
        }

        &.has-warning {
            border-left: 3px solid #e74c3c;
        }

        &.has-caution:not(.has-warning) {
            border-left: 3px solid #f39c12;
        }
    }

    .wp-index {
        width: 24px;
        font-size: 11px;
        color: rgba(255, 255, 255, 0.5);
        text-align: center;
    }

    .wp-info {
        flex: 1;
        min-width: 0;
    }

    .wp-name {
        display: flex;
        align-items: center;
        gap: 6px;
        font-weight: 500;
    }

    .wp-type-icon {
        font-size: 14px;
    }

    .wp-comment {
        font-size: 11px;
        color: rgba(255, 255, 255, 0.5);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }

    .wp-weather {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        margin-top: 4px;
        font-size: 10px;
        color: rgba(255, 255, 255, 0.7);
    }

    .wx-wind, .wx-temp, .wx-cloud {
        display: inline-flex;
        align-items: center;
        gap: 2px;
    }

    .wx-cloud.clickable {
        cursor: pointer;
        text-decoration: underline;
        opacity: 0.9;

        &:hover {
            opacity: 1;
            color: #3498db;
        }
    }

    .alert-badge {
        font-size: 12px;
        margin-left: 4px;

        &.warning {
            animation: pulse 1s ease-in-out infinite;
        }
    }

    @keyframes pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.5; }
    }

    .alert-row {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
        padding: 4px 4px 8px 28px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.05);
    }

    .alert-item {
        display: inline-block;
        padding: 2px 6px;
        background: rgba(243, 156, 18, 0.2);
        border-radius: 3px;
        font-size: 10px;
        color: #f39c12;

        &.warning {
            background: rgba(231, 76, 60, 0.2);
            color: #e74c3c;
        }
    }

    .wp-nav {
        text-align: right;
        font-size: 11px;
        min-width: 60px;
    }

    .wp-bearing {
        color: rgba(255, 255, 255, 0.7);
    }

    .wp-distance {
        color: #3498db;
    }

    .wp-gs {
        color: #27ae60;
        font-weight: 500;
    }

    .btn-delete {
        padding: 4px 6px;
        background: transparent;
        border: none;
        color: rgba(255, 255, 255, 0.3);
        cursor: pointer;
        opacity: 0;
        transition: all 0.15s ease;
        font-size: 12px;

        &:hover {
            color: #e74c3c;
        }
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
</style>
