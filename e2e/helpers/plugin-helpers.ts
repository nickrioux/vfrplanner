/**
 * Shared helpers for VFR Planner E2E tests
 */

import { type Page, type Locator, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/** Path to the built plugin dist directory */
const DIST_DIR = path.resolve(__dirname, '../../dist');

/** Saved Windy auth session for browser contexts */
export const AUTH_FILE = 'e2e/.auth/windy-session.json';

/** Plugin dev server base URL */
export const PLUGIN_DEV_SERVER = 'https://localhost:9995';

/** URL entered into Windy Developer Mode dialog */
export const PLUGIN_DEV_URL = 'https://localhost:9995/plugin.js';

/** Centralized timeout constants (ms) */
export const TIMEOUTS = {
    /** Windy platform + W global load */
    windyLoad: 30000,
    /** Plugin panel to appear after install */
    pluginLoad: 30000,
    /** Developer mode input to appear */
    devInput: 15000,
    /** Waypoint rows to appear after import */
    import: 10000,
    /** Weather fetch via real Windy API */
    weatherFetch: 90000,
    /** VFR window search completion */
    vfrSearch: 90000,
    /** General element visibility */
    elementVisible: 5000,
    /** UI animation settle (accordion, slider) */
    uiSettle: 300,
    /** Map tile/render settle */
    mapSettle: 1000,
    /** File download event */
    download: 10000,
} as const;

/** Test fixture paths */
export const FIXTURES = {
    CYVBCYQB: path.resolve(__dirname, '../fixtures/CYVBCYQB.fpl'),
    SINGLE_WAYPOINT: path.resolve(__dirname, '../fixtures/single-waypoint.fpl'),
};

/** Expected waypoints in CYVBCYQB fixture */
export const CYVBCYQB_WAYPOINTS = [
    { name: 'CYVB', lat: 48.0711, lon: -65.4603 },
    { name: 'CYCL', lat: 47.9908, lon: -66.3303 },
    { name: 'WP5', lat: 48.0000, lon: -67.0000 },
    { name: 'CYRI', lat: 47.7644, lon: -69.5847 },
    { name: 'CYQB', lat: 46.7911, lon: -71.3933 },
];

/**
 * Wait for Windy platform to fully load including the W global
 */
export async function waitForWindyLoad(page: Page): Promise<void> {
    await page.waitForSelector('#map-container', { state: 'visible', timeout: TIMEOUTS.windyLoad });
    await page.waitForFunction(
        () => window.W !== undefined && window.W.store !== undefined,
        { timeout: TIMEOUTS.windyLoad },
    );
}

/**
 * MIME type map for serving plugin files from disk.
 */
const MIME_TYPES: Record<string, string> = {
    '.json': 'application/json',
    '.js': 'text/javascript',
    '.map': 'application/json',
    '.jpg': 'image/jpeg',
    '.png': 'image/png',
};

/**
 * Set up route interception to serve plugin files from dist/ directory.
 * This bypasses the self-signed SSL certificate issue — Windy's in-page
 * fetch() to https://localhost:9995 gets intercepted by Playwright and
 * fulfilled with local files, so no actual HTTPS connection is made.
 */
export async function interceptPluginRequests(page: Page): Promise<void> {
    await page.route(`${PLUGIN_DEV_SERVER}/**`, async (route) => {
        const resourceType = route.request().resourceType();
        // Only intercept fetch/xhr/script requests — let document navigations
        // pass through (Windy may navigate to the dev URL to accept the cert)
        if (resourceType === 'document') {
            await route.continue();
            return;
        }

        const url = new URL(route.request().url());
        // Map URL path to file in dist/ — default to plugin.json for root
        let filePath = url.pathname === '/' ? '/plugin.json' : url.pathname;
        const fullPath = path.join(DIST_DIR, filePath);

        if (fs.existsSync(fullPath)) {
            const body = fs.readFileSync(fullPath);
            const ext = path.extname(fullPath);
            const contentType = MIME_TYPES[ext] || 'application/octet-stream';
            await route.fulfill({
                status: 200,
                contentType,
                body,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                },
            });
        } else {
            await route.fulfill({ status: 404, body: 'Not found' });
        }
    });
}

/**
 * Navigate to windy.com/dev, intercept plugin requests to serve from
 * disk, enter the plugin dev server URL in the Developer Mode input,
 * click "Install & open plugin", and wait for the plugin panel to appear.
 *
 * Uses Playwright's route() API to intercept Windy's fetch() calls to
 * https://localhost:9995/*, serving files from dist/ instead. This
 * completely bypasses the self-signed certificate issue.
 */
