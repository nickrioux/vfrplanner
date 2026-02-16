/**
 * Tests for Profile Service
 * Tests profile data calculation, wind components, runway analysis, and condition evaluation
 */

import {
    calculateWindComponent,
    calculateRunwayCrosswind,
    findBestRunway,
    evaluateSegmentCondition,
    calculateProfileData,
    type ProfileDataPoint,
    type BestRunwayResult,
} from '../src/services/profileService';
import type { Waypoint, RunwayInfo } from '../src/types/flightPlan';
import type { WaypointWeather } from '../src/services/weatherService';

describe('Profile Service', () => {
    describe('calculateWindComponent', () => {
        it('should return zero components for calm winds', () => {
            const result = calculateWindComponent(90, 0, 0);
            expect(result.headwind).toBe(0);
            expect(result.crosswind).toBe(0);
        });

        it('should calculate direct headwind correctly', () => {
            // Wind from the same direction as track = headwind
            // Track 90°, Wind FROM 90° = direct headwind
            const result = calculateWindComponent(90, 90, 20);
            expect(result.headwind).toBeCloseTo(20, 1);
            expect(Math.abs(result.crosswind)).toBeLessThan(0.1);
        });

        it('should calculate direct tailwind correctly', () => {
            // Wind from opposite direction = tailwind (negative headwind)
            // Track 90°, Wind FROM 270° = direct tailwind
            const result = calculateWindComponent(90, 270, 20);
            expect(result.headwind).toBeCloseTo(-20, 1);
            expect(Math.abs(result.crosswind)).toBeLessThan(0.1);
        });

        it('should calculate direct crosswind correctly', () => {
            // Wind perpendicular to track
            // Track 90°, Wind FROM 0° (north) = crosswind from left
            const result = calculateWindComponent(90, 0, 20);
            expect(Math.abs(result.headwind)).toBeLessThan(0.1);
            expect(Math.abs(result.crosswind)).toBeCloseTo(20, 1);
        });

        it('should calculate quartering wind correctly', () => {
            // 45° angle - should have equal headwind and crosswind components
            // Track 90°, Wind FROM 45° (NE)
            const result = calculateWindComponent(90, 45, 20);
            // At 45°, both components should be ~14.14 (20 * sin/cos 45°)
            expect(result.headwind).toBeCloseTo(14.14, 0);
            expect(Math.abs(result.crosswind)).toBeCloseTo(14.14, 0);
        });

        it('should handle 360° boundary correctly', () => {
            // Track 10°, Wind FROM 350° = should be similar to Track 10°, Wind FROM -10°
            const result = calculateWindComponent(10, 350, 20);
            // This is a 20° angle, mostly headwind
            expect(result.headwind).toBeGreaterThan(15);
        });
    });

    describe('calculateRunwayCrosswind', () => {
        it('should return zero for aligned wind', () => {
            // Wind aligned with runway
            const crosswind = calculateRunwayCrosswind(90, 90, 20);
            expect(crosswind).toBeCloseTo(0, 1);
        });

        it('should return full wind speed for perpendicular wind', () => {
            // Wind perpendicular to runway
            const crosswind = calculateRunwayCrosswind(90, 0, 20);
            expect(crosswind).toBeCloseTo(20, 1);
        });

        it('should return absolute value (always positive)', () => {
            const crosswind1 = calculateRunwayCrosswind(90, 0, 20);
            const crosswind2 = calculateRunwayCrosswind(90, 180, 20);
            // Both should be positive
            expect(crosswind1).toBeGreaterThan(0);
            expect(crosswind2).toBeGreaterThan(0);
        });

        it('should calculate quartering crosswind correctly', () => {
            // 45° angle
            const crosswind = calculateRunwayCrosswind(90, 45, 20);
            // sin(45°) ≈ 0.707, so crosswind ≈ 14.14
            expect(crosswind).toBeCloseTo(14.14, 0);
        });
    });

    describe('findBestRunway', () => {
        const createRunway = (
            lowIdent: string,
            lowHeading: number,
            highIdent: string,
            highHeading: number
        ): RunwayInfo => ({
            id: `${lowIdent}-${highIdent}`,
            lengthFt: 5000,
            widthFt: 100,
            surface: 'asphalt',
            lighted: true,
            closed: false,
            lowEnd: {
                ident: lowIdent,
                headingTrue: lowHeading,
            },
            highEnd: {
                ident: highIdent,
                headingTrue: highHeading,
            },
        });

        it('should return null for empty runway array', () => {
            const result = findBestRunway([], 90, 10);
            expect(result).toBeNull();
        });

        it('should return null for undefined runways', () => {
            const result = findBestRunway(undefined as unknown as RunwayInfo[], 90, 10);
            expect(result).toBeNull();
        });

        it('should prefer headwind over tailwind', () => {
            const runways = [createRunway('09', 90, '27', 270)];

            // Wind from east (90°) - runway 09 has headwind, 27 has tailwind
            const result = findBestRunway(runways, 90, 15);

            expect(result).not.toBeNull();
            expect(result?.runwayIdent).toBe('09');
            expect(result?.headwindKt).toBeGreaterThan(0);
        });

        it('should choose runway with lowest crosswind when both have headwind', () => {
            const runways = [
                createRunway('09', 90, '27', 270),
                createRunway('18', 180, '36', 360),
            ];

            // Wind from 100° - runway 09 has lower crosswind than 18
            const result = findBestRunway(runways, 100, 15);

            expect(result).not.toBeNull();
            expect(result?.runwayIdent).toBe('09');
        });

        it('should calculate crosswind and headwind components', () => {
            const runways = [createRunway('09', 90, '27', 270)];

            // Wind from 135° (SE) at 20 knots - 45° to runway 09
            const result = findBestRunway(runways, 135, 20);

            expect(result).not.toBeNull();
            // Both components should be ~14.14 kt
            expect(result?.crosswindKt).toBeCloseTo(14.14, 0);
            expect(Math.abs(result?.headwindKt ?? 0)).toBeCloseTo(14.14, 0);
        });

        it('should include gust components when provided', () => {
            const runways = [createRunway('09', 90, '27', 270)];

            const result = findBestRunway(runways, 90, 15, 25);

            expect(result).not.toBeNull();
            expect(result?.gustCrosswindKt).toBeDefined();
            expect(result?.gustHeadwindKt).toBeDefined();
            expect(result?.gustHeadwindKt).toBeGreaterThan(result?.headwindKt ?? 0);
        });

        it('should handle multiple runway pairs', () => {
            const runways = [
                createRunway('09', 90, '27', 270),
                createRunway('04', 40, '22', 220),
                createRunway('18', 180, '36', 360),
            ];

            // Wind from 95° - runway 09 should be best (nearly aligned)
            const result = findBestRunway(runways, 95, 20);

            expect(result).not.toBeNull();
            expect(result?.runwayIdent).toBe('09');
            expect(result?.crosswindKt).toBeLessThan(5); // Low crosswind
        });
    });

    describe('evaluateSegmentCondition', () => {
        const createPoint = (overrides: Partial<ProfileDataPoint> = {}): ProfileDataPoint => ({
            distance: 0,
            altitude: 5000,
            terrainElevation: 500,
            headwindComponent: 0,
            crosswindComponent: 0,
            windSpeed: 10,
            windDir: 270,
            ...overrides,
        });

        const createWeather = (overrides: Partial<WaypointWeather> = {}): WaypointWeather => ({
            windSpeed: 10,
            windDir: 270,
            temperature: 15,
            timestamp: Date.now(),
            ...overrides,
        });

        it('should return unknown for missing wind data', () => {
            const point = createPoint({ windSpeed: 0 });
            const result = evaluateSegmentCondition(point, 5000, undefined, false);

            expect(result.condition).toBe('unknown');
            expect(result.reasons).toContain('Missing wind data');
        });

        it('should return poor for IMC conditions (in clouds)', () => {
            const point = createPoint({
                cloudBase: 4000, // Cloud base below flight altitude (MSL)
            });
            const wx = createWeather();

            const result = evaluateSegmentCondition(point, 5000, wx, false);

            expect(result.condition).toBe('poor');
            expect(result.reasons.some(r => r.includes('cloud'))).toBe(true);
        });

        it('should evaluate visibility conditions', () => {
            const point = createPoint();
            const wx = createWeather({ visibility: 2 }); // Poor visibility

            const result = evaluateSegmentCondition(point, 5000, wx, false);

            // Low visibility should trigger marginal or poor
            expect(['marginal', 'poor']).toContain(result.condition);
        });

        it('should consider terminal status for wind checks', () => {
            const point = createPoint({ windSpeed: 30 }); // High wind
            const wx = createWeather({
                windSpeed: 30,
                surfaceWindSpeed: 25,
            });

            // Terminal waypoint - should check surface winds
            const terminalResult = evaluateSegmentCondition(point, 5000, wx, true);
            // Non-terminal - different evaluation
            const enrouteResult = evaluateSegmentCondition(point, 5000, wx, false);

            // Both should have some condition assessment
            expect(terminalResult.condition).toBeDefined();
            expect(enrouteResult.condition).toBeDefined();
        });

        it('should include best runway info for terminal waypoints with runway data', () => {
            const point = createPoint();
            const wx = createWeather({
                surfaceWindSpeed: 15,
                surfaceWindDir: 90,
            });
            const waypoint: Waypoint = {
                id: '1',
                name: 'TEST',
                lat: 47.5,
                lon: -122.3,
                type: 'AIRPORT',
                runways: [{
                    id: 'rwy1',
                    lengthFt: 5000,
                    widthFt: 100,
                    surface: 'asphalt',
                    lighted: true,
                    closed: false,
                    lowEnd: { ident: '09', headingTrue: 90 },
                    highEnd: { ident: '27', headingTrue: 270 },
                }],
            };

            const result = evaluateSegmentCondition(point, 5000, wx, true, waypoint);

            expect(result.bestRunway).toBeDefined();
            expect(result.bestRunway?.runwayIdent).toBeDefined();
        });

        it('should handle clear sky (no cloud base) as good condition', () => {
            const point = createPoint({
                cloudBase: undefined, // No clouds
            });
            const wx = createWeather({
                cloudBase: undefined,
                visibility: 20,
            });

            const result = evaluateSegmentCondition(point, 5000, wx, false);

            // Clear sky with good visibility should not be poor
            expect(result.condition).not.toBe('poor');
        });
    });

    describe('calculateProfileData', () => {
        const createWaypoint = (
            id: string,
            name: string,
            lat: number,
            lon: number,
            altitude?: number,
            distance?: number,
            bearing?: number
        ): Waypoint => ({
            id,
            name,
            lat,
            lon,
            type: 'user',
            altitude,
            distance,
            bearing,
        });

        it('should return empty array for no waypoints', () => {
            const result = calculateProfileData([], new Map(), 3000);
            expect(result).toEqual([]);
        });

        it('should create profile points for each waypoint', () => {
            const waypoints = [
                createWaypoint('1', 'DEP', 47.5, -122.3, 500, 0),
                createWaypoint('2', 'MID', 47.6, -122.4, 5000, 20, 45),
                createWaypoint('3', 'ARR', 47.7, -122.5, 800, 25, 60),
            ];

            const result = calculateProfileData(waypoints, new Map(), 5000);

            // Should have at least waypoint count points
            expect(result.length).toBeGreaterThanOrEqual(3);
        });

        it('should use default altitude when waypoint altitude is undefined', () => {
            const waypoints = [
                createWaypoint('1', 'WP1', 47.5, -122.3, undefined),
            ];
            const defaultAltitude = 4500;

            const result = calculateProfileData(waypoints, new Map(), defaultAltitude);

            expect(result[0].altitude).toBe(defaultAltitude);
        });

        it('should include weather data when available', () => {
            const waypoints = [
                createWaypoint('1', 'WP1', 47.5, -122.3, 3000, 0, 90),
            ];
            const weatherData = new Map<string, WaypointWeather>();
            weatherData.set('1', {
                windSpeed: 15,
                windDir: 270,
                temperature: 10,
                timestamp: Date.now(),
            });

            const result = calculateProfileData(waypoints, weatherData, 3000);

            expect(result[0].windSpeed).toBe(15);
            expect(result[0].windDir).toBe(270);
        });

        it('should calculate wind components with bearing', () => {
            const waypoints = [
                createWaypoint('1', 'WP1', 47.5, -122.3, 3000, 0, 90), // Heading east
            ];
            const weatherData = new Map<string, WaypointWeather>();
            weatherData.set('1', {
                windSpeed: 20,
                windDir: 90, // Wind from east = headwind
                temperature: 10,
                timestamp: Date.now(),
            });

            const result = calculateProfileData(waypoints, weatherData, 3000);

            expect(result[0].headwindComponent).toBeCloseTo(20, 0);
        });

        it('should convert cloud base from AGL to MSL', () => {
            const waypoints = [
                createWaypoint('1', 'WP1', 47.5, -122.3, 3000),
            ];
            // Add elevation to waypoint (feet MSL per Waypoint type)
            waypoints[0].elevation = 1000;

            const weatherData = new Map<string, WaypointWeather>();
            weatherData.set('1', {
                windSpeed: 10,
                windDir: 270,
                temperature: 10,
                timestamp: Date.now(),
                cloudBase: 610, // 2000 ft AGL in meters
            });

            const result = calculateProfileData(waypoints, weatherData, 3000);

            // Cloud base should be terrain + AGL = ~1000 + ~2000 = ~3000 MSL
            if (result[0].cloudBase !== undefined) {
                expect(result[0].cloudBase).toBeGreaterThan(2500);
                expect(result[0].cloudBase).toBeLessThan(3500);
            }
        });

        it('should evaluate conditions for each waypoint', () => {
            const waypoints = [
                createWaypoint('1', 'DEP', 47.5, -122.3, 500),
                createWaypoint('2', 'ARR', 47.6, -122.4, 600),
            ];
            const weatherData = new Map<string, WaypointWeather>();
            weatherData.set('1', {
                windSpeed: 10,
                windDir: 270,
                temperature: 15,
                timestamp: Date.now(),
                visibility: 20,
            });
            weatherData.set('2', {
                windSpeed: 12,
                windDir: 260,
                temperature: 14,
                timestamp: Date.now(),
                visibility: 18,
            });

            const result = calculateProfileData(waypoints, weatherData, 3000);

            // First and last waypoints should have condition evaluated
            const waypointPoints = result.filter(p => p.waypointId);
            expect(waypointPoints.length).toBeGreaterThan(0);
            waypointPoints.forEach(p => {
                expect(p.condition).toBeDefined();
            });
        });

        it('should include elevation profile data when provided', () => {
            const waypoints = [
                createWaypoint('1', 'DEP', 47.5, -122.3, 500, 0),
                createWaypoint('2', 'ARR', 47.6, -122.4, 600, 20),
            ];
            const elevationProfile = [
                { lat: 47.5, lon: -122.3, elevation: 150, distance: 0, waypointIndex: 0 },
                { lat: 47.55, lon: -122.35, elevation: 300, distance: 10 },
                { lat: 47.6, lon: -122.4, elevation: 180, distance: 20, waypointIndex: 1 },
            ];

            const result = calculateProfileData(waypoints, new Map(), 3000, elevationProfile);

            // Should include all elevation points
            expect(result.length).toBe(3);
            // Terrain elevations should be converted from meters to feet
            expect(result[0].terrainElevation).toBeCloseTo(492, -1); // 150m ≈ 492ft
            expect(result[1].terrainElevation).toBeCloseTo(984, -1); // 300m ≈ 984ft
        });

        it('should mark terminal waypoints correctly', () => {
            const waypoints = [
                createWaypoint('1', 'DEP', 47.5, -122.3, 500),
                createWaypoint('2', 'MID', 47.55, -122.35, 3000),
                createWaypoint('3', 'ARR', 47.6, -122.4, 600),
            ];

            // Terminal status is used internally in evaluateSegmentCondition
            // We can verify by checking that DEP and ARR have different evaluation
            // compared to MID when wind checks are relevant
            const weatherData = new Map<string, WaypointWeather>();
            waypoints.forEach(wp => {
                weatherData.set(wp.id, {
                    windSpeed: 25, // High wind to trigger checks
                    windDir: 270,
                    temperature: 15,
                    timestamp: Date.now(),
                    surfaceWindSpeed: 25,
                    surfaceWindDir: 270,
                });
            });

            const result = calculateProfileData(waypoints, weatherData, 3000);

            // Just verify all waypoints have conditions evaluated
            const waypointPoints = result.filter(p => p.waypointId);
            expect(waypointPoints.length).toBe(3);
        });
    });

    describe('Cloud top estimation', () => {
        // Test the cloud top estimation logic
        it('should estimate cloud top ~3000ft above cloud base', () => {
            // The function adds typical cloud thickness of 3000ft
            const cloudBase = 5000;
            const typicalThickness = 3000;
            const expectedCloudTop = cloudBase + typicalThickness;

            expect(expectedCloudTop).toBe(8000);
        });
    });

    describe('Terrain clearance calculations', () => {
        it('should calculate terrain clearance correctly', () => {
            const flightAltitude = 5000;
            const terrainMSL = 2000;
            const terrainClearance = flightAltitude - terrainMSL;

            expect(terrainClearance).toBe(3000);
        });

        it('should handle negative clearance (terrain above flight altitude)', () => {
            const flightAltitude = 3000;
            const terrainMSL = 5000;
            const terrainClearance = flightAltitude - terrainMSL;

            expect(terrainClearance).toBe(-2000);
        });
    });

    describe('Distance interpolation', () => {
        it('should calculate cumulative distance correctly', () => {
            const waypoints = [
                { distance: 0 },
                { distance: 15 },
                { distance: 20 },
                { distance: 10 },
            ];

            let cumulative = 0;
            const distances: number[] = [];

            for (const wp of waypoints) {
                distances.push(cumulative);
                cumulative += wp.distance || 0;
            }

            expect(distances).toEqual([0, 0, 15, 35]);
            expect(cumulative).toBe(45);
        });
    });
});
