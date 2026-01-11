<script lang="ts">
    import { createEventDispatcher } from 'svelte';
    import type { FlightPlan } from '../types/flightPlan';
    import type { WaypointWeather } from '../services/weatherService';
    import type { PluginSettings } from '../types';
    import { calculateProfileData, type ProfileDataPoint, type SegmentCondition } from '../services/profileService';

    export let flightPlan: FlightPlan;
    export let weatherData: Map<string, WaypointWeather>;
    export let settings: PluginSettings;
    export let maxAltitude: number = 15000;
    export let scale: number = 511; // meters per pixel;

    const dispatch = createEventDispatcher<{
        waypointClick: string;
    }>();

    // Graph dimensions
    const graphPadding = { top: 20, right: 20, bottom: 40, left: 60 };
    let graphWidth = 600;
    let graphHeight = 400;
    let svgElement: SVGElement;

    // Cursor position
    let cursorDistance: number | null = null;
    let cursorData: ProfileDataPoint | null = null;

    // Calculate profile data
    $: profileData = calculateProfileData(flightPlan.waypoints, weatherData, flightPlan.aircraft.defaultAltitude);

    /**
     * Get segment color based on condition
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

    // Calculate graph dimensions
    $: {
        if (profileData.length > 0) {
            const maxDistance = Math.max(...profileData.map(p => p.distance));
            // Scale width based on distance and scale setting
            // scale is in meters/pixel, convert distance (NM) to meters, then divide by scale
            const distanceMeters = maxDistance * 1852; // 1 NM = 1852 meters
            graphWidth = Math.max(600, Math.min(1200, distanceMeters / scale));
        } else {
            graphWidth = 600;
        }
    }

    // Interpolate data at a specific distance
    function interpolateAtDistance(distance: number): ProfileDataPoint | null {
        if (profileData.length === 0) return null;
        if (profileData.length === 1) return profileData[0];

        // Find the two points to interpolate between
        for (let i = 0; i < profileData.length - 1; i++) {
            const p1 = profileData[i];
            const p2 = profileData[i + 1];

            if (distance >= p1.distance && distance <= p2.distance) {
                const t = (distance - p1.distance) / (p2.distance - p1.distance);
                
                return {
                    distance,
                    altitude: p1.altitude + (p2.altitude - p1.altitude) * t,
                    terrainElevation: p1.terrainElevation !== undefined && p2.terrainElevation !== undefined
                        ? p1.terrainElevation + (p2.terrainElevation - p1.terrainElevation) * t
                        : undefined,
                    cloudBase: p1.cloudBase !== undefined && p2.cloudBase !== undefined
                        ? p1.cloudBase + (p2.cloudBase - p1.cloudBase) * t
                        : undefined,
                    cloudTop: p1.cloudTop !== undefined && p2.cloudTop !== undefined
                        ? p1.cloudTop + (p2.cloudTop - p1.cloudTop) * t
                        : undefined,
                    headwindComponent: p1.headwindComponent + (p2.headwindComponent - p1.headwindComponent) * t,
                    crosswindComponent: p1.crosswindComponent + (p2.crosswindComponent - p1.crosswindComponent) * t,
                    windSpeed: p1.windSpeed + (p2.windSpeed - p1.windSpeed) * t,
                    windDir: p1.windDir + (p2.windDir - p1.windDir) * t,
                    condition: p1.condition, // Use starting point's condition
                    conditionReasons: p1.conditionReasons, // Use starting point's reasons
                };
            }
        }

        // If distance is beyond the last point, return the last point
        if (distance >= profileData[profileData.length - 1].distance) {
            return profileData[profileData.length - 1];
        }

        // If distance is before the first point, return the first point
        return profileData[0];
    }

    // Convert distance to X coordinate
    function distanceToX(distance: number): number {
        if (profileData.length === 0) return graphPadding.left;
        const maxDistance = Math.max(...profileData.map(p => p.distance));
        if (maxDistance === 0) return graphPadding.left;
        const xRange = graphWidth - graphPadding.left - graphPadding.right;
        return graphPadding.left + (distance / maxDistance) * xRange;
    }

    // Convert altitude to Y coordinate
    function altitudeToY(altitude: number): number {
        const yRange = graphHeight - graphPadding.top - graphPadding.bottom;
        return graphPadding.top + (1 - altitude / maxAltitude) * yRange;
    }

    // Handle mouse move on graph
    function handleMouseMove(event: MouseEvent) {
        if (!svgElement) return;
        const rect = svgElement.getBoundingClientRect();
        const x = event.clientX - rect.left;
        
        // Convert X coordinate to distance
        const maxDistance = profileData.length > 0 ? Math.max(...profileData.map(p => p.distance)) : 0;
        const xRange = graphWidth - graphPadding.left - graphPadding.right;
        const distance = ((x - graphPadding.left) / xRange) * maxDistance;
        
        if (distance >= 0 && distance <= maxDistance) {
            cursorDistance = distance;
            cursorData = interpolateAtDistance(distance);
        } else {
            cursorDistance = null;
            cursorData = null;
        }
    }

    function handleMouseLeave() {
        cursorDistance = null;
        cursorData = null;
    }

    // Handle waypoint click
    function handleWaypointClick(waypointId: string) {
        dispatch('waypointClick', waypointId);
    }

    // Generate grid lines
    $: altitudeGridLines = (() => {
        const lines: Array<{ y: number; label: string }> = [];
        const step = maxAltitude / 5; // 5 grid lines
        for (let i = 0; i <= 5; i++) {
            const altitude = i * step;
            lines.push({
                y: altitudeToY(altitude),
                label: `${Math.round(altitude)}ft`,
            });
        }
        return lines;
    })();

    $: distanceGridLines = (() => {
        if (profileData.length === 0) return [];
        const maxDistance = Math.max(...profileData.map(p => p.distance));
        if (maxDistance === 0) return [];
        const lines: Array<{ x: number; label: string }> = [];
        const step = maxDistance / 5; // 5 grid lines
        for (let i = 0; i <= 5; i++) {
            const distance = i * step;
            lines.push({
                x: distanceToX(distance),
                label: `${distance.toFixed(1)}NM`,
            });
        }
        return lines;
    })();

    // Generate terrain path
    $: terrainPath = (() => {
        if (profileData.length === 0) return '';
        const points = profileData
            .filter(p => p.terrainElevation !== undefined)
            .map(p => `${distanceToX(p.distance)},${altitudeToY(p.terrainElevation!)}`);
        if (points.length === 0) return '';
        return `M ${points.join(' L ')}`;
    })();
</script>

{#if profileData.length === 0}
    <div class="profile-empty">
        <p>No profile data available. Please ensure you have at least 2 waypoints and weather data.</p>
    </div>
{:else}
<div class="profile-container">
    <!-- Debug info (can be removed later) -->
    {#if settings.enableLogging}
        <div class="debug-info" style="font-size: 10px; color: rgba(255,255,255,0.5); padding: 4px;">
            Points: {profileData.length} |
            With clouds: {profileData.filter(p => p.cloudBase !== undefined).length} |
            With wind: {profileData.filter(p => p.windSpeed > 0).length}
        </div>
    {/if}

    <!-- Condition Legend -->
    <div class="condition-legend">
        <div class="legend-item">
            <span class="legend-color" style="background-color: #4caf50;"></span>
            <span class="legend-label">Good VFR</span>
        </div>
        <div class="legend-item">
            <span class="legend-color" style="background-color: #ff9800;"></span>
            <span class="legend-label">Marginal VFR</span>
        </div>
        <div class="legend-item">
            <span class="legend-color" style="background-color: #f44336;"></span>
            <span class="legend-label">Poor VFR</span>
        </div>
        <div class="legend-item">
            <span class="legend-color" style="background-color: #757575;"></span>
            <span class="legend-label">No Data</span>
        </div>
    </div>

    <!-- Cursor info display -->
    <div class="cursor-info">
        {#if cursorData}
            <div class="cursor-main-info">
                Altitude: {Math.round(cursorData.altitude)}ft
                {#if cursorData.terrainElevation !== undefined}
                    | Terrain: {Math.round(cursorData.terrainElevation)}ft
                {/if}
                | Distance: {cursorData.distance.toFixed(1)}NM
                {#if cursorData.windSpeed > 0}
                    | Wind: {cursorData.windSpeed.toFixed(0)}kt @ {Math.round(cursorData.windDir)}°
                    {#if cursorData.headwindComponent !== 0}
                        ({cursorData.headwindComponent > 0 ? 'HW' : 'TW'} {Math.abs(cursorData.headwindComponent).toFixed(0)}kt)
                    {/if}
                {/if}
                {#if cursorData.cloudBase !== undefined}
                    | Cloud: {Math.round(cursorData.cloudBase)}-{Math.round(cursorData.cloudTop || 0)}ft
                {/if}
            </div>
            {#if cursorData.condition}
                <div class="cursor-condition" style="color: {getSegmentColor(cursorData.condition)}; font-weight: bold; margin-top: 4px;">
                    Conditions: {cursorData.condition.toUpperCase()}
                </div>
            {/if}
            {#if cursorData.conditionReasons && cursorData.conditionReasons.length > 0}
                <div class="cursor-condition-reasons" style="font-size: 10px; color: rgba(255, 255, 255, 0.7); margin-top: 4px;">
                    {#each cursorData.conditionReasons as reason}
                        <div>⚠️ {reason}</div>
                    {/each}
                </div>
            {/if}
        {:else}
            Hover over graph to see details
        {/if}
    </div>

    <!-- Graph SVG -->
    <div class="graph-container">
        <svg
            bind:this={svgElement}
            class="profile-graph"
            width={graphWidth}
            height={graphHeight}
            viewBox={`0 0 ${graphWidth} ${graphHeight}`}
            on:mousemove={handleMouseMove}
            on:mouseleave={handleMouseLeave}
        >
            <!-- Grid lines -->
            {#each altitudeGridLines as line}
                <line
                    x1={graphPadding.left}
                    y1={line.y}
                    x2={graphWidth - graphPadding.right}
                    y2={line.y}
                    stroke="rgba(255, 255, 255, 0.1)"
                    stroke-width="1"
                />
                <text
                    x={graphPadding.left - 10}
                    y={line.y + 4}
                    fill="rgba(255, 255, 255, 0.6)"
                    font-size="10"
                    text-anchor="end"
                >{line.label}</text>
            {/each}

            {#each distanceGridLines as line}
                <line
                    x1={line.x}
                    y1={graphPadding.top}
                    x2={line.x}
                    y2={graphHeight - graphPadding.bottom}
                    stroke="rgba(255, 255, 255, 0.1)"
                    stroke-width="1"
                />
                <text
                    x={line.x}
                    y={graphHeight - graphPadding.bottom + 20}
                    fill="rgba(255, 255, 255, 0.6)"
                    font-size="10"
                    text-anchor="middle"
                >{line.label}</text>
            {/each}

            <!-- Cloud areas -->
            {#each profileData as point, index}
                {#if index < profileData.length - 1}
                    {@const nextPoint = profileData[index + 1]}
                    {#if point.cloudBase !== undefined && point.cloudTop !== undefined && point.cloudBase > 0 && point.cloudTop > 0}
                        {@const cloudTopY = altitudeToY(point.cloudTop)}
                        {@const cloudBaseY = altitudeToY(point.cloudBase)}
                        {@const cloudHeight = Math.abs(cloudBaseY - cloudTopY)}
                        {@const cloudY = Math.min(cloudTopY, cloudBaseY)}
                        {#if cloudHeight > 0 && point.cloudTop <= maxAltitude}
                            <rect
                                x={distanceToX(point.distance)}
                                y={cloudY}
                                width={Math.max(1, distanceToX(nextPoint.distance) - distanceToX(point.distance))}
                                height={cloudHeight}
                                fill="rgba(100, 150, 200, 0.4)"
                                stroke="rgba(100, 150, 200, 0.6)"
                                stroke-width="1"
                            />
                        {/if}
                    {/if}
                {/if}
            {/each}

            <!-- Terrain line -->
            {#if terrainPath}
                <path
                    d={terrainPath}
                    fill="none"
                    stroke="#8b4513"
                    stroke-width="2"
                />
            {/if}

            <!-- Wind component bars -->
            {#each profileData as point}
                {#if point.windSpeed > 0 && point.headwindComponent !== 0}
                    {@const barHeight = Math.max(5, Math.abs(point.headwindComponent) * 3)}
                    {@const barY = altitudeToY(point.altitude)}
                    {@const isHeadwind = point.headwindComponent > 0}
                    <line
                        x1={distanceToX(point.distance)}
                        y1={isHeadwind ? barY : barY - barHeight}
                        x2={distanceToX(point.distance)}
                        y2={isHeadwind ? barY + barHeight : barY}
                        stroke={isHeadwind ? '#f44336' : '#4caf50'}
                        stroke-width="4"
                        opacity="0.8"
                    />
                {/if}
            {/each}

            <!-- Altitude profile line (segmented by condition) -->
            {#each profileData as point, index}
                {#if index < profileData.length - 1}
                    {@const nextPoint = profileData[index + 1]}
                    {@const segmentColor = getSegmentColor(point.condition)}
                    <line
                        x1={distanceToX(point.distance)}
                        y1={altitudeToY(point.altitude)}
                        x2={distanceToX(nextPoint.distance)}
                        y2={altitudeToY(nextPoint.altitude)}
                        stroke={segmentColor}
                        stroke-width="3"
                        stroke-linecap="round"
                    />
                {/if}
            {/each}

            <!-- Waypoint markers -->
            {#each profileData as point}
                <line
                    x1={distanceToX(point.distance)}
                    y1={graphPadding.top}
                    x2={distanceToX(point.distance)}
                    y2={graphHeight - graphPadding.bottom}
                    stroke="rgba(255, 255, 255, 0.3)"
                    stroke-width="1"
                    stroke-dasharray="2,2"
                />
                <circle
                    cx={distanceToX(point.distance)}
                    cy={altitudeToY(point.altitude)}
                    r="5"
                    fill="#ff00ff"
                    stroke="white"
                    stroke-width="2"
                    style="cursor: pointer;"
                    on:click={() => point.waypointId && handleWaypointClick(point.waypointId)}
                />
                {#if point.waypointName}
                    <text
                        x={distanceToX(point.distance)}
                        y={graphPadding.top - 5}
                        fill="rgba(255, 255, 255, 0.9)"
                        font-size="11"
                        font-weight="500"
                        text-anchor="middle"
                        style="cursor: pointer;"
                        on:click={() => point.waypointId && handleWaypointClick(point.waypointId)}
                    >{point.waypointName}</text>
                {/if}
            {/each}

            <!-- Cursor/crosshair -->
            {#if cursorDistance !== null}
                <line
                    x1={distanceToX(cursorDistance)}
                    y1={graphPadding.top}
                    x2={distanceToX(cursorDistance)}
                    y2={graphHeight - graphPadding.bottom}
                    stroke="rgba(255, 255, 255, 0.5)"
                    stroke-width="1"
                    stroke-dasharray="4,4"
                />
                {#if cursorData}
                    <circle
                        cx={distanceToX(cursorDistance)}
                        cy={altitudeToY(cursorData.altitude)}
                        r="6"
                        fill="white"
                        stroke="#3498db"
                        stroke-width="2"
                    />
                {/if}
            {/if}
        </svg>
    </div>

    <!-- Controls -->
    <div class="controls">
        <div class="control-group">
            <label>Top height: {maxAltitude}ft</label>
            <input
                type="range"
                min="5000"
                max="50000"
                step="500"
                bind:value={maxAltitude}
                class="slider"
            />
        </div>
        <div class="control-group">
            <label>Meters/pixel: {scale}m</label>
            <input
                type="range"
                min="100"
                max="2000"
                step="50"
                bind:value={scale}
                class="slider"
            />
        </div>
    </div>
</div>
{/if}

<style lang="less">
    .profile-empty {
        padding: 20px;
        text-align: center;
        color: rgba(255, 255, 255, 0.7);
        font-size: 13px;

        p {
            margin: 0;
        }
    }

    .profile-container {
        padding: 10px;
        display: flex;
        flex-direction: column;
        gap: 10px;
    }

    .cursor-info {
        padding: 8px;
        background: rgba(255, 255, 255, 0.05);
        border-radius: 4px;
        font-size: 12px;
        color: rgba(255, 255, 255, 0.9);
        text-align: center;
    }

    .condition-legend {
        display: flex;
        gap: 15px;
        padding: 8px;
        background-color: rgba(0, 0, 0, 0.3);
        border-radius: 4px;
        font-size: 11px;
        justify-content: center;
        flex-wrap: wrap;
    }

    .legend-item {
        display: flex;
        align-items: center;
        gap: 6px;
    }

    .legend-color {
        width: 20px;
        height: 3px;
        border-radius: 2px;
    }

    .legend-label {
        color: rgba(255, 255, 255, 0.8);
    }

    .cursor-condition {
        font-weight: bold;
        margin-top: 4px;
    }

    .cursor-condition-reasons {
        font-size: 10px;
        color: rgba(255, 255, 255, 0.7);
        margin-top: 4px;
    }

    .graph-container {
        width: 100%;
        overflow-x: auto;
        background: rgba(0, 0, 0, 0.2);
        border-radius: 4px;
        padding: 10px;
    }

    .profile-graph {
        display: block;
        background: #1a1a1a;
    }

    .controls {
        display: flex;
        gap: 16px;
        padding: 10px;
        background: rgba(255, 255, 255, 0.05);
        border-radius: 4px;
    }

    .control-group {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 6px;
    }

    .control-group label {
        font-size: 11px;
        color: rgba(255, 255, 255, 0.7);
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
</style>

