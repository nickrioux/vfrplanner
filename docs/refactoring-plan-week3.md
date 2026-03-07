# Week 3 Refactoring Plan

## Context

Refactoring completed so far:
- **Week 1**: Extracted weather logic into `weatherStore` + `weatherController`
- **Week 2**: Extracted route logic into `routeController` (using existing `routeStore`)

## Remaining Logic in plugin.svelte

| Category | Lines | Description |
|----------|-------|-------------|
| Map Rendering | ~250 | `updateMapLayers`, `clearMapLayers`, `fitMapToRoute` (Leaflet code) |
| Airport Search | ~80 | State + `handleSearch` logic |
| Settings | ~30 | Local state, loaded from sessionStorage |
| Session Management | ~50 | `saveSession`, `loadSession` orchestration |
| Export | ~30 | Distance planning URL, VFR CSV export |

## Priority Tasks

### 1. Create SettingsStore (High Priority)

**Why**: Settings are cross-cutting, used by controllers, services, and components. Centralizing eliminates `getSettings()` dependency injection.

**Action**:
- Create `src/stores/settingsStore.ts`
- Move `settings` state, `DEFAULT_SETTINGS`, session persistence
- Refactor controllers to read from store instead of `getSettings()`

### 2. Create MapController (High Priority)

**Why**: Extracting map logic will dramatically simplify `plugin.svelte`, making it a pure view layer. Decouples app logic from Leaflet.

**Action**:
- Create `src/controllers/mapController.ts`
- Move `updateMapLayers`, `clearMapLayers`, `fitMapToRoute`
- Move state: `routeLayer`, `waypointMarkers`, `markerMap`
- Subscribe to `routeStore`, `weatherStore`, `settingsStore`
- Remove `onMapUpdate()` callbacks from other controllers

### 3. Create SearchController + SearchStore (Medium Priority)

**Why**: Airport search is a distinct feature that can be isolated.

**Action**:
- Create `src/stores/searchStore.ts`
- Create `src/controllers/searchController.ts`
- Move state: `searchQuery`, `searchResults`, `isSearching`, `searchError`, `showSearchPanel`
- Move logic: `handleSearch`, `searchResultToAirportDB`

### 4. Consolidate VFR Window Search (Medium Priority)

**Why**: Duplicate logic exists in both plugin.svelte and weatherController.

**Action**:
- Remove `handleFindVFRWindows` implementation from plugin.svelte
- Component should only call `searchVFRWindows` from weatherController
- Move `downloadVFRWindowCSV` to `src/exporters/csvExporter.ts`

### 5. Centralize Session Management (Low Priority)

**Why**: Eliminate manual `onSaveSession()` calls everywhere.

**Action**:
- Create `SessionService` that subscribes to all stores
- Auto-save (debounced) on state changes
- Remove `onSaveSession` callbacks from controllers

## Code Smells to Fix

### routeController Issues

1. **View coupling via `tick()`**
   - Controllers should be view-agnostic
   - Should update store, let view react

2. **Passing view functions to controllers**
   - `selectWaypoint(wp, panToWaypoint)` - accepts map function
   - `toggleEditMode(resetCursor)` - accepts DOM function
   - Controllers should only update state

3. **Inconsistent error handling**
   - Returns `{success, error}` objects
   - Should set errors in store like weatherController

### Recommended Pattern

Follow `weatherController` patterns:
- Store-based error handling
- No view/DOM awareness
- Granular stores for different concerns

## Controller Comparison

| Aspect | routeController | weatherController (target) |
|--------|-----------------|---------------------------|
| View coupling | High (`tick()`, callbacks) | Low |
| Error handling | Return objects | Store-based |
| Store design | Monolithic | Granular (3 stores) |
| DOM awareness | Yes (cursor, pan) | No |

## Execution Order

```
Week 3a: SettingsStore
         └── Enables removing getSettings() dependency

Week 3b: MapController
         └── Biggest code reduction in plugin.svelte
         └── Removes onMapUpdate() callbacks

Week 3c: SearchController
         └── Further simplifies plugin.svelte

Week 3d: Align routeController to weatherController patterns
         └── Remove tick() usage
         └── Store-based errors
         └── Remove view callbacks
```

## Success Metrics

- plugin.svelte reduced to <500 lines (currently ~1600)
- All controllers follow consistent patterns
- No `tick()` in controllers
- No view/DOM functions passed to controllers
- Centralized settings and session management
