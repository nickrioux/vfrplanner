<!--
    RouteSummaryBar - Visible in collapsed bottom sheet state
    Shows plan name, total distance, ETE, ETA, and weather status dot
-->
<script lang="ts">
    import type { FlightPlan } from '../../types';
    import type { WeatherAlert } from '../../services/weatherService';
    import { formatDistance, formatEte } from '../../services/navigationCalc';

    export let flightPlan: FlightPlan | null;
    export let weatherAlerts: Map<string, WeatherAlert[]>;

    $: totalDistance = flightPlan?.totals?.distance ?? 0;
    $: totalEte = flightPlan?.totals?.ete ?? 0;
    $: planName = flightPlan?.name ?? 'No Plan';
    $: waypointCount = flightPlan?.waypoints.length ?? 0;

    // Weather status: green (no alerts), yellow (cautions), red (warnings)
    $: weatherStatus = getWeatherStatus(weatherAlerts);

    function getWeatherStatus(alerts: Map<string, WeatherAlert[]>): 'green' | 'yellow' | 'red' | 'none' {
        if (alerts.size === 0) return 'none';
        let hasWarning = false;
        let hasCaution = false;
        for (const alertList of alerts.values()) {
            for (const alert of alertList) {
                if (alert.severity === 'warning') hasWarning = true;
                if (alert.severity === 'caution') hasCaution = true;
            }
        }
        if (hasWarning) return 'red';
        if (hasCaution) return 'yellow';
        return 'green';
    }
</script>

<div class="route-summary">
    {#if flightPlan}
        <div class="route-summary__name">{planName}</div>
        <div class="route-summary__stats">
            <span>{formatDistance(totalDistance)}</span>
            <span class="separator">·</span>
            <span>{formatEte(totalEte)}</span>
            <span class="separator">·</span>
            <span>{waypointCount} pts</span>
            {#if weatherStatus !== 'none'}
                <span class="weather-dot weather-dot--{weatherStatus}"></span>
            {/if}
        </div>
    {:else}
        <div class="route-summary__name">VFR Flight Planner</div>
        <div class="route-summary__stats">Tap to load a plan</div>
    {/if}
</div>

<style lang="less">
    .route-summary {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
        min-height: 32px;
    }

    .route-summary__name {
        font-size: 14px;
        font-weight: 600;
        color: rgba(255, 255, 255, 0.95);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        flex: 1;
        min-width: 0;
    }

    .route-summary__stats {
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 12px;
        color: rgba(255, 255, 255, 0.7);
        flex-shrink: 0;
    }

    .separator {
        color: rgba(255, 255, 255, 0.3);
    }

    .weather-dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        flex-shrink: 0;

        &--green { background: #27ae60; }
        &--yellow { background: #f39c12; }
        &--red { background: #e74c3c; }
    }
</style>
