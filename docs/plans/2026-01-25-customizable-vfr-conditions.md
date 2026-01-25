# Customizable VFR Conditions Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add user-customizable thresholds for VFR/MVFR/IFR conditions with preset selection and detailed modal editor.

**Architecture:** Hybrid UI with preset dropdown in Settings panel and "Customize..." button opening modal editor. Custom thresholds stored in settings and passed to the rules-based evaluation system.

**Tech Stack:** Svelte 4, TypeScript, existing localStorage persistence

---

## Task 1: Create Condition Threshold Types

**Files:**
- Create: `src/types/conditionThresholds.ts`
- Test: `tests/conditionThresholds.test.ts`

**Step 1: Write the failing test**

```typescript
// tests/conditionThresholds.test.ts
import {
    STANDARD_THRESHOLDS,
    CONSERVATIVE_THRESHOLDS,
    validateThresholds,
    type VfrConditionThresholds,
} from '../src/types/conditionThresholds';

describe('Condition Thresholds', () => {
    describe('STANDARD_THRESHOLDS', () => {
        it('has all required threshold fields', () => {
            expect(STANDARD_THRESHOLDS.cloudBaseAgl).toBeDefined();
            expect(STANDARD_THRESHOLDS.visibility).toBeDefined();
            expect(STANDARD_THRESHOLDS.precipitation).toBeDefined();
            expect(STANDARD_THRESHOLDS.surfaceWindSpeed).toBeDefined();
            expect(STANDARD_THRESHOLDS.surfaceGusts).toBeDefined();
            expect(STANDARD_THRESHOLDS.crosswind).toBeDefined();
            expect(STANDARD_THRESHOLDS.tailwind).toBeDefined();
            expect(STANDARD_THRESHOLDS.terrainClearance).toBeDefined();
            expect(STANDARD_THRESHOLDS.cloudClearance).toBeDefined();
        });

        it('has valid threshold structure (poor and marginal)', () => {
            expect(STANDARD_THRESHOLDS.cloudBaseAgl.poor).toBe(1500);
            expect(STANDARD_THRESHOLDS.cloudBaseAgl.marginal).toBe(2000);
        });
    });

    describe('CONSERVATIVE_THRESHOLDS', () => {
        it('has more restrictive values than standard', () => {
            // For "less than" rules, conservative marginal should be higher
            expect(CONSERVATIVE_THRESHOLDS.cloudBaseAgl.marginal).toBeGreaterThan(
                STANDARD_THRESHOLDS.cloudBaseAgl.marginal
            );
            // For "greater than" rules, conservative marginal should be lower
            expect(CONSERVATIVE_THRESHOLDS.surfaceWindSpeed.marginal).toBeLessThan(
                STANDARD_THRESHOLDS.surfaceWindSpeed.marginal
            );
        });
    });

    describe('validateThresholds', () => {
        it('returns true for valid thresholds', () => {
            expect(validateThresholds(STANDARD_THRESHOLDS)).toBe(true);
        });

        it('returns false when marginal is not safer than poor for lt rules', () => {
            const invalid: VfrConditionThresholds = {
                ...STANDARD_THRESHOLDS,
                cloudBaseAgl: { poor: 2000, marginal: 1500 }, // Wrong order
            };
            expect(validateThresholds(invalid)).toBe(false);
        });

        it('returns false when marginal is not safer than poor for gt rules', () => {
            const invalid: VfrConditionThresholds = {
                ...STANDARD_THRESHOLDS,
                surfaceWindSpeed: { poor: 20, marginal: 25 }, // Wrong order
            };
            expect(validateThresholds(invalid)).toBe(false);
        });
    });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- tests/conditionThresholds.test.ts`
Expected: FAIL with "Cannot find module '../src/types/conditionThresholds'"

**Step 3: Write the implementation**