export async function openPluginPage(page: Page): Promise<void> {
    // Intercept requests BEFORE navigating
    await interceptPluginRequests(page);

    await page.goto('https://www.windy.com/dev');
    await waitForWindyLoad(page);

    // Developer Mode panel: #plugin-developer-mode contains an input
    const devInput = page.locator('#plugin-developer-mode input');
    await devInput.waitFor({ state: 'visible', timeout: TIMEOUTS.devInput });

    // Enter the plugin.js URL (Windy dev mode needs the JS file path)
    await devInput.fill(PLUGIN_DEV_URL);

    // Click "Install & open plugin" button
    await page.locator('#plugin-developer-mode .button:has-text("Install & open plugin")').click();

    // Wait for plugin to load — the drop zone appears in the initial empty state
    await page.waitForSelector('.drop-zone', { state: 'visible', timeout: TIMEOUTS.pluginLoad });
}

/**
 * Switch to a plugin tab by name
 */
export async function switchTab(page: Page, tabName: 'Route' | 'Profile' | 'Settings' | 'About'): Promise<void> {
    await page.locator(`.tab:has-text("${tabName}")`).click();
}

/**
 * Import the CYVBCYQB.fpl fixture via file input
 */
export async function importFPLFixture(page: Page, fixturePath: string = FIXTURES.CYVBCYQB): Promise<void> {
    // Find the hidden file input in the import section
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(fixturePath);

    // Wait for waypoints to appear in the table
    await page.waitForSelector('.waypoint-row', { state: 'visible', timeout: TIMEOUTS.import });
}

/**
 * Click the "Read Wx" button and wait for weather loading to start
 */
export async function clickReadWx(page: Page): Promise<void> {
    const readWxBtn = page.locator('.btn-weather');
    await readWxBtn.click();
}

/**
 * Click "Read Wx" and wait for weather data to load (with timeout for real API)
 */
export async function fetchWeather(page: Page, timeout: number = TIMEOUTS.weatherFetch): Promise<void> {
    await clickReadWx(page);

    // Wait for loading to finish — either weather data appears or error
    await page.waitForFunction(
        () => {
            // Check if weather data rows exist (wx-wind class appears when loaded)
            const wxElements = document.querySelectorAll('.wx-wind');
            const errorElement = document.querySelector('.weather-error');
            return wxElements.length > 0 || errorElement !== null;
        },
        { timeout },
    );
}

/**
 * Get the number of waypoint rows in the table
 */
export async function getWaypointCount(page: Page): Promise<number> {
    return page.locator('.waypoint-row').count();
}

/**
 * Get waypoint names from the table
 */
export async function getWaypointNames(page: Page): Promise<string[]> {
    // The .wp-name div contains an icon span + the name text.
    // Extract just the text after the icon by evaluating in-page.
    return page.evaluate(() => {
        const rows = document.querySelectorAll('.waypoint-row .wp-name');
        return Array.from(rows).map(el => {
            // Get text content minus the icon span
            const icon = el.querySelector('.wp-type-icon');
            const clone = el.cloneNode(true) as HTMLElement;
            const iconClone = clone.querySelector('.wp-type-icon');
            if (iconClone) iconClone.remove();
            // Also remove any input elements (editing mode)
            clone.querySelectorAll('input').forEach(i => i.remove());
            return clone.textContent?.trim() || '';
        });
    });
}

/**
 * Click the export button to open the export menu
 */
export async function openExportMenu(page: Page): Promise<void> {
    // The export button is the one containing "Export" text
    await page.locator('.btn-action:has-text("Export")').click();
    await page.waitForSelector('.export-menu', { state: 'visible', timeout: TIMEOUTS.elementVisible });
}

/**
 * Clear the current flight plan
 */
export async function clearFlightPlan(page: Page): Promise<void> {
    const clearBtn = page.locator('.btn-clear');
    if (await clearBtn.isVisible()) {
        await clearBtn.click();
    }
}

/**
 * Get the departure time text from the slider section
 */
export async function getDepartureTimeText(page: Page): Promise<string> {
    return (await page.locator('.departure-time').innerText()).trim();
}

/**
 * Check if weather data is loaded for at least one waypoint
 */
export async function hasWeatherData(page: Page): Promise<boolean> {
    return (await page.locator('.wx-wind').count()) > 0;
}

/**
 * Check if the profile tab is enabled (requires 2+ waypoints)
 */
export async function isProfileTabEnabled(page: Page): Promise<boolean> {
    const profileTab = page.locator('.tab:has-text("Profile")');
    const isDisabled = await profileTab.getAttribute('disabled');
    return isDisabled === null;
}

// Type declarations for Windy global
declare global {
    interface Window {
        W: {
            store: {
                get: (key: string) => unknown;
                set: (key: string, value: unknown) => void;
            };
            map: {
                map: unknown; // Leaflet map instance
            };
            plugins: unknown;
        };
    }
}
