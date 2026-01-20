/**
 * GPX file exporter
 * Exports flight plans to GPX format for GPS devices
 */

import type { FlightPlan, Waypoint } from '../types/flightPlan';
import { feetToMeters } from '../utils/units';

/**
 * Convert a flight plan to GPX XML string
 */
export function exportToGPX(flightPlan: FlightPlan): string {
    const timestamp = new Date().toISOString();

    const waypointsXml = flightPlan.waypoints
        .map((wp) => createWaypointXml(wp))
        .join('\n    ');

    const routePointsXml = flightPlan.waypoints
        .map((wp) => createRoutePointXml(wp))
        .join('\n      ');

    return `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="VFR Flight Planner - Windy Plugin"
  xmlns="http://www.topografix.com/GPX/1/1"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xsi:schemaLocation="http://www.topografix.com/GPX/1/1 http://www.topografix.com/GPX/1/1/gpx.xsd">
  <metadata>
    <name>${escapeXml(flightPlan.name)}</name>
    <time>${timestamp}</time>
  </metadata>

  <!-- Waypoints -->
  ${waypointsXml}

  <!-- Route -->
  <rte>
    <name>${escapeXml(flightPlan.name)}</name>
    ${routePointsXml}
  </rte>
</gpx>`;
}

function createWaypointXml(wp: Waypoint): string {
    const elevationXml = wp.elevation !== undefined
        ? `\n      <ele>${feetToMeters(wp.elevation).toFixed(1)}</ele>`
        : '';

    const commentXml = wp.comment
        ? `\n      <cmt>${escapeXml(wp.comment)}</cmt>`
        : '';

    const descXml = wp.type !== 'USER WAYPOINT'
        ? `\n      <desc>${escapeXml(wp.type)}</desc>`
        : '';

    return `<wpt lat="${wp.lat.toFixed(6)}" lon="${wp.lon.toFixed(6)}">
      <name>${escapeXml(wp.name)}</name>${elevationXml}${commentXml}${descXml}
      <sym>${getGpxSymbol(wp.type)}</sym>
    </wpt>`;
}

function createRoutePointXml(wp: Waypoint): string {
    const elevationXml = wp.elevation !== undefined
        ? `\n        <ele>${feetToMeters(wp.elevation).toFixed(1)}</ele>`
        : '';

    return `<rtept lat="${wp.lat.toFixed(6)}" lon="${wp.lon.toFixed(6)}">
        <name>${escapeXml(wp.name)}</name>${elevationXml}
      </rtept>`;
}

function getGpxSymbol(type: string): string {
    switch (type) {
        case 'AIRPORT': return 'Airport';
        case 'VOR': return 'Navaid, VOR';
        case 'NDB': return 'Navaid, NDB';
        case 'INT':
        case 'INT-VRP': return 'Waypoint';
        case 'USER WAYPOINT':
        default: return 'Flag, Blue';
    }
}

function escapeXml(str: string): string {
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}

/**
 * Trigger a file download in the browser
 */
export function downloadGPX(flightPlan: FlightPlan): void {
    const gpxContent = exportToGPX(flightPlan);
    const blob = new Blob([gpxContent], { type: 'application/gpx+xml' });
    const url = URL.createObjectURL(blob);

    const filename = `${flightPlan.name.replace(/[^a-zA-Z0-9-_]/g, '_')}.gpx`;

    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}
