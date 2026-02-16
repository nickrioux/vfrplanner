<script lang="ts">
    import { createEventDispatcher } from 'svelte';
    import type { FlightPlan } from '../types/flightPlan';
    import type { WaypointWeather, LevelWind } from '../services/weatherService';
    import type { PluginSettings } from '../types';
    import { calculateProfileData, type ProfileDataPoint, type SegmentCondition } from '../services/profileService';
    import type { ElevationPoint } from '../services/elevationService';
    import { lerpAngle } from '../utils/interpolation';
    import { logger } from '../services/logger';
    import { getActiveThresholds } from '../services/vfrConditionRules';

    export let flightPlan: FlightPlan;
    export let weatherData: Map<string, WaypointWeather>;
    export let elevationProfile: ElevationPoint[] = [];
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

    // Calculate profile data - includes all terrain samples + waypoints
    // Use aircraft-aware thresholds to match mapController's evaluation
    $: thresholds = getActiveThresholds(settings);
    $: profileData = calculateProfileData(flightPlan.waypoints, weatherData, flightPlan.aircraft.defaultAltitude, elevationProfile, thresholds);

    // Extract only waypoint data for flight path and wind display
    $: waypointProfileData = profileData.filter(p => p.waypointId !== undefined);

    // Create a reactive key that changes when scale parameters change
    // This forces re-rendering of all altitude-dependent elements
    $: scaleKey = `${maxAltitude}-${graphHeight}`;

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

    /**
     * Generate aviation wind barb symbol
     * @param x - Center X position
     * @param y - Center Y position (top of flight path marker)
     * @param windDir - Wind direction in degrees (where wind comes FROM)
     * @param windSpeed - Wind speed in knots
     * @returns SVG group element content
     */
    function generateWindBarb(x: number, y: number, windDir: number, windSpeed: number): {
        staff: string;
        barbs: Array<{ path: string; type: string }>;
    } {
        const staffLength = 30;
        const barbLength = 10;
        const shortBarbLength = 5;
        const triangleSize = 8;

        // Convert wind direction to radians (wind comes FROM this direction)
        const angle = (windDir - 90) * Math.PI / 180; // -90 to adjust for SVG coordinate system

        // Calculate staff end point
        const staffEndX = x + Math.cos(angle) * staffLength;
        const staffEndY = y + Math.sin(angle) * staffLength;

        // Staff line
        const staff = `M ${x},${y} L ${staffEndX},${staffEndY}`;

        // Calculate barbs (perpendicular to staff, on the right side)
        const barbs: Array<{ path: string; type: string }> = [];
        let remainingSpeed = Math.round(windSpeed);
        let barbPosition = 0;
        const barbSpacing = 6;

        // Add 50-knot pennants (triangles)
        while (remainingSpeed >= 50) {
            const posX = x + Math.cos(angle) * (staffLength - barbPosition);
            const posY = y + Math.sin(angle) * (staffLength - barbPosition);

            // Triangle vertices
            const perpAngle = angle + Math.PI / 2; // Perpendicular to staff
            const tip1X = posX + Math.cos(perpAngle) * triangleSize;
            const tip1Y = posY + Math.sin(perpAngle) * triangleSize;
            const tip2X = posX + Math.cos(angle) * triangleSize;
            const tip2Y = posY + Math.sin(angle) * triangleSize;

            barbs.push({
                path: `M ${posX},${posY} L ${tip1X},${tip1Y} L ${tip2X},${tip2Y} Z`,
                type: 'triangle'
            });

            remainingSpeed -= 50;
            barbPosition += barbSpacing * 1.5; // Extra space for triangles
        }

        // Add 10-knot barbs (long lines)
        while (remainingSpeed >= 10) {
            const posX = x + Math.cos(angle) * (staffLength - barbPosition);
            const posY = y + Math.sin(angle) * (staffLength - barbPosition);

            const perpAngle = angle + Math.PI / 2;
            const barbEndX = posX + Math.cos(perpAngle) * barbLength;
            const barbEndY = posY + Math.sin(perpAngle) * barbLength;

            barbs.push({
                path: `M ${posX},${posY} L ${barbEndX},${barbEndY}`,
                type: 'long'
            });

            remainingSpeed -= 10;
            barbPosition += barbSpacing;
        }

        // Add 5-knot barbs (short lines)
        if (remainingSpeed >= 5) {
            const posX = x + Math.cos(angle) * (staffLength - barbPosition);
            const posY = y + Math.sin(angle) * (staffLength - barbPosition);

            const perpAngle = angle + Math.PI / 2;
            const barbEndX = posX + Math.cos(perpAngle) * shortBarbLength;
            const barbEndY = posY + Math.sin(perpAngle) * shortBarbLength;

            barbs.push({
                path: `M ${posX},${posY} L ${barbEndX},${barbEndY}`,
                type: 'short'
            });
        }

        // If wind speed is less than 5 knots, just show circle at center
        if (windSpeed < 3) {
            return { staff: '', barbs: [] };
        }

        return { staff, barbs };
    }

    /**
     * Generate a smaller wind barb for vertical wind display
     * Similar to generateWindBarb but scaled down
     */
    function generateSmallWindBarb(x: number, y: number, windDir: number, windSpeed: number, scale: number = 0.6): {
        staff: string;
        barbs: Array<{ path: string; type: string }>;
    } {
        const staffLength = 20 * scale;
        const barbLength = 8 * scale;
        const shortBarbLength = 4 * scale;
        const triangleSize = 6 * scale;

        // Convert wind direction to radians (wind comes FROM this direction)
        const angle = (windDir - 90) * Math.PI / 180;

        // Calculate staff end point
        const staffEndX = x + Math.cos(angle) * staffLength;
        const staffEndY = y + Math.sin(angle) * staffLength;

        // Staff line
        const staff = `M ${x},${y} L ${staffEndX},${staffEndY}`;

        // Calculate barbs
        const barbs: Array<{ path: string; type: string }> = [];
        let remainingSpeed = Math.round(windSpeed);
        let barbPosition = 0;
        const barbSpacing = 4 * scale;

        // Add 50-knot pennants (triangles)
        while (remainingSpeed >= 50) {
            const posX = x + Math.cos(angle) * (staffLength - barbPosition);
            const posY = y + Math.sin(angle) * (staffLength - barbPosition);

            const perpAngle = angle + Math.PI / 2;
            const tip1X = posX + Math.cos(perpAngle) * triangleSize;
            const tip1Y = posY + Math.sin(perpAngle) * triangleSize;
            const tip2X = posX + Math.cos(angle) * triangleSize;
            const tip2Y = posY + Math.sin(angle) * triangleSize;

            barbs.push({
                path: `M ${posX},${posY} L ${tip1X},${tip1Y} L ${tip2X},${tip2Y} Z`,
                type: 'triangle'
            });

            remainingSpeed -= 50;
            barbPosition += barbSpacing * 1.5;
        }

        // Add 10-knot barbs (long lines)
        while (remainingSpeed >= 10) {
            const posX = x + Math.cos(angle) * (staffLength - barbPosition);
            const posY = y + Math.sin(angle) * (staffLength - barbPosition);

            const perpAngle = angle + Math.PI / 2;
            const barbEndX = posX + Math.cos(perpAngle) * barbLength;
            const barbEndY = posY + Math.sin(perpAngle) * barbLength;

            barbs.push({
                path: `M ${posX},${posY} L ${barbEndX},${barbEndY}`,
                type: 'long'
            });

            remainingSpeed -= 10;
            barbPosition += barbSpacing;
        }

        // Add 5-knot barbs (short lines)
        if (remainingSpeed >= 5) {
            const posX = x + Math.cos(angle) * (staffLength - barbPosition);
            const posY = y + Math.sin(angle) * (staffLength - barbPosition);

            const perpAngle = angle + Math.PI / 2;
            const barbEndX = posX + Math.cos(perpAngle) * shortBarbLength;
            const barbEndY = posY + Math.sin(perpAngle) * shortBarbLength;

            barbs.push({
                path: `M ${posX},${posY} L ${barbEndX},${barbEndY}`,
                type: 'short'
            });
        }

        if (windSpeed < 3) {
            return { staff: '', barbs: [] };
        }

        return { staff, barbs };
    }

    /**
     * Get color for wind level based on whether it's the flight altitude level
     */
    function getWindLevelColor(levelAltitude: number, flightAltitude: number): string {
        // Highlight the wind level closest to flight altitude
        const diff = Math.abs(levelAltitude - flightAltitude);
        if (diff < 500) {
            return 'rgba(76, 175, 80, 0.95)'; // Green for current flight level
        } else if (diff < 2000) {
            return 'rgba(255, 193, 7, 0.8)'; // Yellow for nearby levels
        } else {
            return 'rgba(255, 255, 255, 0.5)'; // White/gray for distant levels
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

                // For vertical winds, use the nearest waypoint's data (can't easily interpolate wind arrays)
                const nearestVerticalWinds = t < 0.5 ? p1.verticalWinds : p2.verticalWinds;

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
                    windDir: lerpAngle(p1.windDir, p2.windDir, t), // Use angular interpolation for proper wrap-around
                    verticalWinds: nearestVerticalWinds,
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

    // Generate terrain filled area (polygon from ground to terrain elevation)
    $: terrainPath = (() => {
        // Explicitly depend on maxAltitude to recalculate when scale changes
        const currentMaxAltitude = maxAltitude;

        if (profileData.length === 0) {
            logger.debug('No profile data for terrain');
            return '';
        }
        const terrainPoints = profileData.filter(p => p.terrainElevation !== undefined);
        if (terrainPoints.length === 0) {
            logger.debug('No terrain elevation data in profile points');
            return '';
        }

        // Start from bottom-left
        const bottomY = graphHeight - graphPadding.bottom;
        const points: string[] = [];

        // Bottom-left corner
        points.push(`${distanceToX(terrainPoints[0].distance)},${bottomY}`);

        // Terrain elevation points (left to right)
        terrainPoints.forEach(p => {
            points.push(`${distanceToX(p.distance)},${altitudeToY(p.terrainElevation!)}`);
        });

        // Bottom-right corner to close the polygon
        points.push(`${distanceToX(terrainPoints[terrainPoints.length - 1].distance)},${bottomY}`);

        const path = points.join(' ');
        logger.debug(`Terrain path generated: ${terrainPoints.length} points`);
        logger.debug(`Terrain elevation range: ${Math.min(...terrainPoints.map(p => p.terrainElevation!))}ft to ${Math.max(...terrainPoints.map(p => p.terrainElevation!))}ft`);
        logger.debug(`First 3 terrain points:`, terrainPoints.slice(0, 3).map(p => `${p.distance.toFixed(1)}NM @ ${p.terrainElevation!.toFixed(0)}ft`));
        return path;
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
            Waypoints: {waypointProfileData.length} |
            Terrain samples: {profileData.filter(p => p.terrainElevation !== undefined).length} |
            Clouds: {waypointProfileData.filter(p => p.cloudBase !== undefined).length} |
            Wind: {waypointProfileData.filter(p => p.windSpeed > 0).length}
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
        <!-- Waypoint info section - 3 fixed lines -->
        <div class="cursor-waypoint-info">
            <div class="cursor-row">
                {#if cursorData}
                    Altitude: {Math.round(cursorData.altitude)}ft | Terrain: {cursorData.terrainElevation !== undefined ? Math.round(cursorData.terrainElevation) + 'ft' : '--'} | Distance: {cursorData.distance.toFixed(1)}NM
                {:else}
                    Altitude: -- | Terrain: -- | Distance: --
                {/if}
            </div>
            <div class="cursor-row">
                {#if cursorData && cursorData.windSpeed > 0}
                    Wind: {cursorData.windSpeed.toFixed(0)}kt @ {Math.round(cursorData.windDir)}°
                    {#if cursorData.headwindComponent !== 0}
                        ({cursorData.headwindComponent > 0 ? 'HW' : 'TW'} {Math.abs(cursorData.headwindComponent).toFixed(0)}kt)
                    {/if}
                {:else}
                    Wind: --
                {/if}
                {#if cursorData?.cloudBase !== undefined}
                    | Cloud: {Math.round(cursorData.cloudBase)}-{Math.round(cursorData.cloudTop || 0)}ft
                {:else}
                    | Cloud: --
                {/if}
            </div>
            <div class="cursor-row cursor-condition" style="color: {cursorData?.condition ? getSegmentColor(cursorData.condition) : 'rgba(255,255,255,0.4)'};">
                {#if cursorData?.condition}
                    Conditions: {cursorData.condition.toUpperCase()}
                {:else}
                    Conditions: --
                {/if}
            </div>
        </div>
        <!-- Winds aloft section - 2 fixed lines -->
        <div class="cursor-winds-section">
            <div class="cursor-row winds-row">
                <span class="vertical-winds-label">Winds Aloft:</span>
                {#if cursorData?.verticalWinds && cursorData.verticalWinds.length > 0}
                    {@const filteredWinds = cursorData.verticalWinds.filter(w => w.altitudeFeet <= maxAltitude).sort((a, b) => b.altitudeFeet - a.altitudeFeet)}
                    {#each filteredWinds.slice(0, 4) as wind}
                        {@const isFlightLevel = cursorData && Math.abs(wind.altitudeFeet - cursorData.altitude) < 500}
                        <span class="wind-level" class:flight-level={isFlightLevel}>
                            {Math.round(wind.altitudeFeet/1000)}k:{String(Math.round(wind.windDir)).padStart(3, '0')}°/{Math.round(wind.windSpeed)}kt
                        </span>
                    {/each}
                {:else}
                    <span class="wind-level-empty">No data</span>
                {/if}
            </div>
            <div class="cursor-row winds-row">
                {#if cursorData?.verticalWinds && cursorData.verticalWinds.length > 0}
                    {@const filteredWinds = cursorData.verticalWinds.filter(w => w.altitudeFeet <= maxAltitude).sort((a, b) => b.altitudeFeet - a.altitudeFeet)}
                    {#if filteredWinds.length > 4}
                        {#each filteredWinds.slice(4, 8) as wind}
                            {@const isFlightLevel = cursorData && Math.abs(wind.altitudeFeet - cursorData.altitude) < 500}
                            <span class="wind-level" class:flight-level={isFlightLevel}>
                                {Math.round(wind.altitudeFeet/1000)}k:{String(Math.round(wind.windDir)).padStart(3, '0')}°/{Math.round(wind.windSpeed)}kt
                            </span>
                        {/each}
                    {/if}
                {/if}
            </div>
        </div>
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
            <!-- SVG Definitions -->
            <defs>
                <linearGradient id="terrainGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" style="stop-color:#d4a574;stop-opacity:1" />
                    <stop offset="40%" style="stop-color:#a67c52;stop-opacity:1" />
                    <stop offset="100%" style="stop-color:#6b4423;stop-opacity:1" />
                </linearGradient>
            </defs>

            <!-- Force re-render when scale changes -->
            {#key scaleKey}
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

            <!-- Cloud areas (at waypoints only) -->
            {#each waypointProfileData as point, index}
                {#if index < waypointProfileData.length - 1}
                    {@const nextPoint = waypointProfileData[index + 1]}
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

            <!-- Terrain polygon -->
            {#if terrainPath}
                <polygon
                    points={terrainPath}
                    fill="url(#terrainGradient)"
                    stroke="#8b6914"
                    stroke-width="2.5"
                    opacity="1"
                />
            {/if}

            <!-- Altitude profile line (waypoints only, segmented by condition) -->
            {#each waypointProfileData as point, index}
                {#if index < waypointProfileData.length - 1}
                    {@const nextPoint = waypointProfileData[index + 1]}
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

            <!-- Vertical wind barbs at multiple altitude levels -->
            {#each waypointProfileData as point, pointIndex}
                {#if point.verticalWinds && point.verticalWinds.length > 0}
                    {@const x = distanceToX(point.distance)}
                    <!-- Render wind barbs at each altitude level within maxAltitude -->
                    {#each point.verticalWinds.filter(w => w.altitudeFeet <= maxAltitude && w.windSpeed >= 3) as wind}
                        {@const y = altitudeToY(wind.altitudeFeet)}
                        {@const color = getWindLevelColor(wind.altitudeFeet, point.altitude)}
                        {@const windBarb = generateSmallWindBarb(x, y, wind.windDir, wind.windSpeed)}

                        <!-- Wind barb staff -->
                        {#if windBarb.staff}
                            <path
                                d={windBarb.staff}
                                stroke={color}
                                stroke-width="1.5"
                                fill="none"
                            />
                        {/if}

                        <!-- Wind barb features -->
                        {#each windBarb.barbs as barb}
                            <path
                                d={barb.path}
                                stroke={color}
                                stroke-width="1.5"
                                fill={barb.type === 'triangle' ? color : 'none'}
                                stroke-linejoin="miter"
                            />
                        {/each}

                        <!-- Small dot at wind level position -->
                        <circle
                            cx={x}
                            cy={y}
                            r="2"
                            fill={color}
                        />
                    {/each}
                {/if}
            {/each}

            <!-- Waypoint markers -->
            {#each waypointProfileData as point}
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
            {/key}
        </svg>
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
        font-size: 11px;
        color: rgba(255, 255, 255, 0.9);
        text-align: center;
        display: flex;
        flex-direction: column;
        gap: 6px;
    }

    .cursor-waypoint-info {
        display: flex;
        flex-direction: column;
        gap: 2px;
    }

    .cursor-winds-section {
        display: flex;
        flex-direction: column;
        gap: 2px;
        padding-top: 4px;
        border-top: 1px solid rgba(255, 255, 255, 0.2);
    }

    .cursor-row {
        height: 16px;
        line-height: 16px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }

    .winds-row {
        display: flex;
        justify-content: center;
        gap: 6px;
        flex-wrap: nowrap;
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

    .vertical-winds-label {
        color: rgba(255, 255, 255, 0.7);
        font-weight: bold;
        font-size: 10px;
    }

    .wind-level {
        color: rgba(255, 255, 255, 0.6);
        padding: 1px 3px;
        background: rgba(255, 255, 255, 0.1);
        border-radius: 3px;
        font-size: 10px;
    }

    .wind-level.flight-level {
        color: rgba(76, 175, 80, 1);
        background: rgba(76, 175, 80, 0.2);
        font-weight: bold;
    }

    .wind-level-empty {
        color: rgba(255, 255, 255, 0.4);
        font-size: 10px;
        font-style: italic;
    }

    .cursor-condition {
        font-weight: bold;
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
</style>

