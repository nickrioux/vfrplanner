<!--
    TimelineCard - Single waypoint card for mobile timeline view
    Shows ICAO/name, ETA, heading, distance, VFR condition badge
    Tap to expand for detailed weather
-->
<script lang="ts">
    import { createEventDispatcher } from 'svelte';
    import type { Waypoint, PluginSettings } from '../../types';
    import type { WaypointWeather, WeatherAlert } from '../../services/weatherService';
    import { formatDistance, formatBearing, formatEte, formatHeadwind } from '../../services/navigationCalc';
    import { formatWind, formatTemperature } from '../../services/weatherService';
    import { getWaypointIcon } from '../../utils/displayUtils';

    export let waypoint: Waypoint;
    export let index: number;
    export let weather: WaypointWeather | undefined = undefined;
    export let alerts: WeatherAlert[] = [];
    export let settings: PluginSettings;
    export let isSelected: boolean = false;
    export let isFirst: boolean = false;
    export let isLast: boolean = false;
    export let defaultAltitude: number = 3000;

    const dispatch = createEventDispatcher<{
        select: Waypoint;
        delete: string;
        moveUp: string;
        moveDown: string;
    }>();

    let expanded = false;

    $: icon = getWaypointIcon(waypoint.type);
    $: altitude = waypoint.altitude ?? defaultAltitude;
    $: condition = getCondition(alerts);
    $: etaDisplay = waypoint.eta
        ? waypoint.eta.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })
        : '--:--';

    function getCondition(alerts: WeatherAlert[]): 'good' | 'caution' | 'warning' | 'none' {
        if (!weather) return 'none';
        if (alerts.some(a => a.severity === 'warning')) return 'warning';
        if (alerts.some(a => a.severity === 'caution')) return 'caution';
        return 'good';
    }

    function toggleExpand() {
        expanded = !expanded;
        dispatch('select', waypoint);
    }
</script>

<div
    class="timeline-card"
    class:selected={isSelected}
    class:expanded
    on:click={toggleExpand}