```typescript
// src/types/conditionThresholds.ts
/**
 * Condition threshold types and preset definitions
 */

/**
 * A threshold pair for poor and marginal conditions
 */
export interface ConditionThreshold {
    poor: number;
    marginal: number;
}

/**
 * All customizable VFR condition thresholds
 */
export interface VfrConditionThresholds {
    // Weather conditions
    cloudBaseAgl: ConditionThreshold;      // ft AGL, "less than"
    visibility: ConditionThreshold;         // km, "less than"
    precipitation: ConditionThreshold;      // mm, "greater than"

    // Wind limits (terminal only)
    surfaceWindSpeed: ConditionThreshold;   // kt, "greater than"
    surfaceGusts: ConditionThreshold;       // kt, "greater than"
    crosswind: ConditionThreshold;          // kt, "greater than"
    tailwind: ConditionThreshold;           // kt, "greater than"

    // Clearances
    terrainClearance: ConditionThreshold;   // ft, "less than"
    cloudClearance: ConditionThreshold;     // ft, "less than"
}

/**
 * Preset identifier
 */
export type ConditionPreset = 'standard' | 'conservative' | 'custom';

/**
 * Standard VFR thresholds (current defaults)
 */
export const STANDARD_THRESHOLDS: VfrConditionThresholds = {
    cloudBaseAgl: { poor: 1500, marginal: 2000 },
    visibility: { poor: 5, marginal: 8 },
    precipitation: { poor: 5, marginal: 2 },
    surfaceWindSpeed: { poor: 25, marginal: 20 },
    surfaceGusts: { poor: 35, marginal: 30 },
    crosswind: { poor: 20, marginal: 15 },
    tailwind: { poor: 15, marginal: 10 },
    terrainClearance: { poor: 500, marginal: 1000 },
    cloudClearance: { poor: 200, marginal: 500 },
};

/**
 * Conservative thresholds for students or rusty pilots
 */
export const CONSERVATIVE_THRESHOLDS: VfrConditionThresholds = {
    cloudBaseAgl: { poor: 2500, marginal: 3000 },
    visibility: { poor: 8, marginal: 10 },
    precipitation: { poor: 2, marginal: 1 },
    surfaceWindSpeed: { poor: 20, marginal: 15 },
    surfaceGusts: { poor: 25, marginal: 20 },
    crosswind: { poor: 15, marginal: 10 },
    tailwind: { poor: 10, marginal: 5 },
    terrainClearance: { poor: 1000, marginal: 1500 },
    cloudClearance: { poor: 500, marginal: 1000 },
};

/**
 * Rules that use "less than" comparison (marginal > poor)
 */
const LT_RULES: (keyof VfrConditionThresholds)[] = [
    'cloudBaseAgl',
    'visibility',
    'terrainClearance',
    'cloudClearance',
];

/**
 * Rules that use "greater than" comparison (marginal < poor)
 */
const GT_RULES: (keyof VfrConditionThresholds)[] = [
    'precipitation',
    'surfaceWindSpeed',
    'surfaceGusts',
    'crosswind',
    'tailwind',
];

/**
 * Validate that thresholds are logically consistent
 * @param thresholds - The thresholds to validate
 * @returns true if valid, false otherwise
 */
export function validateThresholds(thresholds: VfrConditionThresholds): boolean {
    // For "less than" rules, marginal must be >= poor
    for (const key of LT_RULES) {
        const t = thresholds[key];
        if (t.marginal < t.poor) {
            return false;
        }
    }

    // For "greater than" rules, marginal must be <= poor
    for (const key of GT_RULES) {
        const t = thresholds[key];
        if (t.marginal > t.poor) {
            return false;
        }
    }

    return true;
}

/**
 * Get thresholds for a given preset
 * @param preset - The preset identifier
 * @param customThresholds - Custom thresholds (used when preset is 'custom')
 * @returns The thresholds for the preset
 */
export function getThresholdsForPreset(
    preset: ConditionPreset,
    customThresholds?: VfrConditionThresholds
): VfrConditionThresholds {
    switch (preset) {
        case 'conservative':
            return CONSERVATIVE_THRESHOLDS;
        case 'custom':
            return customThresholds ?? STANDARD_THRESHOLDS;
        case 'standard':
        default:
            return STANDARD_THRESHOLDS;
    }
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- tests/conditionThresholds.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/types/conditionThresholds.ts tests/conditionThresholds.test.ts
git commit -m "feat: add condition threshold types and presets"
```

---

## Task 2: Extend Settings Types

**Files:**
- Modify: `src/types/settings.ts:15-47` (PluginSettings interface)
- Modify: `src/types/settings.ts:57-72` (DEFAULT_SETTINGS)

**Step 1: Add imports and new fields to PluginSettings**

At top of `src/types/settings.ts`, add import:

```typescript
import type { VfrConditionThresholds, ConditionPreset } from './conditionThresholds';
import { STANDARD_THRESHOLDS } from './conditionThresholds';
```

Add to `PluginSettings` interface (after line 46, before the closing brace):

```typescript
    // VFR Condition thresholds
    conditionPreset: ConditionPreset;
    customThresholds: VfrConditionThresholds;
```

**Step 2: Add to DEFAULT_SETTINGS**

Add to `DEFAULT_SETTINGS` (after line 71, before the closing brace):

```typescript
    conditionPreset: 'standard',
    customThresholds: { ...STANDARD_THRESHOLDS },
```

**Step 3: Run existing tests to verify no breakage**

Run: `npm test`
Expected: All existing tests pass

**Step 4: Commit**

```bash
git add src/types/settings.ts
git commit -m "feat: add condition preset and thresholds to settings"
```

---

## Task 3: Create buildRulesFromThresholds Function

**Files:**
- Modify: `src/services/vfrConditionRules.ts`
- Modify: `tests/vfrConditionRules.test.ts`

**Step 1: Write the failing test**

Add to `tests/vfrConditionRules.test.ts`:

