/**
 * 02 - FPL Import
 * Verifies flight plan import from Garmin FPL files.
 *
 * Optimized: Read-only checks share a single page with import done once.
 * Destructive tests (clear, invalid file) run independently.
 */

import { test, expect, type Page, type BrowserContext } from '@playwright/test';
import {
    AUTH_FILE,
    TIMEOUTS,
    openPluginPage,
    importFPLFixture,
    getWaypointCount,
    getWaypointNames,
    clearFlightPlan,
    FIXTURES,
    CYVBCYQB_WAYPOINTS,
} from './helpers/plugin-helpers';

test.describe('FPL Import', () => {
    /** Read-only checks after a single import — no state modification */
    test.describe.serial('Read-only import checks', () => {
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

        test('imports CYVBCYQB.fpl and shows 5 waypoints', async () => {
            const count = await getWaypointCount(page);
            expect(count).toBe(5);
        });

        test('waypoint names match fixture data', async () => {
            const names = await getWaypointNames(page);
            const expected = CYVBCYQB_WAYPOINTS.map(wp => wp.name);
            expect(names).toEqual(expected);
        });

        test('flight plan name is displayed', async () => {
            const planName = page.locator('.plan-name');
            await expect(planName).toBeVisible();
            const text = await planName.innerText();
            expect(text.length).toBeGreaterThan(0);
        });

        test('waypoint rows show navigation info (bearing, distance)', async () => {
            const firstRow = page.locator('.waypoint-row').first();
            await expect(firstRow).toBeVisible();

            const secondRow = page.locator('.waypoint-row').nth(1);
            const distance = secondRow.locator('.wp-distance');
            await expect(distance).toBeVisible();
            const distText = await distance.innerText();
            expect(distText).toContain('NM');
        });

        test('Profile tab becomes enabled after import', async () => {
            const profileTab = page.locator('.tab:has-text("Profile")');
            await expect(profileTab).toBeVisible();
            await expect(profileTab).not.toBeDisabled();
        });
    });

    /** Destructive tests — need independent pages */
    test('clear button removes all waypoints', async ({ page }) => {
        await openPluginPage(page);
        await importFPLFixture(page);
        expect(await getWaypointCount(page)).toBe(5);

        await clearFlightPlan(page);

        await expect(page.locator('.drop-zone')).toBeVisible();
    });

    test('rejects invalid file with error message', async ({ page }) => {
        await openPluginPage(page);

        const fileInput = page.locator('input[type="file"]');
        await fileInput.setInputFiles({
            name: 'invalid.fpl',
            mimeType: 'application/xml',
            buffer: Buffer.from('<not-a-flight-plan></not-a-flight-plan>'),
        });

        await expect(page.locator('.error-message')).toBeVisible({ timeout: TIMEOUTS.elementVisible });
    });
});