>
    <div class="timeline-card__main">
        <!-- Left: icon + name + ETA -->
        <div class="timeline-card__left">
            <span class="timeline-card__icon">{icon}</span>
            <div class="timeline-card__info">
                <span class="timeline-card__name">{waypoint.name}</span>
                <span class="timeline-card__eta">{etaDisplay}</span>
            </div>
        </div>

        <!-- Center: heading + distance -->
        <div class="timeline-card__center">
            {#if waypoint.bearing !== undefined && waypoint.distance !== undefined}
                <span class="timeline-card__bearing">{formatBearing(waypoint.bearing)}</span>
                <span class="timeline-card__distance">{formatDistance(waypoint.distance)}</span>
            {:else if isFirst}
                <span class="timeline-card__label">Departure</span>
            {/if}
        </div>

        <!-- Right: condition badge -->
        <div class="timeline-card__right">
            {#if condition !== 'none'}
                <span class="condition-badge condition-badge--{condition}"></span>
            {/if}
        </div>
    </div>

    <!-- Compact weather summary (always visible when weather loaded) -->
    {#if weather}
        <div class="timeline-card__weather-summary">
            <span class="wx-chip">💨 {formatWind(weather.windSpeed, weather.windDir, weather.windAltitude)}</span>
            {#if weather.cloudBaseFt !== undefined}
                <span class="wx-chip">☁️ {Math.round(weather.cloudBaseFt)} ft</span>
            {/if}
            {#if weather.visibility !== undefined}
                <span class="wx-chip">👁 {(weather.visibility / 1000).toFixed(0)} km</span>
            {/if}
            <span class="wx-chip">🌡 {formatTemperature(weather.temperature)}</span>
        </div>
    {/if}

    <!-- Expanded detail section -->
    {#if expanded && weather}
        <div class="timeline-card__details">
            <div class="detail-grid">
                <div class="detail-item">
                    <span class="detail-label">Wind</span>
                    <span class="detail-value">{formatWind(weather.windSpeed, weather.windDir, weather.windAltitude)}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Temp</span>
                    <span class="detail-value">{formatTemperature(weather.temperature)}</span>
                </div>
                {#if weather.cloudBaseFt !== undefined}
                    <div class="detail-item">
                        <span class="detail-label">Ceiling</span>
                        <span class="detail-value">{Math.round(weather.cloudBaseFt)} ft</span>
                    </div>
                {/if}
                {#if weather.visibility !== undefined}
                    <div class="detail-item">
                        <span class="detail-label">Vis</span>
                        <span class="detail-value">{(weather.visibility / 1000).toFixed(0)} km</span>
                    </div>
                {/if}
                <div class="detail-item">
                    <span class="detail-label">Alt</span>
                    <span class="detail-value">{altitude} ft</span>
                </div>
                {#if waypoint.groundSpeed}
                    <div class="detail-item">
                        <span class="detail-label">GS</span>
                        <span class="detail-value">{Math.round(waypoint.groundSpeed)} kt</span>
                    </div>
                {/if}
            </div>

            <!-- Alert details -->
            {#if alerts.length > 0}
                <div class="alert-list">
                    {#each alerts as alert}
                        <div class="alert-item alert-item--{alert.severity}">
                            {alert.message}
                        </div>
                    {/each}
                </div>
            {/if}

            <!-- Action buttons -->
            <div class="timeline-card__actions">
                {#if !isFirst}
                    <button class="card-action" on:click|stopPropagation={() => dispatch('moveUp', waypoint.id)} title="Move up">
                        ▲
                    </button>
                {/if}
                {#if !isLast}
                    <button class="card-action" on:click|stopPropagation={() => dispatch('moveDown', waypoint.id)} title="Move down">
                        ▼
                    </button>
                {/if}
                <button class="card-action card-action--delete" on:click|stopPropagation={() => dispatch('delete', waypoint.id)} title="Delete">
                    ✕
                </button>
            </div>
        </div>
    {/if}
</div>

<style lang="less">
    .timeline-card {
        background: rgba(255, 255, 255, 0.05);
        border-radius: 10px;
        padding: 12px;
        cursor: pointer;
        transition: background 0.15s ease;
        touch-action: manipulation;
        -webkit-tap-highlight-color: transparent;

        &:active {
            background: rgba(255, 255, 255, 0.1);
        }

        &.selected {
            background: rgba(52, 152, 219, 0.15);
            border: 1px solid rgba(52, 152, 219, 0.3);
        }
    }

    .timeline-card__main {
        display: flex;
        align-items: center;
        gap: 10px;
        min-height: 40px;
    }

    .timeline-card__left {
        display: flex;
        align-items: center;
        gap: 8px;
        flex: 1;
        min-width: 0;
    }

    .timeline-card__icon {
        font-size: 18px;
        flex-shrink: 0;
    }

    .timeline-card__info {
        display: flex;
        flex-direction: column;
        min-width: 0;
    }

    .timeline-card__name {
        font-size: 14px;
        font-weight: 600;
        color: rgba(255, 255, 255, 0.95);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }

    .timeline-card__eta {
        font-size: 11px;
        color: rgba(255, 255, 255, 0.5);
    }

    .timeline-card__center {
        display: flex;
        flex-direction: column;
        align-items: center;
        flex-shrink: 0;
        min-width: 60px;
    }

    .timeline-card__bearing {
        font-size: 12px;
        color: rgba(255, 255, 255, 0.7);
    }

    .timeline-card__distance {
        font-size: 11px;
        color: rgba(255, 255, 255, 0.5);
    }

    .timeline-card__label {
        font-size: 11px;
        color: rgba(255, 255, 255, 0.4);
        font-style: italic;
    }

    .timeline-card__right {
        display: flex;
        align-items: center;
        gap: 6px;
        flex-shrink: 0;
    }

    .condition-badge {
        width: 10px;
        height: 10px;
        border-radius: 50%;

        &--good { background: #27ae60; }
        &--caution { background: #f39c12; }
        &--warning { background: #e74c3c; }
    }

    .timeline-card__weather-summary {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
        margin-top: 8px;
    }

    .wx-chip {
        font-size: 11px;
        color: rgba(255, 255, 255, 0.7);
        background: rgba(255, 255, 255, 0.06);
        padding: 2px 6px;
        border-radius: 4px;
        white-space: nowrap;
    }

    .timeline-card__details {
        margin-top: 10px;
        padding-top: 10px;
        border-top: 1px solid rgba(255, 255, 255, 0.1);
    }

    .detail-grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 8px;
    }

    .detail-item {
        display: flex;
        flex-direction: column;
        gap: 2px;
    }

    .detail-label {
        font-size: 10px;
        color: rgba(255, 255, 255, 0.4);
        text-transform: uppercase;
    }

    .detail-value {
        font-size: 13px;
        color: rgba(255, 255, 255, 0.9);
    }

    .alert-list {
        margin-top: 8px;
        display: flex;
        flex-direction: column;
        gap: 4px;
    }

    .alert-item {
        font-size: 11px;
        padding: 4px 8px;
        border-radius: 4px;

        &--warning {
            background: rgba(231, 76, 60, 0.2);
            color: #e74c3c;
        }

        &--caution {
            background: rgba(243, 156, 18, 0.2);
            color: #f39c12;
        }
    }

    .timeline-card__actions {
        display: flex;
        gap: 8px;
        margin-top: 10px;
        justify-content: flex-end;
    }

    .card-action {
        width: 36px;
        height: 36px;
        border-radius: 8px;
        background: rgba(255, 255, 255, 0.1);
        border: none;
        color: rgba(255, 255, 255, 0.7);
        font-size: 14px;
        cursor: pointer;
        touch-action: manipulation;
        -webkit-tap-highlight-color: transparent;
        display: flex;
        align-items: center;
        justify-content: center;

        &:active {
            background: rgba(255, 255, 255, 0.2);
        }

        &--delete:active {
            background: rgba(231, 76, 60, 0.3);
            color: #e74c3c;
        }
    }
</style>
