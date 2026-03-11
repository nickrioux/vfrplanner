/**
 * 04 - Map Route Display
 * Verifies route rendering on the Windy/Leaflet map.
 *
 * Optimized: Read-only map checks share a single page with import done once.
 * The "clearing plan removes route" test needs its own page since it's destructive.
 */

import { test, expect, type Page, type BrowserContext } from '@playwright/test';
import {
    AUTH_FILE,
    TIMEOUTS,
    openPluginPage,
    importFPLFixture,
    clearFlightPlan,
    CYVBCYQB_WAYPOINTS,
} from './helpers/plugin-helpers';
import { hasRouteOnMap, getMarkerCount, getMapCenter, screenshotMap } from './helpers/map-helpers';

test.describe('Map Route Display', () => {
    /** Read-only map checks after a single import */
    test.describe.serial('Route display checks', () => {
        let page: Page;
        let context: BrowserContext;

        test.beforeAll(async ({ browser }) => {
            context = await browser.newContext({
                storageState: AUTH_FILE,
                ignoreHTTPSErrors: true,
            });
            page = await context.newPage();
            await openPluginPage(page);
            await importFPLFixture(page);
            // Wait for map to update after import
            await page.waitForTimeout(2000);
        });

        test.afterAll(async () => {
            await context.close();
        });

        test('route polyline appears on map after import', async () => {
            const hasRoute = await hasRouteOnMap(page);
            expect(hasRoute).toBe(true);
        });

        test('waypoint markers appear on map', async () => {
            const markerCount = await getMarkerCount(page);
            expect(markerCount).toBeGreaterThanOrEqual(CYVBCYQB_WAYPOINTS.length);
        });

        test('map centers on route after import', async () => {
            const center = await getMapCenter(page);
            expect(center.lat).toBeGreaterThan(45);
            expect(center.lat).toBeLessThan(50);
            expect(center.lon).toBeGreaterThan(-73);
            expect(center.lon).toBeLessThan(-64);
        });

        test('screenshot captures route on map', async () => {
            const screenshot = await screenshotMap(page, '04-route-display');
            expect(screenshot.length).toBeGreaterThan(0);
        });
    });

    /** Destructive test — clears the plan */
    test('clearing plan removes route from map', async ({ page }) => {
        await openPluginPage(page);
        await importFPLFixture(page);
        await page.waitForTimeout(2000);

        expect(await hasRouteOnMap(page)).toBe(true);

        await clearFlightPlan(page);
        await page.waitForTimeout(TIMEOUTS.mapSettle);

        expect(await hasRouteOnMap(page)).toBe(false);
    });
});
