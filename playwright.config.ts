/**
 * Playwright E2E Test Configuration
 * For VFR Planner Windy Plugin
 *
 * Dev workflow: windy.com/dev → enter https://localhost:9995 → plugin loads.
 * Requires a logged-in Windy session (saved in e2e/.auth/windy-session.json).
 *
 * First-time setup (headed, manual login):
 *   npx playwright test e2e/auth.setup.ts --project=setup --headed
 *
 * Uses the system Chrome — no Playwright browser download needed.
 */

import { defineConfig, devices } from '@playwright/test';

const AUTH_FILE = 'e2e/.auth/windy-session.json';

export default defineConfig({
    testDir: './e2e',
    fullyParallel: true,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 2 : 0,
    workers: process.env.CI ? 1 : undefined,

    reporter: [
        ['html', { outputFolder: 'playwright-report' }],
        ['list'],
    ],

    use: {
        baseURL: 'https://www.windy.com',
        trace: 'on-first-retry',
        screenshot: 'only-on-failure',
        video: 'on-first-retry',
        ignoreHTTPSErrors: true,
        headless: false,
        channel: 'chrome',
        launchOptions: {
            args: [
                '--ignore-certificate-errors',
                '--allow-insecure-localhost',
            ],
        },
    },

    projects: [
        // Auth setup — runs first (headed for manual login if needed)
        {
            name: 'setup',
            testMatch: /auth\.setup\.ts/,
            use: {
                headless: false,
            },
        },
        {
            name: 'chromium',
            use: {
                ...devices['Desktop Chrome'],
                storageState: AUTH_FILE,
            },
            dependencies: ['setup'],
        },
        {
            name: 'mobile-chrome',
            use: {
                ...devices['Pixel 5'],
                storageState: AUTH_FILE,
            },
            dependencies: ['setup'],
        },
        {
            name: 'tablet',
            use: {
                ...devices['iPad (gen 7)'],
                browserName: 'chromium',
                storageState: AUTH_FILE,
            },
            dependencies: ['setup'],
        },
    ],

    outputDir: 'test-results/',
    timeout: 90000,
    expect: {
        timeout: 15000,
    },
});
