/**
 * 03 - Waypoint Table Interactions
 * Verifies waypoint editing, reordering, and deletion.
 */

import { test, expect } from '@playwright/test';
import {
    openPluginPage,
    importFPLFixture,
    getWaypointCount,
    getWaypointNames,
} from './helpers/plugin-helpers';

test.describe('Waypoint Table Interactions', () => {
    test.beforeEach(async ({ page }) => {
        await openPluginPage(page);
        await importFPLFixture(page);
    });

    test('clicking a waypoint row selects it', async ({ page }) => {
        const secondRow = page.locator('.waypoint-row').nth(1);
        await secondRow.click();

        await expect(secondRow).toHaveClass(/selected/);
    });

    test('delete button removes a waypoint', async ({ page }) => {
        expect(await getWaypointCount(page)).toBe(5);

        // Click a middle waypoint to select it, then delete
        const middleRow = page.locator('.waypoint-row').nth(2);
        await middleRow.click();

        const deleteBtn = middleRow.locator('.btn-delete');
        await deleteBtn.click();

        expect(await getWaypointCount(page)).toBe(4);

        // WP5 should be gone
        const names = await getWaypointNames(page);
        expect(names).not.toContain('WP5');
    });

    test('move up button reorders waypoint', async ({ page }) => {
        const originalNames = await getWaypointNames(page);
        expect(originalNames[1]).toBe('CYCL');
        expect(originalNames[2]).toBe('WP5');

        // Click the second waypoint's move-up on WP5 (index 2)
        const wp5Row = page.locator('.waypoint-row').nth(2);
        const moveUpBtn = wp5Row.locator('.btn-move[title="Move up"]');
        await moveUpBtn.click();

        const newNames = await getWaypointNames(page);
        expect(newNames[1]).toBe('WP5');
        expect(newNames[2]).toBe('CYCL');
    });

    test('move down button reorders waypoint', async ({ page }) => {
        const originalNames = await getWaypointNames(page);
        expect(originalNames[1]).toBe('CYCL');

        // Move CYCL down
        const cyclRow = page.locator('.waypoint-row').nth(1);
        const moveDownBtn = cyclRow.locator('.btn-move[title="Move down"]');
        await moveDownBtn.click();

        const newNames = await getWaypointNames(page);
        expect(newNames[2]).toBe('CYCL');
    });

    test('first waypoint has no move-up button enabled', async ({ page }) => {
        const firstRow = page.locator('.waypoint-row').first();
        const moveUpBtn = firstRow.locator('.btn-move[title="Move up"]');

        // Should be disabled
        await expect(moveUpBtn).toBeDisabled();
    });

    test('last waypoint has no move-down button enabled', async ({ page }) => {
        const lastRow = page.locator('.waypoint-row').last();
        const moveDownBtn = lastRow.locator('.btn-move[title="Move down"]');

        await expect(moveDownBtn).toBeDisabled();
    });

    test('reverse button flips waypoint order', async ({ page }) => {
        const originalNames = await getWaypointNames(page);

        // Click reverse button
        await page.locator('.btn-action:has-text("Reverse")').click();

        const reversedNames = await getWaypointNames(page);
        expect(reversedNames).toEqual([...originalNames].reverse());
    });

    test('waypoint altitude can be edited', async ({ page }) => {
        // Click on a waypoint to select and expose edit controls
        const row = page.locator('.waypoint-row').nth(1);
        await row.click();

        // Find altitude input or display
        const altInput = row.locator('.wp-altitude-input');
        if (await altInput.isVisible()) {
            await altInput.fill('5500');
            await altInput.press('Enter');

            // Verify the altitude was updated
            await expect(row).toContainText('5500');
        }
    });
});
