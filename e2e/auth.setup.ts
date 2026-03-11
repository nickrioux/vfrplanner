/**
 * Windy Authentication Setup
 *
 * Verifies or creates a valid Windy login session for dev mode.
 *
 * First-time / refresh:
 *   npx playwright test e2e/auth.setup.ts --project=setup --headed
 */

import { test as setup } from '@playwright/test';
import fs from 'fs';
import { AUTH_FILE, TIMEOUTS } from './helpers/plugin-helpers';

setup('authenticate with Windy', async ({ browser }) => {
    // If session file exists, try reusing it
    if (fs.existsSync(AUTH_FILE)) {
        const context = await browser.newContext({
            storageState: AUTH_FILE,
            ignoreHTTPSErrors: true,
        });
        const page = await context.newPage();
        await page.goto('https://www.windy.com/dev');
        await page.waitForTimeout(8000);

        const devInput = page.locator('#plugin-developer-mode input');
        if (await devInput.isVisible({ timeout: TIMEOUTS.elementVisible }).catch(() => false)) {
            console.log('Existing Windy session is valid.');
            await context.close();
            return;
        }
        console.log('Session expired.');
        await context.close();
    }

    // Need a fresh login — must be headed
    console.log('');
    console.log('=== WINDY LOGIN REQUIRED ===');
    console.log('Please log into Windy in the browser window.');
    console.log('If no window opened, re-run with: npx playwright test e2e/auth.setup.ts --project=setup --headed');
    console.log('============================');
    console.log('');

    const context = await browser.newContext({ ignoreHTTPSErrors: true });
    const page = await context.newPage();
    await page.goto('https://www.windy.com/dev');

    await page.waitForSelector('#plugin-developer-mode input', { timeout: 120000 });
    console.log('Login successful — developer mode active.');

    await context.storageState({ path: AUTH_FILE });
    console.log(`Session saved to ${AUTH_FILE}`);
    await context.close();
});
