<!--
    WaypointTable Component
    Displays the list of waypoints with weather data, navigation info, and editing controls
-->
<script lang="ts">
    import { createEventDispatcher } from 'svelte';
    import type { FlightPlan, Waypoint, PluginSettings } from '../types';
    import type { WaypointWeather, WeatherAlert } from '../services/weatherService';
    import { formatDistance, formatBearing, formatEte, formatHeadwind } from '../services/navigationCalc';
    import { formatWind, formatTemperature, getCbaseTable } from '../services/weatherService';
    import { getWaypointIcon, getBestRunway } from '../utils/displayUtils';
    import { logger } from '../services/logger';

    // Props
    export let flightPlan: FlightPlan;
    export let weatherData: Map<string, WaypointWeather>;
    export let weatherAlerts: Map<string, WeatherAlert[]>;
    export let settings: PluginSettings;
    export let selectedWaypointId: string | null = null;
    export let editingWaypointId: string | null = null;
    export let editingWaypointAltitudeId: string | null = null;
    export let ceilingDataReliable: boolean = true; // False when non-ECMWF model is used

    const dispatch = createEventDispatcher<{
        selectWaypoint: Waypoint;
        startEditWaypointName: string;
        finishEditWaypointName: { waypointId: string; newName: string };
        cancelEditWaypointName: void;
        startEditWaypointAltitude: string;
        finishEditWaypointAltitude: { waypointId: string; newAltitude: string };
        cancelEditWaypointAltitude: void;
        moveWaypointUp: string;
        moveWaypointDown: string;
        deleteWaypoint: string;
    }>();

    // Helper functions
    function getWaypointWeather(waypointId: string): WaypointWeather | undefined {
        return weatherData.get(waypointId);
    }

    function getWaypointAlerts(waypointId: string): WeatherAlert[] {
        return weatherAlerts.get(waypointId) || [];
    }

    function getWaypointAltitude(wp: Waypoint): number {
        return wp.altitude ?? flightPlan?.aircraft.defaultAltitude ?? settings.defaultAltitude;
    }

    // Event handlers
    function handleSelectWaypoint(wp: Waypoint) {
        dispatch('selectWaypoint', wp);
    }

    function handleStartEditWaypointName(waypointId: string) {
        dispatch('startEditWaypointName', waypointId);
    }

    function handleFinishEditWaypointName(waypointId: string, newName: string) {
        dispatch('finishEditWaypointName', { waypointId, newName });
    }

    function handleStartEditWaypointAltitude(waypointId: string) {
        dispatch('startEditWaypointAltitude', waypointId);
    }

    function handleFinishEditWaypointAltitude(waypointId: string, newAltitude: string) {
        dispatch('finishEditWaypointAltitude', { waypointId, newAltitude });
    }

    function handleMoveWaypointUp(waypointId: string) {
        dispatch('moveWaypointUp', waypointId);
    }

    function handleMoveWaypointDown(waypointId: string) {
        dispatch('moveWaypointDown', waypointId);
    }

    function handleDeleteWaypoint(waypointId: string) {
        dispatch('deleteWaypoint', waypointId);
    }

    function handleCbaseClick(wp: Waypoint) {
        getCbaseTable(wp.lat, wp.lon, wp.name, settings.enableLogging);
    }