```typescript
import { STANDARD_THRESHOLDS, CONSERVATIVE_THRESHOLDS } from '../src/types/conditionThresholds';
import { buildRulesFromThresholds } from '../src/services/vfrConditionRules';

describe('buildRulesFromThresholds', () => {
    it('builds rules with standard thresholds matching VFR_CONDITION_RULES', () => {
        const rules = buildRulesFromThresholds(STANDARD_THRESHOLDS);
        const windRule = rules.find(r => r.id === 'terminal-wind-speed')!;
        expect(windRule.poorThreshold).toBe(25);
        expect(windRule.marginalThreshold).toBe(20);
    });

    it('builds rules with conservative thresholds', () => {
        const rules = buildRulesFromThresholds(CONSERVATIVE_THRESHOLDS);
        const windRule = rules.find(r => r.id === 'terminal-wind-speed')!;
        expect(windRule.poorThreshold).toBe(20);
        expect(windRule.marginalThreshold).toBe(15);
    });

    it('builds all 9 rules', () => {
        const rules = buildRulesFromThresholds(STANDARD_THRESHOLDS);
        expect(rules).toHaveLength(9);
    });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- tests/vfrConditionRules.test.ts`
Expected: FAIL with "buildRulesFromThresholds is not exported"

**Step 3: Write the implementation**

Add to `src/services/vfrConditionRules.ts` after the VFR_CONDITION_RULES array (after line 171):

```typescript
import type { VfrConditionThresholds } from '../types/conditionThresholds';
export { STANDARD_THRESHOLDS, CONSERVATIVE_THRESHOLDS } from '../types/conditionThresholds';

/**
 * Build VFR condition rules from custom thresholds
 * @param thresholds - Custom threshold values
 * @returns Array of VFRConditionRule with custom thresholds
 */
export function buildRulesFromThresholds(thresholds: VfrConditionThresholds): VFRConditionRule[] {
    return [
        // Terminal wind rules
        {
            id: 'terminal-wind-speed',
            name: 'Surface Wind Speed',
            terminalOnly: true,
            skipForTerminal: false,
            poorThreshold: thresholds.surfaceWindSpeed.poor,
            marginalThreshold: thresholds.surfaceWindSpeed.marginal,
            operator: 'gt',
            getValue: (c) => c.terminalWindSpeed,
            poorMessage: 'High surface wind ({value}kt)',
            marginalMessage: 'Elevated surface wind ({value}kt)',
        },
        {
            id: 'terminal-gust',
            name: 'Surface Gusts',
            terminalOnly: true,
            skipForTerminal: false,
            poorThreshold: thresholds.surfaceGusts.poor,
            marginalThreshold: thresholds.surfaceGusts.marginal,
            operator: 'gt',
            getValue: (c) => c.gustSpeed,
            poorMessage: 'High gusts ({value}kt)',
            marginalMessage: 'Elevated gusts ({value}kt)',
        },
        {
            id: 'crosswind',
            name: 'Crosswind Component',
            terminalOnly: true,
            skipForTerminal: false,
            poorThreshold: thresholds.crosswind.poor,
            marginalThreshold: thresholds.crosswind.marginal,
            operator: 'gt',
            getValue: (c) => c.crosswindKt,
            poorMessage: 'High crosswind ({value}kt)',
            marginalMessage: 'Crosswind ({value}kt)',
        },
        {
            id: 'tailwind',
            name: 'Tailwind Component',
            terminalOnly: true,
            skipForTerminal: false,
            poorThreshold: -thresholds.tailwind.poor,
            marginalThreshold: -thresholds.tailwind.marginal,
            operator: 'lt',
            getValue: (c) => c.headwindKt,
            poorMessage: 'Strong tailwind ({value}kt)',
            marginalMessage: 'Tailwind ({value}kt)',
        },
        // Weather rules
        {
            id: 'cloud-base-agl',
            name: 'Cloud Base AGL',
            terminalOnly: false,
            skipForTerminal: false,
            poorThreshold: thresholds.cloudBaseAgl.poor,
            marginalThreshold: thresholds.cloudBaseAgl.marginal,
            operator: 'lt',
            getValue: (c) => c.cloudBaseAGL < 999999 ? c.cloudBaseAGL : undefined,
            poorMessage: 'Low ceiling ({value}ft AGL)',
            marginalMessage: 'Marginal ceiling ({value}ft AGL)',
        },
        {
            id: 'visibility',
            name: 'Visibility',
            terminalOnly: false,
            skipForTerminal: false,
            poorThreshold: thresholds.visibility.poor,
            marginalThreshold: thresholds.visibility.marginal,
            operator: 'lt',
            getValue: (c) => c.visibility,
            poorMessage: 'Low visibility ({value}km)',
            marginalMessage: 'Reduced visibility ({value}km)',
        },
        {
            id: 'precipitation',
            name: 'Precipitation',
            terminalOnly: false,
            skipForTerminal: false,
            poorThreshold: thresholds.precipitation.poor,
            marginalThreshold: thresholds.precipitation.marginal,
            operator: 'gt',
            getValue: (c) => c.precipitation,
            poorMessage: 'Heavy precipitation ({value}mm)',
            marginalMessage: 'Moderate precipitation ({value}mm)',
        },
        // Clearance rules
        {
            id: 'terrain-clearance',
            name: 'Terrain Clearance',
            terminalOnly: false,
            skipForTerminal: true,
            poorThreshold: thresholds.terrainClearance.poor,
            marginalThreshold: thresholds.terrainClearance.marginal,
            operator: 'lt',
            getValue: (c) => c.terrainClearance,
            poorMessage: 'Low terrain clearance ({value}ft)',
            marginalMessage: 'Marginal terrain clearance ({value}ft)',
        },
        {
            id: 'cloud-clearance',
            name: 'Cloud Clearance',
            terminalOnly: false,
            skipForTerminal: false,
            poorThreshold: thresholds.cloudClearance.poor,
            marginalThreshold: thresholds.cloudClearance.marginal,
            operator: 'lt',
            getValue: (c) => c.cloudClearance < 999999 ? c.cloudClearance : undefined,
            poorMessage: 'Insufficient cloud clearance ({value}ft)',
            marginalMessage: 'Marginal cloud clearance ({value}ft)',
        },
    ];
}
```

