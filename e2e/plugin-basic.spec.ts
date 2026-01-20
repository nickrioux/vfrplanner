/**
 * Basic E2E Tests for VFR Planner Plugin
 *
 * These tests verify the plugin integration with the Windy platform.
 * Run with: npx playwright test
 *
 * Note: Some tests require the plugin to be installed on Windy.
 * For local development, use the Windy Plugin Development environment.
 */

import { test, expect, type Page } from '@playwright/test';

// Plugin URL on Windy (update with actual plugin URL)
const PLUGIN_URL = 'https://www.windy.com/plugins/windy-plugin-vfr-planner';

// Test airports for flight planning
const TEST_AIRPORTS = {
    departure: { icao: 'CYUL', name: 'Montreal-Trudeau' },
    arrival: { icao: 'CYQB', name: 'Quebec City' },
};

/**
 * Helper to wait for Windy to fully load
 */
async function waitForWindyLoad(page: Page): Promise<void> {
    // Wait for the Windy map to be ready
    await page.waitForSelector('#map-container', { state: 'visible', timeout: 30000 });
    // Wait for weather data to load
    await page.waitForFunction(() => {
        return window.W !== undefined && window.W.store !== undefined;
    }, { timeout: 30000 });
}

/**
 * Helper to open the plugin panel
 */
async function openPlugin(page: Page): Promise<void> {
    // Click on the plugins menu
    const pluginButton = page.locator('[data-plugin="vfr-planner"]');
    if (await pluginButton.isVisible()) {
        await pluginButton.click();
    } else {
        // Try alternate method via menu
        await page.click('[data-menu="plugins"]');
        await page.click('text=VFR Planner');
    }
    // Wait for plugin panel to open
    await page.waitForSelector('.vfr-planner-panel', { state: 'visible', timeout: 10000 });
}

test.describe('VFR Planner Plugin - Basic Tests', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to Windy
        await page.goto('https://www.windy.com');
        await waitForWindyLoad(page);
    });

    test('Windy platform loads correctly', async ({ page }) => {
        // Verify Windy loaded
        await expect(page).toHaveTitle(/Windy/);

        // Verify map is visible
        const mapContainer = page.locator('#map-container');
        await expect(mapContainer).toBeVisible();
    });

    test.skip('Plugin panel opens and closes', async ({ page }) => {
        // This test requires the plugin to be installed
        await openPlugin(page);

        // Verify plugin panel is visible
        const panel = page.locator('.vfr-planner-panel');
        await expect(panel).toBeVisible();

        // Close the plugin
        await page.click('.plugin-close-button');
        await expect(panel).not.toBeVisible();
    });

    test.skip('Can input departure and arrival airports', async ({ page }) => {
        await openPlugin(page);

        // Enter departure airport
        const departureInput = page.locator('input[placeholder*="Departure"]');
        await departureInput.fill(TEST_AIRPORTS.departure.icao);

        // Enter arrival airport
        const arrivalInput = page.locator('input[placeholder*="Arrival"]');
        await arrivalInput.fill(TEST_AIRPORTS.arrival.icao);

        // Verify inputs have correct values
        await expect(departureInput).toHaveValue(TEST_AIRPORTS.departure.icao);
        await expect(arrivalInput).toHaveValue(TEST_AIRPORTS.arrival.icao);
    });

    test.skip('Flight plan displays on map', async ({ page }) => {
        await openPlugin(page);

        // Enter flight plan
        await page.locator('input[placeholder*="Departure"]').fill(TEST_AIRPORTS.departure.icao);
        await page.locator('input[placeholder*="Arrival"]').fill(TEST_AIRPORTS.arrival.icao);

        // Click calculate/plan button
        await page.click('button:has-text("Calculate")');

        // Wait for route to be calculated
        await page.waitForSelector('.route-line', { state: 'visible', timeout: 15000 });

        // Verify route is displayed
        const routeLine = page.locator('.route-line');
        await expect(routeLine).toBeVisible();
    });
});

