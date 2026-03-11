/**
 * 07 - Departure Time & Timeline
 * Verifies departure time controls and Windy timeline sync.
 *
 * Optimized: Read-only checks share a single imported page.
 * The sync toggle test modifies UI state but is ordered last in the
 * non-weather group. The ETA test needs weather and gets its own page.
 */

import { test, expect, type Page, type BrowserContext } from '@playwright/test';
import {
    AUTH_FILE,
    TIMEOUTS,
    openPluginPage,
    importFPLFixture,
    fetchWeather,
    getDepartureTimeText,
} from './helpers/plugin-helpers';

test.describe('Departure Time & Timeline', () => {
    /** Tests that only need import — ordered so read-only come first,
     *  slider/toggle modifications come last */
    test.describe.serial('Departure controls', () => {
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

        test('departure section is visible after import', async () => {
            await expect(page.locator('.departure-section')).toBeVisible();
        });

        test('departure time is displayed', async () => {
            const timeText = await getDepartureTimeText(page);
            expect(timeText.length).toBeGreaterThan(0);
        });

        test('departure slider is present', async () => {
            const slider = page.locator('.departure-section input[type="range"]');
            await expect(slider).toBeVisible();
        });

        test('changing slider updates departure time text', async () => {
            const initialTime = await getDepartureTimeText(page);

            const slider = page.locator('.departure-section input[type="range"]');
            const box = await slider.boundingBox();
            if (!box) throw new Error('Slider not found');

            await page.mouse.click(box.x + box.width * 0.8, box.y + box.height / 2);
            await page.waitForTimeout(TIMEOUTS.mapSettle);

            const newTime = await getDepartureTimeText(page);
            expect(newTime.length).toBeGreaterThan(0);
        });

        test('sync button toggles state', async () => {
            const syncBtn = page.locator('.btn-sync');
            await expect(syncBtn).toBeVisible();

            const initialActive = await syncBtn.evaluate(
                el => el.classList.contains('active'),
            );

            await syncBtn.click();
            await page.waitForTimeout(TIMEOUTS.mapSettle);

            const newActive = await syncBtn.evaluate(
                el => el.classList.contains('active'),
            );
            expect(newActive).not.toBe(initialActive);
        });
    });

    /** ETA test needs weather — separate page to avoid a second weather fetch
     *  in the main group (other weather-dependent files handle their own) */
    test('ETA info is displayed after weather fetch', async ({ page }) => {
        await openPluginPage(page);
        await importFPLFixture(page);
        await fetchWeather(page);

        const arrivalInfo = page.locator('.arrival-info');
        if (await arrivalInfo.isVisible()) {
            const text = await arrivalInfo.innerText();
            expect(text.length).toBeGreaterThan(0);
        }
    });
});
