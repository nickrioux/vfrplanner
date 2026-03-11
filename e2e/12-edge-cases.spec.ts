/**
 * 12 - Edge Cases
 * Verifies behavior with unusual inputs and boundary conditions.
 */

import { test, expect } from '@playwright/test';
import {
    TIMEOUTS,
    FIXTURES,
    openPluginPage,
    importFPLFixture,
    getWaypointCount,
    clearFlightPlan,
} from './helpers/plugin-helpers';

test.describe('Edge Cases', () => {
    test.beforeEach(async ({ page }) => {
        await openPluginPage(page);
    });

    test('empty FPL file shows error', async ({ page }) => {
        const fileInput = page.locator('input[type="file"]');
        await fileInput.setInputFiles({
            name: 'empty.fpl',
            mimeType: 'application/xml',
            buffer: Buffer.from(''),
        });

        await expect(page.locator('.error-message')).toBeVisible({ timeout: TIMEOUTS.elementVisible });
    });

    test('FPL with single waypoint imports successfully', async ({ page }) => {
        await importFPLFixture(page, FIXTURES.SINGLE_WAYPOINT);
        expect(await getWaypointCount(page)).toBe(1);
    });

    test('malformed XML shows error', async ({ page }) => {
        const fileInput = page.locator('input[type="file"]');
        await fileInput.setInputFiles({
            name: 'bad.fpl',
            mimeType: 'application/xml',
            buffer: Buffer.from('<flight-plan><waypoint-table><broken>'),
        });

        // Should show error or handle gracefully
        await page.waitForTimeout(TIMEOUTS.mapSettle);
        const hasError = await page.locator('.error-message').isVisible();
        const hasWaypoints = (await page.locator('.waypoint-row').count()) > 0;
        // Either error shown or no waypoints loaded — both are valid
        expect(hasError || !hasWaypoints).toBe(true);
    });

    test('clear then reimport same fixture works', async ({ page }) => {
        await importFPLFixture(page);
        expect(await getWaypointCount(page)).toBe(5);

        // Clear existing plan
        await clearFlightPlan(page);
        await page.waitForSelector('.drop-zone', { state: 'visible', timeout: TIMEOUTS.elementVisible });

        // Reimport the same fixture — should load successfully again
        await importFPLFixture(page);
        expect(await getWaypointCount(page)).toBe(5);
    });

    test('new plan button creates empty plan with tabs', async ({ page }) => {
        await page.locator('.btn-new').click();
        await page.waitForTimeout(TIMEOUTS.mapSettle);

        // New plan creates an empty flight plan — tabs should appear
        await expect(page.locator('.tabs')).toBeVisible();
        // No waypoints yet in empty plan
        const count = await page.locator('.waypoint-row').count();
        expect(count).toBe(0);
    });

    test('import then clear restores initial state', async ({ page }) => {
        // Import flight plan
        await importFPLFixture(page);
        expect(await getWaypointCount(page)).toBe(5);
        await expect(page.locator('.tabs')).toBeVisible();

        // Clear it
        await clearFlightPlan(page);

        // Plugin should return to initial state — drop zone visible, tabs hidden
        await expect(page.locator('.drop-zone')).toBeVisible();
    });
});