test.describe('VFR Planner Plugin - Weather Integration', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('https://www.windy.com');
        await waitForWindyLoad(page);
    });

    test.skip('Weather data loads for waypoints', async ({ page }) => {
        await openPlugin(page);

        // Enter a simple flight plan
        await page.locator('input[placeholder*="Departure"]').fill(TEST_AIRPORTS.departure.icao);
        await page.locator('input[placeholder*="Arrival"]').fill(TEST_AIRPORTS.arrival.icao);
        await page.click('button:has-text("Calculate")');

        // Wait for weather data
        await page.waitForSelector('.waypoint-weather', { state: 'visible', timeout: 30000 });

        // Verify weather data is displayed
        const weatherData = page.locator('.waypoint-weather');
        await expect(weatherData).toBeVisible();

        // Check for wind speed display
        const windSpeed = page.locator('text=/\\d+\\s*kt/');
        await expect(windSpeed.first()).toBeVisible();
    });

    test.skip('VFR conditions are evaluated', async ({ page }) => {
        await openPlugin(page);

        // Enter flight plan
        await page.locator('input[placeholder*="Departure"]').fill(TEST_AIRPORTS.departure.icao);
        await page.locator('input[placeholder*="Arrival"]').fill(TEST_AIRPORTS.arrival.icao);
        await page.click('button:has-text("Calculate")');

        // Wait for condition evaluation
        await page.waitForSelector('.vfr-condition-indicator', { state: 'visible', timeout: 30000 });

        // Verify condition indicator is displayed
        const conditionIndicator = page.locator('.vfr-condition-indicator');
        await expect(conditionIndicator).toBeVisible();
    });
});

test.describe('VFR Planner Plugin - Settings', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('https://www.windy.com');
        await waitForWindyLoad(page);
    });

    test.skip('Settings panel opens', async ({ page }) => {
        await openPlugin(page);

        // Click settings button
        await page.click('button[aria-label="Settings"]');

        // Verify settings panel is visible
        const settingsPanel = page.locator('.settings-panel');
        await expect(settingsPanel).toBeVisible();
    });

    test.skip('Aircraft settings can be modified', async ({ page }) => {
        await openPlugin(page);
        await page.click('button[aria-label="Settings"]');

        // Find aircraft speed input
        const speedInput = page.locator('input[name="cruiseSpeed"]');
        await speedInput.fill('120');

        // Verify value is updated
        await expect(speedInput).toHaveValue('120');
    });
});

test.describe('VFR Planner Plugin - Export', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('https://www.windy.com');
        await waitForWindyLoad(page);
    });

    test.skip('Can export flight plan as GPX', async ({ page }) => {
        await openPlugin(page);

        // Enter flight plan
        await page.locator('input[placeholder*="Departure"]').fill(TEST_AIRPORTS.departure.icao);
        await page.locator('input[placeholder*="Arrival"]').fill(TEST_AIRPORTS.arrival.icao);
        await page.click('button:has-text("Calculate")');

        // Wait for route calculation
        await page.waitForSelector('.route-line', { state: 'visible', timeout: 15000 });

        // Setup download listener
        const downloadPromise = page.waitForEvent('download');

        // Click export button
        await page.click('button:has-text("Export GPX")');

        // Verify download started
        const download = await downloadPromise;
        expect(download.suggestedFilename()).toContain('.gpx');
    });
});

test.describe('VFR Planner Plugin - Accessibility', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('https://www.windy.com');
        await waitForWindyLoad(page);
    });

    test.skip('Plugin has accessible labels', async ({ page }) => {
        await openPlugin(page);

        // Check for accessible input labels
        const departureInput = page.locator('input[placeholder*="Departure"]');
        const ariaLabel = await departureInput.getAttribute('aria-label');
        expect(ariaLabel || await departureInput.getAttribute('id')).toBeTruthy();
    });

    test.skip('Keyboard navigation works', async ({ page }) => {
        await openPlugin(page);

        // Tab through form elements
        await page.keyboard.press('Tab');

        // Verify focus is on first input
        const focusedElement = page.locator(':focus');
        await expect(focusedElement).toBeVisible();
    });
});

// Type declarations for Windy global
declare global {
    interface Window {
        W: {
            store: unknown;
            plugins: unknown;
        };
    }
}
