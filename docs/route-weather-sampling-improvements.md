# Route Weather Sampling — Improvement Plan

Based on code analysis of the feature implemented on the `feature/high-res-meteo-samples` branch.

## Critical

### 1. Add request cancellation for stale fetches
**Files**: `weatherController.ts`, `routeWeatherSamplingService.ts`

When the user moves the time slider while `fetchRouteWeatherSamples()` is still running, the old request continues and its results may overwrite newer data in the store. Add a generation counter (or `AbortController`) so that when a new fetch starts, the previous one's results are discarded.

**Approach**:
- Add a `fetchGeneration` counter in `weatherController.ts`, incremented at the start of each `fetchWeatherForRoute()` call
- After `fetchRouteWeatherSamples()` returns, check if the generation still matches before writing to the store
- Alternatively, pass an `AbortSignal` through to `runWithConcurrency` so in-flight API calls are cancelled early

## Important

### 2. Remove duplicate / dead `handleWindyTimestampChange`
**Files**: `weatherController.ts:554-577`, `plugin.svelte:574`

The controller exports `handleWindyTimestampChange` which only updates the departure time store (no re-fetch). The plugin imports it as `controllerHandleWindyTimestampChange` but never uses it — the local version with re-fetch + queueing logic is what Windy's timestamp listener calls.

**Action**: Remove the controller version and the unused import in plugin.svelte.

### 3. Support multi-level timestamp queueing
**Files**: `plugin.svelte:1095-1119`

Currently only one pending timestamp is queued. If the user moves the slider during the queued re-fetch, that third change is dropped by the `isLoadingWeather` guard. The queueing should be recursive: after processing a queued fetch, check again for any newer pending timestamp.

**Approach**: In the `.finally()` of the queued fetch, repeat the pending-check pattern (same as the outer `.finally()`). Or refactor into a loop that drains pending timestamps until none remain.

### 4. Show warning on sampling failure
**Files**: `weatherController.ts:214-218`, `weatherStore.ts`, `plugin.svelte`

When route sampling fails silently, the user sees no route coloring or alerts — indistinguishable from "no issues found." Add a store field (e.g., `routeSamplingError: string | null`) and display a warning banner in the plugin UI when sampling fails.

### 5. Cache condition evaluations to avoid redundant work
**Files**: `mapController.ts:112-117`, `weatherStore.ts`

`evaluateRouteWeatherConditions()` runs on every `updateMapLayers()` call even when weather data hasn't changed. Compute conditions once in the controller after fetching samples and store the result alongside `routeWeatherSamples`. The map controller then reads pre-computed conditions instead of recalculating.

## Recommended

### 6. Round cache key time to nearest minute
**Files**: `routeWeatherSamplingService.ts:124`

The cache compares `departureTime` exactly (millisecond precision). Windy's timestamp can vary by small amounts, causing cache misses for effectively identical weather. Round to the nearest 60 seconds before comparison to reduce redundant API calls.

### 7. Use index-based sample-to-popup matching
**Files**: `mapController.ts:192-194`

Replace the floating-point distance comparison (`Math.abs(s.distance - sample.distance) < 0.1`) with index-based matching. Both `routeWeatherSamples` and `sampleConditions` are derived from the same source array, so matching by index is simpler and more reliable.

### 8. Add terrain clearance for intermediate samples
**Files**: `routeWeatherSamplingService.ts:252`

Currently `terrainClearance: 99999` disables terrain checks for all intermediate points. On mountainous routes this could miss condition downgrades. If the elevation profile is available, look up the terrain elevation at each sample's distance and compute actual clearance.

### 9. Add zoom-dependent visibility or clustering for debug dots
**Files**: `mapController.ts:189-221`

At 5 NM intervals on a 500 NM route, 100 dot markers are created with no clustering. Add either Leaflet marker clustering or a zoom-level threshold below which dots are hidden to improve map performance on mobile/low-end devices.

### 10. Clean up unused import
**Files**: `plugin.svelte:574`

Remove `handleWindyTimestampChange as controllerHandleWindyTimestampChange` from the import block (covered by item #2).
