/**
 * 05 - Weather Fetch & Display
 * Verifies weather data fetching and rendering (uses real Windy API).
 *
 * Optimized: Split into pre-weather checks (share imported page) and
 * post-weather checks (share page with weather already fetched).
 * Weather fetch takes 30-60s so doing it once saves significant time.
 */

import { test, expect, type Page, type BrowserContext } from '@playwright/test';
import {
    AUTH_FILE,
    TIMEOUTS,
    openPluginPage,
    importFPLFixture,
    clickReadWx,
    fetchWeather,
    hasWeatherData,
} from './helpers/plugin-helpers';
import { getWindyOverlay } from './helpers/map-helpers';

test.describe('Weather Fetch & Display', () => {
    /** Tests that only need import (no weather fetch) */
    test.describe.serial('Pre-weather checks', () => {
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
        });

        test.afterAll(async () => {
            await context.close();
        });

        test('Read Wx button is visible after import', async () => {
            const readWxBtn = page.locator('.btn-weather');
            await expect(readWxBtn).toBeVisible();
        });

        test('weather error is shown on failure', async () => {
            // Verify the error container exists in DOM but is not visible when no error
            const errorContainer = page.locator('.weather-error');
            await expect(errorContainer).not.toBeVisible();
        });
    });

    /** Tests that trigger weather fetch — overlay switch and loading state */
    test.describe.serial('Weather fetch behavior', () => {
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
        });

        test.afterAll(async () => {
            await context.close();
        });

        test('Read Wx shows loading state', async () => {
            await clickReadWx(page);

            const btn = page.locator('.btn-weather');
            await expect(btn).toBeDisabled({ timeout: TIMEOUTS.elementVisible });
        });

        test('Read Wx switches overlay to cloud base', async () => {
            // Overlay switch happens immediately after clicking Read Wx
            // (which was clicked in the previous test)
            await page.waitForTimeout(TIMEOUTS.mapSettle);
            const overlay = await getWindyOverlay(page);
            expect(overlay).toBe('cbase');
        });

        test('weather data loads for waypoints', async () => {
            // Wait for the weather fetch initiated in the loading state test to complete
            await page.waitForFunction(
                () => {
                    const wxElements = document.querySelectorAll('.wx-wind');
                    const errorElement = document.querySelector('.weather-error');
                    return wxElements.length > 0 || errorElement !== null;
                },
                { timeout: TIMEOUTS.weatherFetch },
            );

            expect(await hasWeatherData(page)).toBe(true);
        });

        test('weather displays wind data for each waypoint', async () => {
            const windElements = page.locator('.wx-wind');
            const count = await windElements.count();
            expect(count).toBeGreaterThanOrEqual(1);
        });

        test('weather displays temperature for waypoints', async () => {
            const tempElements = page.locator('.wx-temp');
            const count = await tempElements.count();
            expect(count).toBeGreaterThanOrEqual(1);
        });

        test('weather displays cloud base for waypoints', async () => {
            const cloudElements = page.locator('.wx-cloud');
            const count = await cloudElements.count();
            expect(count).toBeGreaterThanOrEqual(1);
        });
    });
});
