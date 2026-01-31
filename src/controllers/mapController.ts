/**
 * Map Controller - Manages Leaflet map layers for route visualization
 * Extracted from plugin.svelte to improve separation of concerns
 */

import { map } from '@windy/map';
import * as L from 'leaflet';

import { routeStore } from '../stores/routeStore';
import { weatherStore } from '../stores/weatherStore';
import { settingsStore } from '../stores/settingsStore';

import { calculateProfileData } from '../services/profileService';
import { getActiveThresholds } from '../services/vfrConditionRules';
import { getSegmentColor, getMarkerColor, getBestRunway } from '../utils/displayUtils';
import { formatWind, formatTemperature, type WaypointWeather } from '../services/weatherService';
import { formatBearing, formatDistance } from '../services/navigationCalc';
import { logger } from '../services/logger';

import type { FlightPlan, Waypoint } from '../types';

/**
 * Dependencies needed by the map controller
 * These are injected to avoid tight coupling with plugin.svelte
 */
export interface MapControllerDeps {
    /** Callback when a route segment is clicked (for inserting waypoints) */
    onSegmentClick: (segmentIndex: number, lat: number, lon: number) => void;
    /** Callback when a waypoint marker is dragged */
    onMarkerDrag: (waypointId: string, lat: number, lon: number) => void;
    /** Callback when a waypoint marker is clicked */
    onMarkerClick: (waypointId: string) => void;
}

let deps: MapControllerDeps | null = null;

// Map layers state
let routeLayer: L.LayerGroup | null = null;
let waypointMarkers: L.LayerGroup | null = null;
let markerMap: Map<string, L.Marker> = new Map();

/**
 * Initialize the map controller with dependencies
 */
export function initMapController(dependencies: MapControllerDeps): void {
    deps = dependencies;
}

/**
 * Check if controller is initialized
 */
function ensureInitialized(): MapControllerDeps {
    if (!deps) {
        throw new Error('Map controller not initialized. Call initMapController first.');
    }
    return deps;
}

/**
 * Get weather data for a waypoint
 */
function getWaypointWeather(waypointId: string): WaypointWeather | undefined {
    const { weatherData } = weatherStore.getState();
    return weatherData.get(waypointId);
}

/**
 * Update map layers with current route and weather data
 * Renders color-coded route segments and waypoint markers
 */
export function updateMapLayers(): void {
    const { onSegmentClick, onMarkerDrag, onMarkerClick } = ensureInitialized();

    const settings = settingsStore.getState();
    const { flightPlan, isEditMode } = routeStore.getState();
    const { weatherData, elevationProfile } = weatherStore.getState();

    if (settings.enableLogging) {
        logger.debug('[MapController] updateMapLayers called, waypoints:', flightPlan?.waypoints.length);
        logger.debug('[MapController] routeLayer exists:', !!routeLayer, 'waypointMarkers exists:', !!waypointMarkers);
    }

    clearMapLayers();

    if (settings.enableLogging) {
        logger.debug('[MapController] After clearMapLayers: routeLayer:', !!routeLayer, 'waypointMarkers:', !!waypointMarkers);
    }

    if (!flightPlan || flightPlan.waypoints.length === 0) return;

    // Calculate profile data to get segment conditions
    // Use aircraft-aware thresholds based on category (airplane/helicopter) and region
    const thresholds = getActiveThresholds(settings);
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
        const segmentIndex = i; // Capture for closure
        segment.on('click', (e: L.LeafletMouseEvent) => {
            if (isEditMode) {
                L.DomEvent.stopPropagation(e);
                onSegmentClick(segmentIndex, e.latlng.lat, e.latlng.lng);
            }
        });

        // Change cursor when hovering if edit mode is enabled
        segment.on('mouseover', () => {
            if (routeStore.getState().isEditMode) {
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
        logger.debug('[MapController] Added routeLayer to map with', flightPlan.waypoints.length - 1, 'segments');
    }

    // Create waypoint markers
    waypointMarkers = new L.LayerGroup();
    markerMap.clear();

    flightPlan.waypoints.forEach((wp, index) => {
        let marker: L.Marker | L.CircleMarker;
        const currentIsEditMode = routeStore.getState().isEditMode;

        if (currentIsEditMode) {
            // Use regular marker for dragging in edit mode
            marker = new L.Marker([wp.lat, wp.lon], {
                draggable: true,
                icon: new L.DivIcon({
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
                onMarkerDrag(wp.id, latlng.lat, latlng.lng);
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
        const tooltipContent = buildWaypointTooltip(wp, index, flightPlan, profileData);

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
            onMarkerClick(wp.id);
        });

        waypointMarkers?.addLayer(marker);
    });

    if (settings.enableLogging) {
        logger.debug('[MapController] Created', flightPlan.waypoints.length, 'waypoint markers');
    }

    map.addLayer(waypointMarkers);

    if (settings.enableLogging) {
        logger.debug('[MapController] Added waypointMarkers layer to map');
        logger.debug('[MapController] Map has', (map as any).getLayers ? (map as any).getLayers().length : 'unknown', 'layers');
    }
}

/**
 * Build tooltip content for a waypoint marker
 */
function buildWaypointTooltip(
    wp: Waypoint,
    index: number,
    flightPlan: FlightPlan,
    profileData: ReturnType<typeof calculateProfileData>
): string {
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

    return tooltipContent;
}

/**
 * Clear all map layers
 */
export function clearMapLayers(): void {
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

/**
 * Fit map bounds to show the entire route
 */
export function fitMapToRoute(): void {
    const { flightPlan } = routeStore.getState();

    if (!flightPlan || flightPlan.waypoints.length === 0) return;

    const bounds = new L.LatLngBounds(
        flightPlan.waypoints.map(wp => [wp.lat, wp.lon] as [number, number])
    );

    map.fitBounds(bounds, { padding: [50, 50] });
}

/**
 * Get a marker by waypoint ID (for external access if needed)
 */
export function getMarker(waypointId: string): L.Marker | undefined {
    return markerMap.get(waypointId);
}
