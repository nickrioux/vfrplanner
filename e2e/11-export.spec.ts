/**
 * 11 - Export Functionality
 * Verifies GPX and FPL export.
 *
 * Optimized: All tests share a single page with import done once.
 * Export menu open/close is lightweight and state is restored between tests.
 */

import { test, expect, type Page, type BrowserContext } from '@playwright/test';
import {
    AUTH_FILE,
    TIMEOUTS,
    openPluginPage,
    importFPLFixture,
    openExportMenu,
} from './helpers/plugin-helpers';

test.describe('Export Functionality', () => {
    test.describe.serial('Export checks', () => {
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

        test('Export button is visible after import', async () => {
            const exportBtn = page.locator('.btn-action:has-text("Export")');
            await expect(exportBtn).toBeVisible();
        });

        test('Export menu opens with options', async () => {
            await openExportMenu(page);
            await expect(page.locator('.export-menu')).toBeVisible();
            // Close menu for next test
            await page.locator('.export-backdrop').click();
            await expect(page.locator('.export-menu')).not.toBeVisible();
        });

        test('Export menu shows GPX option', async () => {
            await openExportMenu(page);
            const gpxOption = page.locator('.export-menu button:has-text("GPX")');
            await expect(gpxOption).toBeVisible();
            // Close menu
            await page.locator('.export-backdrop').click();
        });

        test('Export menu shows FPL option', async () => {
            await openExportMenu(page);
            const fplOption = page.locator('.export-menu button:has-text("FPL")');
            await expect(fplOption).toBeVisible();
            // Close menu
            await page.locator('.export-backdrop').click();
        });

        test('Windy Distance & Planning option exists', async () => {
            await openExportMenu(page);
            const windyOption = page.locator('.export-menu button:has-text("Distance")');
            await expect(windyOption).toBeVisible();
            // Close menu
            await page.locator('.export-backdrop').click();
        });

        test('GPX export triggers download', async () => {
            await openExportMenu(page);

            const downloadPromise = page.waitForEvent('download', { timeout: TIMEOUTS.download });
            await page.locator('.export-menu button:has-text("GPX")').click();

            const download = await downloadPromise;
            expect(download.suggestedFilename()).toContain('.gpx');
        });

        test('FPL export triggers download', async () => {
            await openExportMenu(page);

            const downloadPromise = page.waitForEvent('download', { timeout: TIMEOUTS.download });
            await page.locator('.export-menu button:has-text("FPL")').click();

            const download = await downloadPromise;
            expect(download.suggestedFilename()).toContain('.fpl');
        });

        test('Export menu closes when clicking backdrop', async () => {
            await openExportMenu(page);
            await expect(page.locator('.export-menu')).toBeVisible();

            await page.locator('.export-backdrop').click();
            await expect(page.locator('.export-menu')).not.toBeVisible();
        });
    });
});
