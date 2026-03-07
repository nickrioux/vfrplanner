<!--
    MobileLayout - Root phone layout component
    Renders BottomSheet, FAB, crosshair overlay, and landscape profile mode
-->
<script lang="ts">
    import { createEventDispatcher } from 'svelte';
    import type { FlightPlan, Waypoint, PluginSettings } from '../../types';
    import type { WaypointWeather, WeatherAlert, ForecastTimeRange } from '../../services/weatherService';
    import type { ElevationPoint } from '../../services/elevationService';
    import type { VFRWindow } from '../../services/vfrWindowService';
    import type { MinimumConditionLevel } from '../../types/vfrWindow';
    import { uiStore } from '../../stores/uiStore';
    import BottomSheet from './BottomSheet.svelte';
    import RouteSummaryBar from './RouteSummaryBar.svelte';
    import TimelineList from './TimelineList.svelte';
    import CrosshairOverlay from './CrosshairOverlay.svelte';
    import FloatingActionButton from './FloatingActionButton.svelte';
    import LandscapeProfile from './LandscapeProfile.svelte';
    import DepartureSlider from '../DepartureSlider.svelte';
    import AltitudeProfile from '../AltitudeProfile.svelte';
    import SettingsPanel from '../SettingsPanel.svelte';
    import ConditionsModal from '../ConditionsModal.svelte';
    import AircraftConfigModal from '../AircraftConfigModal.svelte';
    import AboutTab from '../AboutTab.svelte';
    import type { VfrConditionThresholds } from '../../types/conditionThresholds';
    import type { AircraftPerformance } from '../../types/settings';
    import config from '../../pluginConfig';

    // Props
    export let flightPlan: FlightPlan | null;
    export let weatherData: Map<string, WaypointWeather>;
    export let weatherAlerts: Map<string, WeatherAlert[]>;
    export let settings: PluginSettings;
    export let selectedWaypointId: string | null;
    export let editingWaypointId: string | null;
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

    const dispatch = createEventDispatcher();

    $: uiState = $uiStore;
    $: isLandscapeProfile = uiState.isLandscapeProfileMode && flightPlan && flightPlan.waypoints.length >= 2;
    $: isCrosshairActive = uiState.isCrosshairMode;
    $: sheetPosition = uiState.bottomSheetPosition;

    let mobileActiveTab: 'route' | 'profile' | 'settings' | 'about' = 'route';
    let showConditionsModal = false;
    let showAircraftConfig = false;
    let showExportMenu = false;

    function handleAddWaypoint() {
        uiStore.setCrosshairMode(true);
    }

    function handleConditionsSave(e: CustomEvent<VfrConditionThresholds>) {
        dispatch('conditionsSave', e.detail);
        showConditionsModal = false;
    }

    function handleConditionsCancel() {
        dispatch('conditionsCancel');
        showConditionsModal = false;
    }

    function handleAircraftConfigSave(e: CustomEvent<AircraftPerformance>) {
        dispatch('aircraftConfigSave', e.detail);
        showAircraftConfig = false;
    }

    function handleAircraftConfigCancel() {
        showAircraftConfig = false;
    }
</script>

