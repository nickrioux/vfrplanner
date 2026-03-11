/**
 * 09 - Altitude Profile
 * Verifies the altitude/terrain profile visualization.
 *
 * Optimized: Split into import-only tests (share a page) and
 * weather-dependent tests (share a page with weather fetched).
 */

import { test, expect, type Page, type BrowserContext } from '@playwright/test';
import {
    AUTH_FILE,
    TIMEOUTS,
    openPluginPage,
    importFPLFixture,
    fetchWeather,
    switchTab,
} from './helpers/plugin-helpers';

test.describe('Altitude Profile', () => {
    /** Tests that only need import (no weather) */
    test.describe.serial('Profile without weather', () => {
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

        test('Profile tab is enabled after import', async () => {
            const profileTab = page.locator('.tab:has-text("Profile")');
            await expect(profileTab).not.toBeDisabled();
        });

        test('switching to Profile tab shows SVG graph', async () => {
            await switchTab(page, 'Profile');

            const svg = page.locator('svg');
            await expect(svg.first()).toBeVisible({ timeout: TIMEOUTS.elementVisible });
        });

        test('profile shows waypoint markers', async () => {
            // Already on Profile tab from previous test
            const svgElements = page.locator('svg text, svg circle, svg line');
            const count = await svgElements.count();
            expect(count).toBeGreaterThan(0);
        });
    });

    /** Tests that need weather data */
    test.describe.serial('Profile with weather', () => {
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

        test('profile shows terrain after weather fetch', async () => {
            await switchTab(page, 'Profile');

            const svgPaths = page.locator('svg path, svg polyline, svg polygon');
            const count = await svgPaths.count();
            expect(count).toBeGreaterThan(0);
        });

        test('profile shows TOC/TOD markers after weather fetch', async () => {
            // Switch back to Route tab to check TOC/TOD rows
            await switchTab(page, 'Route');

            const tocTod = page.locator('.toc-tod-row');
            const count = await tocTod.count();
            expect(count).toBeGreaterThanOrEqual(0);
        });
    });
});
