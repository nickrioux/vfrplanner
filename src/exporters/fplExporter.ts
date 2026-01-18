/**
 * FPL file exporter
 * Exports flight plans to ForeFlight/Garmin FPL format
 * Based on Garmin FlightPlan v1 XML schema
 */

import type { FlightPlan, Waypoint } from '../types/flightPlan';

/**
 * Convert a flight plan to FPL XML string (ForeFlight/Garmin format)
 */
export function exportToFPL(flightPlan: FlightPlan): string {
    const timestamp = new Date().toISOString();

    const waypointsXml = flightPlan.waypoints
        .map((wp) => createWaypointXml(wp))
        .join('\n        ');

    const routePointsXml = flightPlan.waypoints
        .map((wp) => createRoutePointXml(wp))
        .join('\n            ');

    return `<?xml version="1.0" encoding="utf-8"?>
<flight-plan xmlns="http://www8.garmin.com/xmlschemas/FlightPlan/v1">
    <created>${timestamp}</created>
    <waypoint-table>
        ${waypointsXml}
    </waypoint-table>
    <route>
        <route-name>${escapeXml(flightPlan.name)}</route-name>
        <flight-plan-index>1</flight-plan-index>
        ${routePointsXml}
    </route>
</flight-plan>`;
}

function createWaypointXml(wp: Waypoint): string {
    const countryCode = getCountryCode(wp);
    const identifier = wp.name || 'UNNAMED';
    const waypointType = wp.type || 'USER WAYPOINT';
    const lat = typeof wp.lat === 'number' ? wp.lat.toFixed(6) : '0.000000';
    const lon = typeof wp.lon === 'number' ? wp.lon.toFixed(6) : '0.000000';
    const elevationXml = wp.elevation !== undefined && typeof wp.elevation === 'number'
        ? `\n            <elevation>${wp.elevation.toFixed(1)}</elevation>`
        : '';
    const commentXml = wp.comment
        ? `\n            <comment>${escapeXml(wp.comment)}</comment>`
        : '';

    return `<waypoint>
            <identifier>${escapeXml(identifier)}</identifier>
            <type>${waypointType}</type>
            <country-code>${countryCode}</country-code>
            <lat>${lat}</lat>
            <lon>${lon}</lon>${elevationXml}${commentXml}
        </waypoint>`;
}

function createRoutePointXml(wp: Waypoint): string {
    const countryCode = getCountryCode(wp);
    const identifier = wp.name || 'UNNAMED';
    const waypointType = wp.type || 'USER WAYPOINT';

    return `<route-point>
                <waypoint-identifier>${escapeXml(identifier)}</waypoint-identifier>
                <waypoint-type>${waypointType}</waypoint-type>
                <waypoint-country-code>${countryCode}</waypoint-country-code>
            </route-point>`;
}

function getCountryCode(wp: Waypoint): string {
    // Use stored country code if available (from OpenAIP or imported FPL)
    if (wp.countryCode) {
        return wp.countryCode;
    }
    // For user waypoints or unknown, use generic code
    return '__';
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
export function downloadFPL(flightPlan: FlightPlan): void {
    const fplContent = exportToFPL(flightPlan);
    const blob = new Blob([fplContent], { type: 'application/xml' });
    const url = URL.createObjectURL(blob);

    const filename = `${flightPlan.name.replace(/[^a-zA-Z0-9-_]/g, '_')}.fpl`;

    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}