</script>

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
                on:click={() => handleSelectWaypoint(wp)}
            >
                <div class="wp-index">{index + 1}</div>
                <div class="wp-info">
                    <div class="wp-name">
                        <span class="wp-type-icon">{getWaypointIcon(wp.type)}</span>
                        {#if editingWaypointId === wp.id}
                            <input
                                type="text"
                                class="wp-name-input"
                                value={wp.name}
                                on:blur={(e) => handleFinishEditWaypointName(wp.id, e.currentTarget.value)}
                                on:keydown={(e) => {
                                    if (e.key === 'Enter') handleFinishEditWaypointName(wp.id, e.currentTarget.value);
                                    if (e.key === 'Escape') dispatch('cancelEditWaypointName');
                                }}
                                on:click|stopPropagation
                                autofocus
                            />
                        {:else}
                            <span
                                class="wp-name-text"
                                on:click|stopPropagation={() => handleStartEditWaypointName(wp.id)}
                                title="Click to rename"
                            >{wp.name}</span>
                        {/if}
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
                            <span class="wx-wind" title={wx.windAltitude ? `Wind at ${Math.round(wx.windAltitude)}ft (${wx.windLevel || 'surface'})` : 'Surface wind'}>💨 {formatWind(wx.windSpeed, wx.windDir, wx.windAltitude)}{#if wx.windLevel && wx.windLevel !== 'surface'} <small style="opacity: 0.7;">({wx.windLevel})</small>{/if}</span>
                            <span class="wx-temp" title="Temperature">🌡️ {formatTemperature(wx.temperature)}</span>
                            <span
                                class="wx-cloud"
                                class:clickable={wx.cloudBase !== undefined}
                                class:na={!ceilingDataReliable && wx.cloudBaseDisplay === 'CLR'}
                                title={wx.cloudBase !== undefined ? 'Click to view full cbase table in console' : (ceilingDataReliable ? 'Clear sky' : 'Ceiling data requires ECMWF model')}
                                on:click={() => {
                                    if (wx.cloudBase !== undefined && wp) {
                                        handleCbaseClick(wp);
                                    }
                                }}
                            >
                                ☁️ {#if !ceilingDataReliable && wx.cloudBaseDisplay === 'CLR'}N/A{:else}{wx.cloudBaseDisplay ?? 'CLR'}{/if}
                            </span>
                        </div>
                        <!-- Best runway info for terminal waypoints -->
                        {#if (index === 0 || index === flightPlan.waypoints.length - 1) && wp.runways && wp.runways.length > 0}
                            {@const surfaceWind = { speed: wx.surfaceWindSpeed ?? wx.windSpeed, dir: wx.surfaceWindDir ?? wx.windDir }}
                            {@const bestRwy = getBestRunway(wp.runways, surfaceWind.dir, surfaceWind.speed, wx.windGust)}
                            {@const _ = settings.enableLogging && logger.debug(`[WaypointTable] ${wp.name}: windGust=${wx.windGust}, bestRwy.gustCrosswindKt=${bestRwy?.gustCrosswindKt}, bestRwy.gustHeadwindKt=${bestRwy?.gustHeadwindKt}`)}
                            {@const gustInfo = wx.windGust ? ` | Gust: ${Math.round(wx.windGust)}kt` : ''}
                            {@const surfaceWindTooltip = `Surface wind: ${Math.round(surfaceWind.dir)}° @ ${Math.round(surfaceWind.speed)}kt${gustInfo}`}
                            {#if bestRwy}
                                <div class="wp-runway" title={surfaceWindTooltip}>
                                    <span class="rwy-label">🛬</span>
                                    <span class="rwy-best" title="Best runway for current wind">Rwy {bestRwy.runwayIdent}</span>
                                    <span class="rwy-xwind" class:warning={bestRwy.crosswindKt > 15} class:danger={bestRwy.crosswindKt > 20}
                                        title={`Crosswind on Rwy ${bestRwy.runwayIdent}${bestRwy.gustCrosswindKt ? ` (gust: ${Math.round(bestRwy.gustCrosswindKt)}kt)` : ''}`}>
                                        Xwind {Math.round(bestRwy.crosswindKt)}{#if bestRwy.gustCrosswindKt}<span class="gust-component">G{Math.round(bestRwy.gustCrosswindKt)}</span>{/if}kt
                                    </span>
                                    {#if bestRwy.headwindKt < 0}
                                        <span class="rwy-tailwind" class:warning={bestRwy.headwindKt < -10}
                                            title={`Tailwind${bestRwy.gustHeadwindKt && bestRwy.gustHeadwindKt < 0 ? ` (gust: ${Math.round(Math.abs(bestRwy.gustHeadwindKt))}kt)` : ''}`}>
                                            Tail {Math.round(Math.abs(bestRwy.headwindKt))}{#if bestRwy.gustHeadwindKt && bestRwy.gustHeadwindKt < 0}<span class="gust-component">G{Math.round(Math.abs(bestRwy.gustHeadwindKt))}</span>{/if}kt
                                        </span>
                                    {:else}
                                        <span class="rwy-headwind" title={`Headwind${bestRwy.gustHeadwindKt && bestRwy.gustHeadwindKt >= 0 ? ` (gust: ${Math.round(bestRwy.gustHeadwindKt)}kt)` : ''}`}>
                                            Head {Math.round(bestRwy.headwindKt)}{#if bestRwy.gustHeadwindKt && bestRwy.gustHeadwindKt >= 0}<span class="gust-component">G{Math.round(bestRwy.gustHeadwindKt)}</span>{/if}kt
                                        </span>
                                    {/if}
                                </div>
                            {/if}
                        {/if}
                    {/if}
                    <div class="wp-altitude">
                        <span class="altitude-label">✈️</span>
                        {#if editingWaypointAltitudeId === wp.id}
                            <input
                                type="number"
                                class="wp-altitude-input"
                                value={getWaypointAltitude(wp)}
                                min="0"
                                max="45000"
                                step="500"
                                on:blur={(e) => handleFinishEditWaypointAltitude(wp.id, e.currentTarget.value)}
                                on:keydown={(e) => {
                                    if (e.key === 'Enter') handleFinishEditWaypointAltitude(wp.id, e.currentTarget.value);
                                    if (e.key === 'Escape') dispatch('cancelEditWaypointAltitude');
                                }}
                                on:click|stopPropagation
                                autofocus
                            />
                            <span class="altitude-unit">ft</span>
                        {:else}
                            <span
                                class="wp-altitude-text"
                                class:is-custom={wp.altitude !== undefined}
                                on:click|stopPropagation={() => handleStartEditWaypointAltitude(wp.id)}
                                title="Click to change altitude"
                            >{getWaypointAltitude(wp).toLocaleString()} ft</span>
                        {/if}
                    </div>
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
                <div class="wp-actions">
                    <button
                        class="btn-move"
                        on:click|stopPropagation={() => handleMoveWaypointUp(wp.id)}
                        title="Move up"
                        disabled={index === 0}
                    >▲</button>
                    <button
                        class="btn-move"
                        on:click|stopPropagation={() => handleMoveWaypointDown(wp.id)}
                        title="Move down"
                        disabled={index === flightPlan.waypoints.length - 1}
                    >▼</button>
                    <button
                        class="btn-delete"
                        on:click|stopPropagation={() => handleDeleteWaypoint(wp.id)}
                        title="Delete waypoint"
                    >🗑</button>
                </div>
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

<style lang="less">
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
        min-height: 44px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        cursor: pointer;
        transition: background 0.15s ease;
        touch-action: manipulation;
        -webkit-tap-highlight-color: transparent;

        &:hover,
        &:active {
            background: rgba(255, 255, 255, 0.05);

            .btn-move, .btn-delete {
                opacity: 1;
            }
        }

        &:focus {
            outline: 2px solid rgba(52, 152, 219, 0.5);
            outline-offset: -2px;
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

    .wp-name-text {
        cursor: pointer;
        padding: 2px 4px;
        min-height: 44px;
        display: inline-flex;
        align-items: center;
        border-radius: 3px;
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

    .wp-name-input {
        background: rgba(0, 0, 0, 0.3);
        border: 1px solid #3498db;
        border-radius: 3px;
        color: white;
        font-size: 13px;
        font-weight: 500;
        padding: 2px 6px;
        width: 120px;
        outline: none;
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

    .wp-runway {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
        margin-top: 4px;
        font-size: 10px;
        color: rgba(255, 255, 255, 0.8);
        background: rgba(52, 152, 219, 0.15);
        padding: 3px 6px;
        border-radius: 4px;
        align-items: center;

        .rwy-label {
            font-size: 11px;
        }

        .rwy-best {
            font-weight: 600;
            color: #3498db;
        }

        .rwy-xwind {
            &.warning {
                color: #f39c12;
            }
            &.danger {
                color: #e74c3c;
                font-weight: 600;
            }
        }

        .rwy-headwind {
            color: #2ecc71;
        }

        .rwy-tailwind {
            color: #e67e22;
            &.warning {
                color: #e74c3c;
            }
        }

        .rwy-gust {
            color: #9b59b6;
            font-weight: 500;
            &.warning {
                color: #f39c12;
            }
            &.danger {
                color: #e74c3c;
                font-weight: 600;
            }
        }

        .gust-component {
            color: #9b59b6;
            font-weight: 600;
            margin-left: 1px;
        }
    }

    .wp-altitude {
        display: flex;
        align-items: center;
        gap: 4px;
        margin-top: 4px;
        font-size: 11px;
        color: rgba(255, 255, 255, 0.7);
    }

    .altitude-label {
        font-size: 12px;
    }

    .wp-altitude-text {
        cursor: pointer;
        padding: 1px 4px;
        min-height: 44px;
        display: inline-flex;
        align-items: center;
        border-radius: 3px;
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

        &.is-custom {
            color: #3498db;
            font-weight: 500;
        }
    }

    .wp-altitude-input {
        width: 70px;
        background: rgba(0, 0, 0, 0.3);
        border: 1px solid #3498db;
        border-radius: 3px;
        color: white;
        font-size: 11px;
        padding: 2px 4px;
        outline: none;
        -moz-appearance: textfield;

        &::-webkit-outer-spin-button,
        &::-webkit-inner-spin-button {
            -webkit-appearance: none;
            margin: 0;
        }
    }

    .altitude-unit {
        font-size: 10px;
        color: rgba(255, 255, 255, 0.5);
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
        touch-action: manipulation;
        -webkit-tap-highlight-color: transparent;

        &:hover,
        &:active {
            opacity: 1;
            color: #3498db;
        }
    }

    .wx-cloud.na {
        opacity: 0.5;
        font-style: italic;
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

    .wp-actions {
        display: flex;
        gap: 2px;
        align-items: center;
    }

    .btn-move {
        padding: 2px 6px;
        background: transparent;
        border: none;
        color: rgba(255, 255, 255, 0.3);
        cursor: pointer;
        opacity: 0;
        transition: all 0.15s ease;
        font-size: 10px;
        line-height: 1;

        &:hover:not(:disabled) {
            color: #3498db;
            background: rgba(52, 152, 219, 0.1);
        }

        &:disabled {
            opacity: 0.2;
            cursor: not-allowed;
        }
    }

    .btn-delete {
        padding: 4px 6px;
        min-height: 44px;
        min-width: 44px;
        background: transparent;
        border: none;
        color: rgba(255, 255, 255, 0.3);
        cursor: pointer;
        opacity: 0;
        transition: all 0.15s ease;
        font-size: 12px;
        touch-action: manipulation;
        -webkit-tap-highlight-color: transparent;
        display: flex;
        align-items: center;
        justify-content: center;

        &:hover {
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

    /* Mobile adjustments */
    @media (max-width: 480px) {
        .waypoint-row {
            flex-wrap: wrap;
        }
    }
</style>