Note: Also add the import at the top of the file.

**Step 4: Run test to verify it passes**

Run: `npm test -- tests/vfrConditionRules.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/services/vfrConditionRules.ts tests/vfrConditionRules.test.ts
git commit -m "feat: add buildRulesFromThresholds function"
```

---

## Task 4: Update evaluateAllRules to Accept Thresholds

**Files:**
- Modify: `src/services/vfrConditionRules.ts:261-294`
- Modify: `tests/vfrConditionRules.test.ts`

**Step 1: Write the failing test**

Add to `tests/vfrConditionRules.test.ts`:

```typescript
describe('evaluateAllRules with custom thresholds', () => {
    it('uses custom thresholds when provided', () => {
        const customThresholds: VfrConditionThresholds = {
            ...STANDARD_THRESHOLDS,
            visibility: { poor: 10, marginal: 15 }, // Much stricter
        };
        const criteria: ConditionCriteria = {
            ...goodConditions,
            visibility: 12, // Would be good with standard, marginal with custom
        };
        const result = evaluateAllRules(criteria, false, customThresholds);
        expect(result.condition).toBe('marginal');
    });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- tests/vfrConditionRules.test.ts`
Expected: FAIL (evaluateAllRules doesn't accept thresholds parameter)

**Step 3: Update evaluateAllRules signature**

Modify `src/services/vfrConditionRules.ts` - update the function signature at line 261:

```typescript
/**
 * Evaluate all rules and aggregate results
 * @param criteria - The criteria values
 * @param isTerminal - Whether this is a terminal waypoint
 * @param thresholds - Optional custom thresholds (defaults to STANDARD_THRESHOLDS)
 * @returns Aggregated condition and list of reasons
 */
export function evaluateAllRules(
    criteria: ConditionCriteria,
    isTerminal: boolean,
    thresholds?: VfrConditionThresholds
): { condition: SegmentCondition; reasons: string[] } {
    const rules = thresholds
        ? buildRulesFromThresholds(thresholds)
        : VFR_CONDITION_RULES;

    const reasons: string[] = [];
    let hasPoor = false;
    let hasMarginal = false;

    for (const rule of rules) {
        const result = evaluateRule(rule, criteria, isTerminal);

        if (result.condition === 'poor') {
            hasPoor = true;
            if (result.message) {
                reasons.push(result.message);
            }
        } else if (result.condition === 'marginal') {
            hasMarginal = true;
            if (result.message) {
                reasons.push(result.message);
            }
        }
    }

    if (hasPoor) {
        return { condition: 'poor', reasons };
    }
    if (hasMarginal) {
        return { condition: 'marginal', reasons };
    }

    return { condition: 'good', reasons: [] };
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- tests/vfrConditionRules.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/services/vfrConditionRules.ts tests/vfrConditionRules.test.ts
git commit -m "feat: evaluateAllRules accepts custom thresholds"
```

---

## Task 5: Update profileService to Use Thresholds

**Files:**
- Modify: `src/services/profileService.ts:174-353`

**Step 1: Update evaluateSegmentCondition to accept thresholds**

This function currently has hardcoded thresholds. We need to:
1. Add thresholds parameter
2. Use evaluateAllRules with thresholds instead of hardcoded checks

Add import at top of `src/services/profileService.ts`:

```typescript
import type { VfrConditionThresholds } from '../types/conditionThresholds';
import { evaluateAllRules, type ConditionCriteria } from './vfrConditionRules';
```

Modify `evaluateSegmentCondition` signature (line 174):

```typescript
export function evaluateSegmentCondition(
    point: ProfileDataPoint,
    flightAltitude: number,
    wx?: WaypointWeather,
    isTerminal: boolean = false,
    waypoint?: Waypoint,
    thresholds?: VfrConditionThresholds
): { condition: SegmentCondition; reasons: string[]; bestRunway?: BestRunwayResult } {
```

Replace the hardcoded condition checks (lines 227-340) with:

```typescript
    // Add terminal-specific criteria
    if (isTerminal && wx) {
        const terminalWindSpeed = wx.surfaceWindSpeed ?? criteria.windSpeed;
        const terminalWindDir = wx.surfaceWindDir ?? point.windDir;

        criteria.terminalWindSpeed = terminalWindSpeed;
        criteria.terminalWindDir = terminalWindDir;

        // Calculate crosswind if runway data is available
        if (waypoint?.runways && waypoint.runways.length > 0) {
            bestRunway = findBestRunway(waypoint.runways, terminalWindDir, terminalWindSpeed) ?? undefined;
            if (bestRunway) {
                criteria.crosswindKt = bestRunway.crosswindKt;
                criteria.headwindKt = bestRunway.headwindKt;
            }
        }
    }

    // Use rules-based evaluation with thresholds
    const ruleResult = evaluateAllRules(criteria, isTerminal, thresholds);

    return {
        condition: ruleResult.condition,
        reasons: ruleResult.reasons,
        bestRunway,
    };
```

**Step 2: Update callers of evaluateSegmentCondition**

Search for calls in profileService.ts (lines 548, 616) and vfrWindowService.ts (lines 393, 498).

For now, these will continue to work without thresholds (uses defaults). We'll update them in the next task to pass thresholds from settings.

**Step 3: Run tests**

Run: `npm test`
Expected: All tests pass

**Step 4: Commit**

```bash
git add src/services/profileService.ts
git commit -m "refactor: evaluateSegmentCondition uses rules-based evaluation"
```

---

## Task 6: Thread Settings Through Profile Calculation

**Files:**
- Modify: `src/services/profileService.ts` (calculateProfileData function)
- Modify: `src/plugin.svelte` (calls to profile service)

**Step 1: Add settings parameter to calculateProfileData**

Find the `calculateProfileData` function and add a settings parameter. Update all calls to `evaluateSegmentCondition` within to pass `settings.customThresholds` (or use `getThresholdsForPreset`).

This requires tracing through the call chain. The key integration point is where `calculateProfileData` is called from `plugin.svelte`.

**Step 2: Update plugin.svelte to pass settings**

Find where profile calculation is triggered and ensure settings are passed.

**Step 3: Run the plugin locally to verify**

Run: `npm run dev`
Expected: Plugin loads, profile displays correctly with default thresholds

**Step 4: Commit**

```bash
git add src/services/profileService.ts src/plugin.svelte
git commit -m "feat: thread condition thresholds through profile calculation"
```

---

## Task 7: Create ConditionsModal Component

**Files:**
- Create: `src/components/ConditionsModal.svelte`

**Step 1: Create the modal component**

```svelte
<!-- src/components/ConditionsModal.svelte -->
<script lang="ts">
    import { createEventDispatcher } from 'svelte';
    import type { VfrConditionThresholds } from '../types/conditionThresholds';
    import { STANDARD_THRESHOLDS, validateThresholds } from '../types/conditionThresholds';

    export let thresholds: VfrConditionThresholds;
    export let visible: boolean = false;

    const dispatch = createEventDispatcher<{
        save: VfrConditionThresholds;
        cancel: void;
    }>();

    // Local copy for editing
    let editThresholds: VfrConditionThresholds = JSON.parse(JSON.stringify(thresholds));

    // Validation state
    $: isValid = validateThresholds(editThresholds);

    // Section collapse state
    let weatherExpanded = true;
    let windExpanded = true;
    let clearanceExpanded = true;

    function handleSave() {
        if (isValid) {
            dispatch('save', editThresholds);
        }
    }

    function handleCancel() {
        dispatch('cancel');
    }

    function handleReset() {
        editThresholds = JSON.parse(JSON.stringify(STANDARD_THRESHOLDS));
    }

    function handleBackdropClick(e: MouseEvent) {
        if (e.target === e.currentTarget) {
            handleCancel();
        }
    }

    // Reset edit copy when thresholds prop changes
    $: if (visible) {
        editThresholds = JSON.parse(JSON.stringify(thresholds));
    }
</script>

{#if visible}
    <div class="modal-backdrop" on:click={handleBackdropClick} role="dialog" aria-modal="true">
        <div class="modal-content">
            <div class="modal-header">
                <h3>Customize VFR Conditions</h3>
                <button class="close-btn" on:click={handleCancel} aria-label="Close">×</button>
            </div>

            <div class="modal-body">
                <!-- Weather Conditions -->
                <div class="section">
                    <button
                        class="section-header"
                        on:click={() => weatherExpanded = !weatherExpanded}
                    >
                        <span class="expand-icon">{weatherExpanded ? '▼' : '▶'}</span>
                        Weather Conditions
                    </button>
                    {#if weatherExpanded}
                        <div class="section-content">
                            <div class="threshold-row header">
                                <span class="label"></span>
                                <span class="value-header">Marginal</span>
                                <span class="value-header">Poor</span>
                            </div>
                            <div class="threshold-row">
                                <span class="label">Cloud Base (ft)</span>
                                <input type="number" bind:value={editThresholds.cloudBaseAgl.marginal} min="0" step="100" />
                                <input type="number" bind:value={editThresholds.cloudBaseAgl.poor} min="0" step="100" />
                            </div>
                            <div class="threshold-row">
                                <span class="label">Visibility (km)</span>
                                <input type="number" bind:value={editThresholds.visibility.marginal} min="0" step="1" />
                                <input type="number" bind:value={editThresholds.visibility.poor} min="0" step="1" />
                            </div>
                            <div class="threshold-row">
                                <span class="label">Precipitation (mm)</span>
                                <input type="number" bind:value={editThresholds.precipitation.marginal} min="0" step="0.5" />
                                <input type="number" bind:value={editThresholds.precipitation.poor} min="0" step="0.5" />
                            </div>
                        </div>
                    {/if}
                </div>

                <!-- Wind Limits -->
                <div class="section">
                    <button
                        class="section-header"
                        on:click={() => windExpanded = !windExpanded}
                    >
                        <span class="expand-icon">{windExpanded ? '▼' : '▶'}</span>
                        Wind Limits (Takeoff/Landing)
                    </button>
                    {#if windExpanded}
                        <div class="section-content">
                            <div class="threshold-row header">
                                <span class="label"></span>
                                <span class="value-header">Marginal</span>
                                <span class="value-header">Poor</span>
                            </div>
                            <div class="threshold-row">
                                <span class="label">Wind Speed (kt)</span>
                                <input type="number" bind:value={editThresholds.surfaceWindSpeed.marginal} min="0" step="1" />
                                <input type="number" bind:value={editThresholds.surfaceWindSpeed.poor} min="0" step="1" />
                            </div>
                            <div class="threshold-row">
                                <span class="label">Gusts (kt)</span>
                                <input type="number" bind:value={editThresholds.surfaceGusts.marginal} min="0" step="1" />
                                <input type="number" bind:value={editThresholds.surfaceGusts.poor} min="0" step="1" />
                            </div>
                            <div class="threshold-row">
                                <span class="label">Crosswind (kt)</span>
                                <input type="number" bind:value={editThresholds.crosswind.marginal} min="0" step="1" />
                                <input type="number" bind:value={editThresholds.crosswind.poor} min="0" step="1" />
                            </div>
                            <div class="threshold-row">
                                <span class="label">Tailwind (kt)</span>
                                <input type="number" bind:value={editThresholds.tailwind.marginal} min="0" step="1" />
                                <input type="number" bind:value={editThresholds.tailwind.poor} min="0" step="1" />
                            </div>
                        </div>
                    {/if}
                </div>

                <!-- Clearances -->
                <div class="section">
                    <button
                        class="section-header"
                        on:click={() => clearanceExpanded = !clearanceExpanded}
                    >
                        <span class="expand-icon">{clearanceExpanded ? '▼' : '▶'}</span>
                        Clearances
                    </button>
                    {#if clearanceExpanded}
                        <div class="section-content">
                            <div class="threshold-row header">
                                <span class="label"></span>
                                <span class="value-header">Marginal</span>
                                <span class="value-header">Poor</span>
                            </div>
                            <div class="threshold-row">
                                <span class="label">Terrain (ft)</span>
                                <input type="number" bind:value={editThresholds.terrainClearance.marginal} min="0" step="100" />
                                <input type="number" bind:value={editThresholds.terrainClearance.poor} min="0" step="100" />
                            </div>
                            <div class="threshold-row">
                                <span class="label">Cloud (ft)</span>
                                <input type="number" bind:value={editThresholds.cloudClearance.marginal} min="0" step="100" />
                                <input type="number" bind:value={editThresholds.cloudClearance.poor} min="0" step="100" />
                            </div>
                        </div>
                    {/if}
                </div>

                {#if !isValid}
                    <div class="validation-error">
                        Invalid thresholds: Marginal must be safer than Poor
                    </div>
                {/if}
            </div>

            <div class="modal-footer">
                <button class="btn-reset" on:click={handleReset}>Reset to Standard</button>
                <div class="footer-actions">
                    <button class="btn-cancel" on:click={handleCancel}>Cancel</button>
                    <button class="btn-save" on:click={handleSave} disabled={!isValid}>Save</button>
                </div>
            </div>
        </div>
    </div>
{/if}

<style lang="less">
    .modal-backdrop {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.7);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
    }

    .modal-content {
        background: #1a1a1a;
        border-radius: 8px;
        width: 90%;
        max-width: 450px;
        max-height: 80vh;
        display: flex;
        flex-direction: column;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
    }

    .modal-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 15px 20px;
        border-bottom: 1px solid #333;

        h3 {
            margin: 0;
            color: #fff;
            font-size: 16px;
        }

        .close-btn {
            background: none;
            border: none;
            color: #888;
            font-size: 24px;
            cursor: pointer;
            padding: 0;
            line-height: 1;

            &:hover {
                color: #fff;
            }
        }
    }

    .modal-body {
        padding: 15px 20px;
        overflow-y: auto;
        flex: 1;
    }

    .section {
        margin-bottom: 10px;
        border: 1px solid #333;
        border-radius: 4px;
        overflow: hidden;
    }

    .section-header {
        width: 100%;
        padding: 10px 15px;
        background: #252525;
        border: none;
        color: #e0e0e0;
        font-size: 14px;
        font-weight: 500;
        text-align: left;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 8px;

        &:hover {
            background: #2a2a2a;
        }

        .expand-icon {
            font-size: 10px;
            color: #888;
        }
    }

    .section-content {
        padding: 10px 15px;
        background: #1e1e1e;
    }

    .threshold-row {
        display: grid;
        grid-template-columns: 1fr 80px 80px;
        gap: 10px;
        align-items: center;
        padding: 5px 0;

        &.header {
            padding-bottom: 8px;
            border-bottom: 1px solid #333;
            margin-bottom: 5px;
        }

        .label {
            color: #ccc;
            font-size: 13px;
        }

        .value-header {
            color: #888;
            font-size: 12px;
            text-align: center;
        }

        input {
            width: 100%;
            padding: 6px 8px;
            border: 1px solid #444;
            border-radius: 4px;
            background: #2a2a2a;
            color: #fff;
            font-size: 13px;
            text-align: center;

            &:focus {
                outline: none;
                border-color: #4a90d9;
            }

            &::-webkit-inner-spin-button,
            &::-webkit-outer-spin-button {
                opacity: 1;
            }
        }
    }

    .validation-error {
        margin-top: 10px;
        padding: 10px;
        background: rgba(220, 53, 69, 0.2);
        border: 1px solid #dc3545;
        border-radius: 4px;
        color: #dc3545;
        font-size: 13px;
    }

    .modal-footer {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 15px 20px;
        border-top: 1px solid #333;

        .footer-actions {
            display: flex;
            gap: 10px;
        }

        button {
            padding: 8px 16px;
            border-radius: 4px;
            font-size: 14px;
            cursor: pointer;
            border: none;
        }

        .btn-reset {
            background: transparent;
            color: #888;
            border: 1px solid #555;

            &:hover {
                background: #333;
                color: #ccc;
            }
        }

        .btn-cancel {
            background: #444;
            color: #ccc;

            &:hover {
                background: #555;
            }
        }

        .btn-save {
            background: #4a90d9;
            color: #fff;

            &:hover {
                background: #5a9fe9;
            }

            &:disabled {
                background: #333;
                color: #666;
                cursor: not-allowed;
            }
        }
    }
</style>
```

**Step 2: Verify component compiles**

Run: `npm run build`
Expected: No errors

**Step 3: Commit**

```bash
git add src/components/ConditionsModal.svelte
git commit -m "feat: add ConditionsModal component"
```

---

## Task 8: Add VFR Conditions Section to SettingsPanel

**Files:**
- Modify: `src/components/SettingsPanel.svelte`

**Step 1: Add imports and props**

At top of script section:

```typescript
import type { ConditionPreset, VfrConditionThresholds } from '../types/conditionThresholds';
import { getThresholdsForPreset, STANDARD_THRESHOLDS, CONSERVATIVE_THRESHOLDS } from '../types/conditionThresholds';

export let conditionPreset: ConditionPreset;
export let customThresholds: VfrConditionThresholds;

const dispatch = createEventDispatcher<{
    change: void;
    profileAltitudeChange: number;
    openConditionsModal: void;
    presetChange: ConditionPreset;
}>();

function handlePresetChange() {
    dispatch('presetChange', conditionPreset);
    dispatch('change');
}

function handleOpenModal() {
    dispatch('openConditionsModal');
}
```

**Step 2: Add VFR Conditions section to template**

Add at the beginning of the settings-section div (before the first setting-group):

```svelte
<div class="setting-group vfr-conditions">
    <label class="setting-label">VFR Conditions</label>
    <div class="setting-input">
        <select bind:value={conditionPreset} on:change={handlePresetChange}>
            <option value="standard">Standard VFR</option>
            <option value="conservative">Conservative</option>
            <option value="custom">Custom</option>
        </select>
    </div>
    <div class="setting-description">
        Defines ceiling, visibility, wind and clearance thresholds for the profile display.
    </div>
    <button class="customize-btn" on:click={handleOpenModal}>
        Customize...
    </button>
</div>

<div class="setting-divider"></div>
```

**Step 3: Add styles**

Add to the style section:

```less
.vfr-conditions {
    select {
        width: 100%;
        padding: 8px;
        border: 1px solid #555;
        border-radius: 4px;
        background: #2a2a2a;
        color: #fff;
        font-size: 14px;
        cursor: pointer;

        &:focus {
            outline: none;
            border-color: #4a90d9;
        }
    }

    .customize-btn {
        margin-top: 10px;
        padding: 6px 12px;
        background: #333;
        border: 1px solid #555;
        border-radius: 4px;
        color: #ccc;
        font-size: 13px;
        cursor: pointer;

        &:hover {
            background: #444;
            color: #fff;
        }
    }
}

.setting-divider {
    height: 1px;
    background: #333;
    margin: 15px 0;
}
```

**Step 4: Run build to verify**

Run: `npm run build`
Expected: No errors

**Step 5: Commit**

```bash
git add src/components/SettingsPanel.svelte
git commit -m "feat: add VFR conditions section to SettingsPanel"
```

---

## Task 9: Integrate Modal into plugin.svelte

**Files:**
- Modify: `src/plugin.svelte`

**Step 1: Import modal and add state**

Add import:

```typescript
import ConditionsModal from './components/ConditionsModal.svelte';
import { getThresholdsForPreset } from './types/conditionThresholds';
```

Add state variable:

```typescript
let showConditionsModal = false;
```

**Step 2: Add event handlers**

```typescript
function handleOpenConditionsModal() {
    showConditionsModal = true;
}

function handleConditionsSave(event: CustomEvent<VfrConditionThresholds>) {
    settings.customThresholds = event.detail;
    settings.conditionPreset = 'custom';
    showConditionsModal = false;
    handleSettingsChange();
}

function handleConditionsCancel() {
    showConditionsModal = false;
}

function handlePresetChange(event: CustomEvent<ConditionPreset>) {
    settings.conditionPreset = event.detail;
    if (event.detail !== 'custom') {
        settings.customThresholds = { ...getThresholdsForPreset(event.detail) };
    }
    handleSettingsChange();
}
```

**Step 3: Update SettingsPanel usage**

Find the SettingsPanel component and add the new props and events:

```svelte
<SettingsPanel
    bind:settings
    bind:maxProfileAltitude
    {flightPlan}
    conditionPreset={settings.conditionPreset}
    customThresholds={settings.customThresholds}
    on:change={handleSettingsChange}
    on:profileAltitudeChange={handleProfileAltitudeChange}
    on:openConditionsModal={handleOpenConditionsModal}
    on:presetChange={handlePresetChange}
/>
```

**Step 4: Add modal to template**

Add at end of component (before closing tag):

```svelte
<ConditionsModal
    visible={showConditionsModal}
    thresholds={settings.customThresholds}
    on:save={handleConditionsSave}
    on:cancel={handleConditionsCancel}
/>
```

**Step 5: Run locally and test**

Run: `npm run dev`
Expected:
- Settings tab shows VFR Conditions dropdown
- Clicking "Customize..." opens modal
- Changing values and saving updates the preset to "Custom"
- Profile recalculates with new thresholds

**Step 6: Commit**

```bash
git add src/plugin.svelte
git commit -m "feat: integrate conditions modal into main plugin"
```

---

## Task 10: Update Types Index Export

**Files:**
- Modify: `src/types/index.ts` (if exists)

**Step 1: Export new types**

If there's an index.ts that re-exports types, add:

```typescript
export * from './conditionThresholds';
```

**Step 2: Commit**

```bash
git add src/types/index.ts
git commit -m "chore: export condition threshold types"
```

---

## Task 11: Final Integration Test

**Files:**
- All modified files

**Step 1: Run full test suite**

Run: `npm test`
Expected: All tests pass

**Step 2: Run build**

Run: `npm run build`
Expected: Clean build with no errors

**Step 3: Manual testing checklist**

Run: `npm run dev`

Test scenarios:
- [ ] Default preset is "Standard VFR"
- [ ] Changing to "Conservative" updates profile colors
- [ ] "Customize..." opens modal with current values
- [ ] Modal validation prevents invalid thresholds
- [ ] "Reset to Standard" resets all values
- [ ] Saving custom values switches to "Custom" preset
- [ ] Settings persist after page refresh
- [ ] Profile correctly reflects custom thresholds

**Step 4: Commit any fixes**

```bash
git add -A
git commit -m "fix: integration fixes for customizable VFR conditions"
```

---

## Task 12: Final Commit and Summary

**Step 1: Verify all changes committed**

Run: `git status`
Expected: Clean working directory

**Step 2: Create summary commit if needed**

Run: `git log --oneline -10`
Verify all feature commits are present

**Step 3: Ready for PR**

The feature branch `feature/customizable-vfr-conditions` is ready for review and merge.

---

## Files Changed Summary

| File | Action | Purpose |
|------|--------|---------|
| `src/types/conditionThresholds.ts` | Create | Types and preset constants |
| `tests/conditionThresholds.test.ts` | Create | Unit tests for thresholds |
| `src/types/settings.ts` | Modify | Add preset and thresholds to settings |
| `src/services/vfrConditionRules.ts` | Modify | Add buildRulesFromThresholds, update evaluateAllRules |
| `tests/vfrConditionRules.test.ts` | Modify | Add tests for custom thresholds |
| `src/services/profileService.ts` | Modify | Thread thresholds through evaluation |
| `src/components/ConditionsModal.svelte` | Create | Modal editor component |
| `src/components/SettingsPanel.svelte` | Modify | Add VFR conditions section |
| `src/plugin.svelte` | Modify | Integrate modal and handle events |
