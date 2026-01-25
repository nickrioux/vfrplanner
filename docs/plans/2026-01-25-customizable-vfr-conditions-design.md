# Customizable VFR Conditions Design

## Overview

Add user-customizable thresholds for VFR, MVFR, and IFR condition evaluation, including personal pilot limitations for winds and crosswind components.

### Goals

- Allow pilots to set personal minimums more conservative than standard VFR
- Support aircraft-specific wind limitations
- Accommodate regional/regulatory differences
- Provide quick presets for common scenarios

### Approach

Hybrid UI: preset selector in Settings panel with "Customize..." button opening a detailed modal editor.

---

## Data Types

### New Types (`src/types/conditionThresholds.ts`)

```typescript
// Threshold pair for each condition rule
export interface ConditionThreshold {
  poor: number;      // Red - no-go
  marginal: number;  // Yellow - caution
}

// All customizable thresholds grouped by category
export interface VfrConditionThresholds {
  // Weather
  cloudBaseAgl: ConditionThreshold;      // ft, "less than"
  visibility: ConditionThreshold;         // km, "less than"
  precipitation: ConditionThreshold;      // mm, "greater than"

  // Wind (terminal only)
  surfaceWindSpeed: ConditionThreshold;   // kt, "greater than"
  surfaceGusts: ConditionThreshold;       // kt, "greater than"
  crosswind: ConditionThreshold;          // kt, "greater than"
  tailwind: ConditionThreshold;           // kt, "greater than"

  // Clearances
  terrainClearance: ConditionThreshold;   // ft, "less than"
  cloudClearance: ConditionThreshold;     // ft, "less than"
}

// Preset identifier
export type ConditionPreset = 'standard' | 'conservative' | 'custom';
```

### Settings Extension (`src/types/settings.ts`)

```typescript
interface PluginSettings {
  // ... existing fields ...
  conditionPreset: ConditionPreset;
  customThresholds: VfrConditionThresholds;
}
```

---

## Preset Definitions

### Standard VFR (current defaults)

| Parameter | Marginal | Poor | Unit | Operator |
|-----------|----------|------|------|----------|
| Cloud Base AGL | 2000 | 1500 | ft | < |
| Visibility | 8 | 5 | km | < |
| Precipitation | 2 | 5 | mm | > |
| Surface Wind | 20 | 25 | kt | > |
| Gusts | 30 | 35 | kt | > |
| Crosswind | 15 | 20 | kt | > |
| Tailwind | 10 | 15 | kt | > |
| Terrain Clearance | 1000 | 500 | ft | < |
| Cloud Clearance | 500 | 200 | ft | < |

### Conservative (student/rusty pilot)

| Parameter | Marginal | Poor | Unit | Operator |
|-----------|----------|------|------|----------|
| Cloud Base AGL | 3000 | 2500 | ft | < |
| Visibility | 10 | 8 | km | < |
| Precipitation | 1 | 2 | mm | > |
| Surface Wind | 15 | 20 | kt | > |
| Gusts | 20 | 25 | kt | > |
| Crosswind | 10 | 15 | kt | > |
| Tailwind | 5 | 10 | kt | > |
| Terrain Clearance | 1500 | 1000 | ft | < |
| Cloud Clearance | 1000 | 500 | ft | < |

---

## UI Design

### Settings Panel Section

New collapsible section at top of Settings panel:

```
┌─────────────────────────────────────────┐
│ ▼ VFR Conditions                        │
├─────────────────────────────────────────┤
│  Condition Preset                       │
│  ┌─────────────────────────────┬──┐    │
│  │ Standard VFR                │ ▼│    │
│  └─────────────────────────────┴──┘    │
│                                         │
│  Defines ceiling, visibility, wind      │
│  and clearance thresholds for the       │
│  profile display.                       │
│                                         │
│  [Customize...]                         │
└─────────────────────────────────────────┘
```

**Dropdown Options:**
- Standard VFR - "Typical VFR minimums"
- Conservative - "Cautious limits for students or rusty pilots"
- Custom - "Your personalized minimums"

### Conditions Modal

