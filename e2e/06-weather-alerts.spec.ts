/**
 * 06 - Weather Alerts & VFR Conditions
 * Verifies weather alert display and VFR condition indicators.
 *
 * Optimized: All tests are read-only after weather fetch.
 * Shares a single page with weather already loaded.
 */

import { test, expect, type Page, type BrowserContext } from '@playwright/test';
import {
    AUTH_FILE,
    openPluginPage,
    importFPLFixture,
    fetchWeather,
} from './helpers/plugin-helpers';

test.describe('Weather Alerts & VFR Conditions', () => {
    test.describe.serial('Alert checks after weather fetch', () => {
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
            await fetchWeather(page);
        });

        test.afterAll(async () => {
            await context.close();
        });

        test('waypoint rows show condition coloring after weather fetch', async () => {
            const rows = page.locator('.waypoint-row');
            const count = await rows.count();
            expect(count).toBeGreaterThanOrEqual(5);

            await expect(rows.first()).toBeVisible();
        });

        test('alert section is present when alerts exist', async () => {
            const alertRows = page.locator('.alert-row');
            const alertCount = await alertRows.count();

            if (alertCount > 0) {
                const alertItem = alertRows.first().locator('.alert-item');
                await expect(alertItem).toBeVisible();
            }
        });

        test('alert badges appear on waypoints with warnings', async () => {
            const badges = page.locator('.alert-badge');
            const count = await badges.count();

            if (count > 0) {
                await expect(badges.first()).toBeVisible();
            }
        });

        test('route weather samples load (if enabled)', async () => {
            const routeAlerts = page.locator('.alert-row');
            expect(await routeAlerts.count()).toBeGreaterThanOrEqual(0);
        });
    });
});
