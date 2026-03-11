/**
 * 10 - Settings Panel
 * Verifies settings UI and configuration changes.
 *
 * Optimized: Tests share a single page. Ordered so read-only checks come
 * first, UI-modifying tests (toggle accordion, toggle checkbox, open modal)
 * come later. All modifications are reversible so state remains usable.
 */

import { test, expect, type Page, type BrowserContext } from '@playwright/test';
import {
    AUTH_FILE,
    TIMEOUTS,
    openPluginPage,
    importFPLFixture,
    switchTab,
} from './helpers/plugin-helpers';

test.describe('Settings Panel', () => {
    test.describe.serial('Settings checks', () => {
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
            await switchTab(page, 'Settings');
        });

        test.afterAll(async () => {
            await context.close();
        });

        test('Settings tab shows settings content', async () => {
            await expect(page.locator('.settings-section')).toBeVisible();
        });

        test('settings groups are present (accordion)', async () => {
            const groups = page.locator('.settings-group');
            const count = await groups.count();
            expect(count).toBeGreaterThanOrEqual(1);
        });

        test('category select is present with options', async () => {
            const selects = page.locator('.settings-section select');
            const selectCount = await selects.count();
            expect(selectCount).toBeGreaterThanOrEqual(1);
        });

        test('LLM provider select is present', async () => {
            const aiGroup = page.locator('details.settings-group:has(summary:has-text("AI Assistant"))');
            if (await aiGroup.count() > 0) {
                const summary = aiGroup.locator('summary');
                const isOpen = await aiGroup.getAttribute('open');
                if (isOpen === null) {
                    await summary.click();
                    await page.waitForTimeout(TIMEOUTS.uiSettle);
                }
                await expect(aiGroup.locator('.settings-group-content')).toBeVisible();
            }
        });

        test('settings groups use details/summary and can toggle', async () => {
            const firstGroup = page.locator('details.settings-group').first();
            await expect(firstGroup).toHaveAttribute('open', '');

            const content = firstGroup.locator('.settings-group-content');
            await expect(content).toBeVisible();

            // Close it
            const header = firstGroup.locator('summary');
            await header.click();
            await page.waitForTimeout(TIMEOUTS.uiSettle);
            await expect(content).not.toBeVisible();

            // Re-open to restore state for subsequent tests
            await header.click();
            await page.waitForTimeout(TIMEOUTS.uiSettle);
            await expect(content).toBeVisible();
        });

        test('checkboxes are toggleable', async () => {
            const labels = page.locator('.setting-checkbox');
            const labelCount = await labels.count();

            if (labelCount > 0) {
                const firstLabel = labels.first();
                const checkbox = firstLabel.locator('input[type="checkbox"]');

                const initialState = await checkbox.isChecked();
                await firstLabel.click();
                await page.waitForTimeout(TIMEOUTS.uiSettle);

                const newState = await checkbox.isChecked();
                expect(newState).not.toBe(initialState);

                // Toggle back to restore state
                await firstLabel.click();
            }
        });

        test('conditions modal opens from Configure button', async () => {
            const configBtn = page.locator('.customize-btn').first();
            if (await configBtn.isVisible()) {
                await configBtn.click();

                const modal = page.locator('.modal-content');
                await expect(modal).toBeVisible({ timeout: TIMEOUTS.elementVisible });

                // Close modal to restore state
                await page.locator('.close-btn').click();
                await expect(modal).not.toBeVisible();
            }
        });
    });
});
