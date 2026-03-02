<!--
    LandscapeProfile - Fullscreen wrapper for AltitudeProfile in landscape phone mode
-->
<script lang="ts">
    import { createEventDispatcher } from 'svelte';
    import type { FlightPlan, PluginSettings } from '../../types';
    import type { WaypointWeather } from '../../services/weatherService';
    import type { ElevationPoint } from '../../services/elevationService';
    import AltitudeProfile from '../AltitudeProfile.svelte';

    export let flightPlan: FlightPlan | null;
    export let weatherData: Map<string, WaypointWeather>;
    export let elevationProfile: ElevationPoint[];
    export let settings: PluginSettings;
    export let maxProfileAltitude: number;
    export let profileScale: number;

    const dispatch = createEventDispatcher<{
        waypointClick: string;
        close: void;
    }>();
</script>

<div class="landscape-profile">
    <button class="landscape-profile__close" on:click={() => dispatch('close')} title="Exit profile view">
        ✕
    </button>

    {#if flightPlan && weatherData.size > 0}
        <AltitudeProfile
            {flightPlan}
            {weatherData}
            {elevationProfile}
            {settings}
            maxAltitude={maxProfileAltitude}
            scale={profileScale}
            on:waypointClick
        />
    {:else}
        <div class="landscape-profile__empty">
            <p>Fetch weather data to view the altitude profile.</p>
        </div>
    {/if}
</div>

<style lang="less">
    .landscape-profile {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(30, 30, 46, 0.98);
        z-index: 1001;
        display: flex;
        flex-direction: column;
        padding: 8px;
    }

    .landscape-profile__close {
        position: absolute;
        top: 8px;
        right: 8px;
        width: 40px;
        height: 40px;
        border-radius: 8px;
        background: rgba(255, 255, 255, 0.1);
        border: none;
        color: rgba(255, 255, 255, 0.8);
        font-size: 18px;
        cursor: pointer;
        touch-action: manipulation;
        -webkit-tap-highlight-color: transparent;
        z-index: 1;

        &:active {
            background: rgba(255, 255, 255, 0.2);
        }
    }

    .landscape-profile__empty {
        flex: 1;
        display: flex;
        align-items: center;
        justify-content: center;
        color: rgba(255, 255, 255, 0.6);
        font-size: 14px;

        p { margin: 0; }
    }
</style>
