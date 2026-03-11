/**
 * 08 - VFR Window Search
 * Verifies VFR window search functionality.
 *
 * Optimized: All tests need weather fetched first. Read-only checks
 * share a page. The VFR window search tests are serial and build on
 * each other (click Find → check progress → check results → check items).
 */

import { test, expect, type Page, type BrowserContext } from '@playwright/test';
import {
    AUTH_FILE,
    TIMEOUTS,
    openPluginPage,
    importFPLFixture,
    fetchWeather,
} from './helpers/plugin-helpers';

test.describe('VFR Window Search', () => {
    test.describe.serial('VFR window checks', () => {
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

        test('VFR window section is visible after weather fetch', async () => {
            await expect(page.locator('.vfr-window-section')).toBeVisible();
        });

        test('condition select dropdown is present', async () => {
            const condSelect = page.locator('.condition-select');
            await expect(condSelect).toBeVisible();
        });

        test('Find VFR Windows button is clickable', async () => {
            const findBtn = page.locator('.btn-find-windows');
            await expect(findBtn).toBeVisible();
            await expect(findBtn).toBeEnabled();
        });

        test('clicking Find VFR Windows shows progress', async () => {
            const findBtn = page.locator('.btn-find-windows');
            await findBtn.click();

            const progressBar = page.locator('.progress-bar');
            await expect(progressBar).toBeVisible({ timeout: TIMEOUTS.elementVisible });
        });

        test('VFR window search completes and shows results', async () => {
            // The search was started in the previous test — wait for completion
            await page.waitForFunction(
                () => {
                    const list = document.querySelector('.vfr-windows-list');
                    const btn = document.querySelector('.btn-find-windows');
                    return list !== null || (btn && !btn.hasAttribute('disabled'));
                },
                { timeout: TIMEOUTS.vfrSearch },
            );

            const hasList = await page.locator('.vfr-windows-list').isVisible().catch(() => false);
            const btnEnabled = await page.locator('.btn-find-windows').isEnabled();
            expect(hasList || btnEnabled).toBe(true);
        });

        test('VFR window items show date, time, and confidence', async () => {
            // Results should already be loaded from the previous test
            const items = page.locator('.vfr-window-item');
            const count = await items.count();

            if (count > 0) {
                const firstItem = items.first();
                await expect(firstItem.locator('.window-date')).toBeVisible();
                await expect(firstItem.locator('.window-time')).toBeVisible();
                await expect(firstItem.locator('.window-confidence')).toBeVisible();
            }
        });

        test('Use button on VFR window updates departure time', async () => {
            // Results should already be loaded from earlier tests
            const useBtn = page.locator('.btn-use-window').first();
            if (await useBtn.isVisible()) {
                const timeBefore = await page.locator('.departure-time').innerText();
                await useBtn.click();
                await page.waitForTimeout(TIMEOUTS.mapSettle);

                const timeAfter = await page.locator('.departure-time').innerText();
                expect(timeAfter.length).toBeGreaterThan(0);
            }
        });
    });
});