```
┌─────────────────────────────────────────────────────┐
│  Customize VFR Conditions                     [X]  │
├─────────────────────────────────────────────────────┤
│                                                     │
│  ▼ Weather Conditions                               │
│  ┌─────────────────────────────────────────────────┐
│  │                      Marginal    Poor           │
│  │  Cloud Base (ft)    [  2000 ]   [ 1500 ]       │
│  │  Visibility (km)    [     8 ]   [    5 ]       │
│  │  Precipitation (mm) [     2 ]   [    5 ]       │
│  └─────────────────────────────────────────────────┘
│                                                     │
│  ▼ Wind Limits (Takeoff/Landing)                   │
│  ┌─────────────────────────────────────────────────┐
│  │                      Marginal    Poor           │
│  │  Wind Speed (kt)    [    20 ]   [   25 ]       │
│  │  Gusts (kt)         [    30 ]   [   35 ]       │
│  │  Crosswind (kt)     [    15 ]   [   20 ]       │
│  │  Tailwind (kt)      [    10 ]   [   15 ]       │
│  └─────────────────────────────────────────────────┘
│                                                     │
│  ▼ Clearances                                       │
│  ┌─────────────────────────────────────────────────┐
│  │                      Marginal    Poor           │
│  │  Terrain (ft)       [  1000 ]   [  500 ]       │
│  │  Cloud (ft)         [   500 ]   [  200 ]       │
│  └─────────────────────────────────────────────────┘
│                                                     │
│  ┌──────────────────┐                              │
│  │ Reset to Standard │    [ Cancel ]  [ Save ]    │
│  └──────────────────┘                              │
└─────────────────────────────────────────────────────┘
```

### Validation Rules

- For "less than" rules (ceiling, vis, clearances): marginal > poor
- For "greater than" rules (wind, gusts, precip): marginal < poor
- All values must be positive
- Visual indicator on invalid inputs

---

## Integration

### vfrConditionRules.ts Changes

```typescript
// Export threshold constants
export const STANDARD_THRESHOLDS: VfrConditionThresholds = { ... };
export const CONSERVATIVE_THRESHOLDS: VfrConditionThresholds = { ... };

// Build rules dynamically from thresholds
function buildRules(thresholds: VfrConditionThresholds): VfrConditionRule[] {
  return [
    {
      name: 'Cloud Base AGL',
      poorThreshold: thresholds.cloudBaseAgl.poor,
      marginalThreshold: thresholds.cloudBaseAgl.marginal,
      // ... rest unchanged
    },
    // ...
  ];
}

// Updated evaluation function
export function evaluateAllRules(
  criteria: VfrCriteria,
  isTerminal: boolean,
  thresholds: VfrConditionThresholds
): { condition: ConditionType; reasons: string[] }
```

### profileService.ts Changes

Pass thresholds from settings to evaluation:

```typescript
const result = evaluateAllRules(criteria, isTerminal, settings.customThresholds);
```

---

## File Changes

### New Files

| File | Purpose |
|------|---------|
| `src/components/ConditionsModal.svelte` | Modal with grouped threshold editors |
| `src/types/conditionThresholds.ts` | Types and preset constants |

### Modified Files

| File | Changes |
|------|---------|
| `src/types/settings.ts` | Add `conditionPreset` and `customThresholds` to PluginSettings, DEFAULT_SETTINGS |
| `src/components/SettingsPanel.svelte` | Add "VFR Conditions" section with preset dropdown and Customize button |
| `src/services/vfrConditionRules.ts` | Export threshold constants, refactor to accept thresholds parameter |
| `src/services/profileService.ts` | Pass thresholds from settings to evaluation functions |
| `src/plugin.svelte` | Handle modal open/close state, ensure settings flow to profile service |

---

## Component Hierarchy

```
plugin.svelte
├── SettingsPanel.svelte
│   └── Preset dropdown + "Customize..." button
│       └── on:customize → opens modal
└── ConditionsModal.svelte (conditionally rendered)
    ├── Weather group (inline)
    ├── Wind group (inline)
    ├── Clearances group (inline)
    └── on:save → updates settings.customThresholds
```

---

## Storage

- `conditionPreset` and `customThresholds` stored in localStorage via existing session mechanism
- Built-in presets (standard, conservative) are code constants, not stored
- Only the user's custom thresholds persist

---

## Future Enhancements (out of scope)

- Named profiles (multiple custom configurations)
- ICAO vs FAA regulatory presets
- Night VFR presets
- Mountain flying presets
- Import/export of custom configurations
