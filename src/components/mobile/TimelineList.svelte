<!--
    TimelineList - Vertical scrollable list of TimelineCard components
    with timeline connector line between waypoints
-->
<script lang="ts">
    import { createEventDispatcher } from 'svelte';
    import type { FlightPlan, Waypoint, PluginSettings } from '../../types';
    import type { WaypointWeather, WeatherAlert } from '../../services/weatherService';
    import TimelineCard from './TimelineCard.svelte';

    export let flightPlan: FlightPlan;
    export let weatherData: Map<string, WaypointWeather>;
    export let weatherAlerts: Map<string, WeatherAlert[]>;
    export let settings: PluginSettings;
    export let selectedWaypointId: string | null = null;

    const dispatch = createEventDispatcher<{
        selectWaypoint: Waypoint;
        deleteWaypoint: string;
        moveWaypointUp: string;
        moveWaypointDown: string;
    }>();

    $: waypoints = flightPlan.waypoints;
    $: defaultAltitude = flightPlan.aircraft.defaultAltitude;

    // Force reactivity when weatherData/weatherAlerts Maps change
    // by deriving a lookup tied to the Map reference
    function getWeather(id: string, _data: Map<string, WaypointWeather>): WaypointWeather | undefined {
        return weatherData.get(id);
    }
    function getAlerts(id: string, _data: Map<string, WeatherAlert[]>): WeatherAlert[] {
        return weatherAlerts.get(id) || [];
    }
</script>

<div class="timeline-list">
    {#each waypoints as wp, index (wp.id)}
        <div class="timeline-item">
            <!-- Timeline connector -->
            <div class="timeline-connector">
                <div class="timeline-dot"></div>
                {#if index < waypoints.length - 1}
                    <div class="timeline-line"></div>
                {/if}
            </div>

            <!-- Card -->
            <div class="timeline-card-wrapper">
                <TimelineCard
                    waypoint={wp}
                    {index}
                    weather={getWeather(wp.id, weatherData)}
                    alerts={getAlerts(wp.id, weatherAlerts)}
                    {settings}
                    isSelected={selectedWaypointId === wp.id}
                    isFirst={index === 0}
                    isLast={index === waypoints.length - 1}
                    {defaultAltitude}
                    on:select={(e) => dispatch('selectWaypoint', e.detail)}
                    on:delete={(e) => dispatch('deleteWaypoint', e.detail)}
                    on:moveUp={(e) => dispatch('moveWaypointUp', e.detail)}
                    on:moveDown={(e) => dispatch('moveWaypointDown', e.detail)}
                />
            </div>
        </div>
    {/each}
</div>

<style lang="less">
    .timeline-list {
        padding: 8px 12px 120px;
    }

    .timeline-item {
        display: flex;
        gap: 12px;
    }

    .timeline-connector {
        display: flex;
        flex-direction: column;
        align-items: center;
        width: 20px;
        flex-shrink: 0;
        padding-top: 18px;
    }

    .timeline-dot {
        width: 10px;
        height: 10px;
        border-radius: 50%;
        background: #3498db;
        flex-shrink: 0;
        z-index: 1;
    }

    .timeline-line {
        width: 2px;
        flex: 1;
        background: rgba(52, 152, 219, 0.3);
        min-height: 12px;
    }

    .timeline-card-wrapper {
        flex: 1;
        min-width: 0;
        margin-bottom: 8px;
    }
</style>