<div class="mobile-layout">
    {#if isLandscapeProfile}
        <LandscapeProfile
            {flightPlan}
            {weatherData}
            {elevationProfile}
            {settings}
            {maxProfileAltitude}
            {profileScale}
            on:waypointClick
            on:close={() => uiStore.setLandscapeProfileMode(false)}
        />
    {:else}
        <!-- Crosshair overlay for adding waypoints -->
        {#if isCrosshairActive}
            <CrosshairOverlay
                on:confirm
                on:cancel={() => uiStore.setCrosshairMode(false)}
            />
        {/if}

        <!-- Floating Action Button -->
        {#if flightPlan && isEditMode && !isCrosshairActive && sheetPosition !== 'expanded'}
            <FloatingActionButton on:click={handleAddWaypoint} />
        {/if}

        <!-- Bottom Sheet -->
        <BottomSheet position={sheetPosition} on:positionChange={(e) => uiStore.setBottomSheetPosition(e.detail)}>
            <svelte:fragment slot="collapsed">
                <RouteSummaryBar
                    {flightPlan}
                    {weatherAlerts}
                />
            </svelte:fragment>

            <svelte:fragment slot="content">
                {#if !flightPlan}
                    <!-- Import section (inline for mobile) -->
                    <div class="mobile-import-section">
                        <input
                            type="file"
                            accept=".fpl,.xml,.gpx,application/xml,text/xml,application/gpx+xml,*/*"
                            on:change={(e) => { if (e.currentTarget.files?.[0]) dispatch('fileSelect', e.currentTarget.files[0]); }}
                            style="display: none"
                            id="mobile-file-input"
                        />
                        {#if isLoading}
                            <div class="mobile-loading">Loading...</div>
                        {:else}
                            <div class="mobile-import-content">
                                <span class="mobile-import-icon">✈️</span>
                                <p>Drop .fpl/.gpx file or</p>
                                <div class="mobile-import-buttons">
                                    <button class="mobile-import-btn" on:click={() => document.getElementById('mobile-file-input')?.click()}>
                                        Browse...
                                    </button>
                                    <button class="mobile-import-btn mobile-import-btn--new" on:click={() => dispatch('createNewFlightPlan')}>
                                        New Plan
                                    </button>
                                </div>
                            </div>
                        {/if}
                        {#if error}
                            <div class="mobile-error">{error}</div>
                        {/if}
                    </div>
                {:else}
                    <!-- Tab navigation -->
                    <div class="mobile-tabs">
                        <button
                            class="mobile-tab"
                            class:active={mobileActiveTab === 'route'}
                            on:click={() => mobileActiveTab = 'route'}
                        >Route</button>
                        <button
                            class="mobile-tab"
                            class:active={mobileActiveTab === 'profile'}
                            on:click={() => mobileActiveTab = 'profile'}
                            disabled={!flightPlan || flightPlan.waypoints.length < 2}
                        >Profile</button>
                        <button
                            class="mobile-tab"
                            class:active={mobileActiveTab === 'settings'}
                            on:click={() => mobileActiveTab = 'settings'}
                        >Settings</button>
                        <button
                            class="mobile-tab"
                            class:active={mobileActiveTab === 'about'}
                            on:click={() => mobileActiveTab = 'about'}
                        >About</button>
                    </div>

                    {#if mobileActiveTab === 'route'}
                        <!-- Mobile action buttons (inline) -->
                        <div class="mobile-actions">
                            <div class="mobile-action-row">
                                <button
                                    class="mobile-btn"
                                    class:has-alerts={weatherAlerts.size > 0}
                                    on:click={() => dispatch('readWeather')}
                                    disabled={isLoadingWeather}
                                >
                                    {#if isLoadingWeather}⏳{:else}🌤️ Wx{/if}
                                </button>
                                <button class="mobile-btn" on:click={() => dispatch('reverseRoute')}>🔄</button>
                                <button
                                    class="mobile-btn"
                                    class:active={isEditMode}
                                    on:click={() => dispatch('toggleEditMode')}
                                >
                                    {isEditMode ? '✏️ Done' : '✏️ Edit'}
                                </button>
                                <div class="mobile-export-dropdown">
                                    <button class="mobile-btn" on:click|stopPropagation={() => showExportMenu = !showExportMenu}>
                                        📥 {showExportMenu ? '▴' : '▾'}
                                    </button>
                                    {#if showExportMenu}
                                        <div class="mobile-export-backdrop" on:click={() => showExportMenu = false}></div>
                                        <div class="mobile-export-menu">
                                            <button on:click={() => { dispatch('exportGPX'); showExportMenu = false; }}>📄 GPX file</button>
                                            <button on:click={() => { dispatch('exportFPL'); showExportMenu = false; }}>📄 FPL file (ForeFlight)</button>
                                            <button on:click={() => { dispatch('sendToDistancePlanning'); showExportMenu = false; }}>🗺️ Windy Distance</button>
                                        </div>
                                    {/if}
                                </div>
                            </div>
                        </div>

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

                        <!-- Timeline waypoint list -->
                        {#if flightPlan.waypoints.length > 0}
                            <TimelineList
                                {flightPlan}
                                {weatherData}
                                {weatherAlerts}
                                {settings}
                                {selectedWaypointId}
                                on:selectWaypoint
                                on:deleteWaypoint
                                on:moveWaypointUp
                                on:moveWaypointDown
                            />
                        {/if}
                    {:else if mobileActiveTab === 'profile' && flightPlan && flightPlan.waypoints.length >= 2}
                        {#if weatherData.size === 0}
                            <div class="mobile-profile-empty">
                                <p>Tap "Read Wx" to fetch weather data before viewing the profile.</p>
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
                    {:else if mobileActiveTab === 'settings' && flightPlan}
                        <SettingsPanel
                            bind:maxProfileAltitude
                            {flightPlan}
                            conditionPreset={settings.conditionPreset}
                            on:change={(e) => dispatch('settingsChange')}
                            on:profileAltitudeChange
                            on:openConditionsModal={() => showConditionsModal = true}
                            on:configureAircraft={() => showAircraftConfig = true}
                            on:presetChange
                        />
                    {:else if mobileActiveTab === 'about' && flightPlan}
                        <AboutTab version={config.version} />
                    {/if}
                {/if}
            </svelte:fragment>
        </BottomSheet>

        <!-- Conditions Modal (rendered outside BottomSheet for correct z-index) -->
        <ConditionsModal
            visible={showConditionsModal}
            thresholds={settings.customThresholds}
            on:save={handleConditionsSave}
            on:cancel={handleConditionsCancel}
        />

        <AircraftConfigModal
            visible={showAircraftConfig}
            performance={settings.aircraftPerformance}
            on:save={handleAircraftConfigSave}
            on:cancel={handleAircraftConfigCancel}
        />
    {/if}
</div>

<style lang="less">
    .mobile-layout {
        position: relative;
        width: 100%;
        height: 100%;
        pointer-events: none;

        > :global(*) {
            pointer-events: auto;
        }
    }

    .mobile-import-section {
        padding: 16px;
    }

    .mobile-tabs {
        display: flex;
        gap: 4px;
        padding: 8px 12px;
        position: sticky;
        top: 0;
        background: rgba(30, 30, 46, 0.95);
        z-index: 1;
    }

    .mobile-tab {
        flex: 1;
        padding: 10px 8px;
        min-height: 44px;
        background: rgba(255, 255, 255, 0.05);
        border: none;
        border-radius: 8px;
        color: rgba(255, 255, 255, 0.7);
        cursor: pointer;
        font-size: 14px;
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

    .mobile-actions {
        padding: 8px 12px;
    }

    .mobile-action-row {
        display: flex;
        gap: 6px;
    }

    .mobile-btn {
        flex: 1;
        padding: 10px 6px;
        min-height: 44px;
        background: rgba(255, 255, 255, 0.1);
        border: none;
        border-radius: 8px;
        color: rgba(255, 255, 255, 0.9);
        cursor: pointer;
        font-size: 13px;
        touch-action: manipulation;
        -webkit-tap-highlight-color: transparent;

        &:active:not(:disabled) { transform: scale(0.97); }
        &:disabled { opacity: 0.6; cursor: not-allowed; }
        &.has-alerts {
            background: rgba(243, 156, 18, 0.3);
            border: 1px solid #f39c12;
        }
        &.active {
            background: #27ae60;
            color: white;
        }
    }

    .mobile-export-dropdown {
        position: relative;
        flex: 1;

        > .mobile-btn { width: 100%; flex: none; }
    }

    .mobile-export-backdrop {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        z-index: 99;
    }

    .mobile-export-menu {
        position: absolute;
        bottom: 100%;
        left: 0;
        right: 0;
        margin-bottom: 4px;
        background: #2a2a2a;
        border: 1px solid #444;
        border-radius: 8px;
        box-shadow: 0 -4px 12px rgba(0, 0, 0, 0.4);
        z-index: 100;
        overflow: hidden;

        button {
            display: block;
            width: 100%;
            padding: 12px;
            min-height: 44px;
            background: transparent;
            border: none;
            color: rgba(255, 255, 255, 0.9);
            font-size: 14px;
            text-align: left;
            cursor: pointer;
            touch-action: manipulation;
            -webkit-tap-highlight-color: transparent;

            &:active { background: rgba(255, 255, 255, 0.1); }
            &:not(:last-child) { border-bottom: 1px solid #444; }
        }
    }

    .mobile-loading {
        padding: 20px;
        text-align: center;
        color: #3498db;
    }

    .mobile-import-content {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 8px;
        padding: 20px;
        text-align: center;
        color: rgba(255, 255, 255, 0.8);
    }

    .mobile-import-icon {
        font-size: 40px;
    }

    .mobile-import-buttons {
        display: flex;
        gap: 10px;
        margin-top: 8px;
    }

    .mobile-import-btn {
        padding: 12px 24px;
        min-height: 48px;
        background: #3498db;
        border: none;
        border-radius: 10px;
        color: white;
        font-size: 15px;
        cursor: pointer;
        touch-action: manipulation;

        &--new {
            background: #27ae60;
        }

        &:active { transform: scale(0.97); }
    }

    .mobile-error {
        margin-top: 10px;
        padding: 8px;
        background: rgba(231, 76, 60, 0.2);
        border-radius: 6px;
        color: #e74c3c;
        font-size: 12px;
        text-align: center;
    }

    .mobile-profile-empty {
        padding: 24px;
        text-align: center;
        color: rgba(255, 255, 255, 0.7);
        font-size: 14px;

        p { margin: 0; }
    }
</style>
