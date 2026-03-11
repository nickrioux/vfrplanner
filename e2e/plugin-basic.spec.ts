/**
 * 01 - Plugin Loading & Initialization
 * Verifies the plugin loads correctly in the Windy dev environment.
 *
 * Optimized: Groups read-only tests into serial blocks sharing a single
 * browser page to avoid repeated navigation overhead.
 */

import { test, expect, type Page, type BrowserContext } from '@playwright/test';
import {
    AUTH_FILE,
    TIMEOUTS,
    waitForWindyLoad,
    openPluginPage,
    importFPLFixture,
} from './helpers/plugin-helpers';

test.describe('Plugin Loading & Initialization', () => {
    /** Tests that only need the Windy platform (no plugin) */
    test.describe.serial('Windy platform checks', () => {
        let page: Page;
        let context: BrowserContext;

        test.beforeAll(async ({ browser }) => {
            context = await browser.newContext({
                storageState: AUTH_FILE,
                ignoreHTTPSErrors: true,
            });
            page = await context.newPage();
            await page.goto('https://www.windy.com/');
            await waitForWindyLoad(page);
        });

        test.afterAll(async () => {
            await context.close();
        });

        test('Windy platform loads with map container', async () => {
            await expect(page.locator('#map-container')).toBeVisible();
        });

        test('Windy W global is available with store API', async () => {
            const hasStore = await page.evaluate(() => {
                return typeof window.W?.store?.get === 'function';
            });
            expect(hasStore).toBe(true);
        });
    });

    /** Tests that need the plugin loaded (read-only after load) */
    test.describe.serial('Plugin load checks', () => {
        let page: Page;
        let context: BrowserContext;

        test.beforeAll(async ({ browser }) => {
            context = await browser.newContext({
                storageState: AUTH_FILE,
                ignoreHTTPSErrors: true,
            });
            page = await context.newPage();
            await openPluginPage(page);
        });

        test.afterAll(async () => {
            await context.close();
        });

        test('Plugin panel auto-opens in dev mode', async () => {
            await expect(page.locator('.drop-zone')).toBeVisible();
        });

        test('Plugin shows import section with buttons', async () => {
            await expect(page.locator('.import-section')).toBeVisible();
            await expect(page.locator('.drop-zone')).toBeVisible();
        });

        test('Browse and New Plan buttons are visible', async () => {
            await expect(page.locator('.btn-browse')).toBeVisible();
            await expect(page.locator('.btn-new')).toBeVisible();
        });
    });

    /** Tests that need the plugin loaded AND a flight plan imported */
    test.describe.serial('Plugin with imported plan', () => {
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

        test('Tabs appear after importing a flight plan', async () => {
            await expect(page.locator('.tabs')).toBeVisible();
            await expect(page.locator('.tab:has-text("Route")')).toBeVisible();
            await expect(page.locator('.tab:has-text("Profile")')).toBeVisible();
            await expect(page.locator('.tab:has-text("Settings")')).toBeVisible();
            await expect(page.locator('.tab:has-text("About")')).toBeVisible();
        });

        test('Route tab is active by default after import', async () => {
            const routeTab = page.locator('.tab:has-text("Route")');
            await expect(routeTab).toHaveClass(/active/);
        });
    });

    /** Profile tab disabled test needs its own page (New Plan = empty state) */
    test('Profile tab is disabled without enough waypoints', async ({ page }) => {
        await openPluginPage(page);
        await page.locator('.btn-new').click();
        await page.waitForSelector('.tabs', { state: 'visible', timeout: TIMEOUTS.import });
        const profileTab = page.locator('.tab:has-text("Profile")');
        await expect(profileTab).toBeDisabled();
    });
});
