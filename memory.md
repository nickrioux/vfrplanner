# VFR Planner Plugin - Session Transfer Memory

> Transfer document for continuing development on another machine.
> Generated from Claude Code session memory on 2026-03-11.

## Project Overview

- **What**: Windy.com plugin for VFR (Visual Flight Rules) flight planning
- **Stack**: Svelte + TypeScript, bundled with Rollup
- **Version**: 1.0.5
- **Repo**: `https://github.com/nickrioux/vfrplanner.git`
- **Branch**: `feature/ai-llm-integration` (latest commit: `c06503f`)
- **Base branch for PRs**: `main`

## Build & Run

```bash
npm run build          # Rollup build → dist/plugin.js, dist/plugin.min.js
npm run dev            # Dev server with HTTPS on localhost:9995
```

- Version must be updated in **both** `package.json` AND `src/pluginConfig.ts`
- `dist/plugin.json` version comes from `pluginConfig.ts`, not `package.json`

## Git Conventions

- **No** `Co-Authored-By` lines in commits (per `CLAUDE.md`)
- Commit message style: `type: short description` (e.g., `feat:`, `refactor:`, `fix:`, `docs:`)

## Architecture

### Directory Structure

```
src/
├── plugin.svelte              # Main entry point (desktop layout + CSS variables)
├── pluginConfig.ts            # Plugin metadata (name, version, etc.)
├── components/                # Svelte UI components
│   ├── AltitudeProfile.svelte # SVG altitude/terrain/wind profile chart
│   ├── DepartureSlider.svelte # Time slider with VFR window indicators
│   ├── WaypointTable.svelte   # Route waypoint list with weather data
│   ├── SettingsPanel.svelte   # Plugin settings (aircraft, thresholds, LLM)
│   ├── SearchPanel.svelte     # Airport/navaid search
│   ├── AIBriefingCard.svelte  # LLM-powered flight briefing display
│   ├── ImportSection.svelte   # FPL file import
│   ├── ActionButtons.svelte   # Weather fetch, export, edit mode buttons
│   ├── TabNavigation.svelte   # Route/Profile/Settings/About tabs
│   ├── HelpModal.svelte       # Help overlay
│   ├── ConditionsModal.svelte # VFR threshold configuration
│   ├── AboutTab.svelte        # Plugin info
│   ├── WeatherAlerts.svelte   # Weather alert display
│   ├── mobile/                # Mobile-specific layouts
│   └── tablet/                # Tablet-specific layouts
├── controllers/
│   ├── mapController.ts       # Leaflet map markers, polylines, popups
│   ├── routeController.ts     # Flight plan CRUD, waypoint management
│   └── weatherController.ts   # Weather fetch orchestration
├── services/
│   ├── weatherService.ts      # Core weather data fetching (reduced to ~933 lines)
│   ├── weatherInterpolation.ts # Extracted: time-based weather interpolation
│   ├── weatherAlerts.ts       # Extracted: alert thresholds and checking
│   ├── weatherHelpers.ts      # Wind component calculations
│   ├── profileService.ts      # Altitude profile computation, SegmentCondition re-export
│   ├── vfrConditionRules.ts   # VFR condition evaluation (good/marginal/poor)
│   ├── vfrWindowService.ts    # VFR time window search algorithm
│   ├── forecastCache.ts       # LRU TTL cache for forecast data
│   ├── llmService.ts          # LLM API integration (multi-provider)
│   ├── verticalWindService.ts # Wind data at multiple altitude levels
│   ├── pointForecastService.ts # Single-point forecast fetching
│   ├── routeWeatherSamplingService.ts # Intermediate route point weather
│   ├── elevationService.ts    # Terrain elevation data
│   ├── airportdbService.ts    # AirportDB API (uses apiToken query param, NOT header)
│   ├── airportFallbackService.ts # Offline airport database
│   ├── airportProvider.ts     # Airport data provider abstraction
│   ├── navigationCalc.ts      # Great circle, bearing, distance calculations
│   ├── sessionStorage.ts      # Browser session persistence
│   └── logger.ts              # Logger singleton (defaults disabled)
├── stores/
│   ├── routeStore.ts          # Flight plan state
│   ├── weatherStore.ts        # Weather data state
│   ├── settingsStore.ts       # User settings state
│   └── uiStore.ts             # UI state (active tab, modals, etc.)
├── types/
│   ├── flightPlan.ts          # FlightPlan, Waypoint, WaypointType, RunwayInfo
│   ├── weather.ts             # SegmentCondition ('good'|'marginal'|'poor'|'unknown')
│   ├── llm.ts                 # LLMConfig, LLMProvider types
│   ├── settings.ts            # PluginSettings
│   ├── vfrWindow.ts           # VFRWindow, VFRWindowSearchResult
│   ├── conditionThresholds.ts # VfrConditionThresholds
│   └── fpl.ts                 # FPL file format types
├── utils/
│   ├── displayUtils.ts        # SEGMENT_COLORS, MARKER_COLORS, getSegmentColor()
│   ├── windBarb.ts            # Extracted: SVG wind barb generation
│   ├── interpolation.ts       # lerpAngle and numeric interpolation
│   ├── sunCalc.ts             # Sunrise/sunset calculations
│   ├── units.ts               # Unit conversions (ft↔m, kt↔km/h)
│   ├── constants.ts           # Shared constants
│   └── performance.ts         # Performance utilities
└── data/
    └── airports-fallback.json # Generated offline airport database
```

### Key Patterns

- **Windy API**: `store.get('product')`, `store.set('product', value)`, `store.on('product', callback)` for Windy integration
- **Bidirectional timeline sync**: Plugin departure time ↔ Windy timeline slider, with `isUpdatingToWindy` flag to prevent feedback loops
- **Weather fetching**: Via Windy's `getPointForecastData` API
- **Cloud base**: Sourced from current weather model's point forecast, with ECMWF fallback
- **Route weather samples**: Intermediate points between waypoints for denser weather coverage
- **CSS variables**: Defined on `.plugin__content` in `plugin.svelte` (`--color-primary`, `--color-error`, `--color-warning`, `--color-success`, `--color-purple`, `--color-condition-good/marginal/poor/unknown`)
- **SegmentCondition type**: Lives in `src/types/weather.ts`, re-exported from `profileService.ts` for backward compat

## LLM Integration

- **Providers**: Anthropic, OpenAI, OpenRouter, Custom (OpenAI-compatible)
- **Custom provider**: For local LLMs (Ollama, LM Studio, etc.) — API key optional
- **System prompt**: Dynamically includes current VFR condition thresholds
- **Config type**: `LLMConfig` in `src/types/llm.ts`

### User's Local LLM Setup

- Ollama on Tailscale: `https://<your-tailscale-host>/v1/chat/completions`
- Model: `qwen2.5-coder:32b-instruct-q4_K_M`
- Caddy reverse proxy with HTTPS (Tailscale certs) on same machine
- Caddy strips Ollama's CORS headers to avoid duplicates
- `OLLAMA_ORIGINS=*` set in systemd override
- `header_up Host 127.0.0.1:11434` in Caddy to bypass Ollama's origin check
- HTTPS required because Windy.com serves over HTTPS (mixed content blocked otherwise)

## E2E Testing (Playwright)

### Setup

- **Config**: `playwright.config.ts` — headed Chrome, 3 projects (chromium, mobile, tablet)
- **Auth**: `e2e/auth.setup.ts` — saves Windy login session to `e2e/.auth/windy-session.json`
- **SSL workaround**: `interceptPluginRequests()` in `e2e/helpers/plugin-helpers.ts` uses `page.route()` to serve `dist/` files directly, bypassing self-signed cert issue with dev server

### Running Tests

```bash
# Full suite (chromium only, skip auth dependency)
npx playwright test e2e/ --project=chromium --no-deps

# Single test file
npx playwright test e2e/05-weather-fetch.spec.ts --project=chromium --no-deps
```

- ~17 minutes for full suite (79 tests across 12 spec files)
- Dev URL: `https://localhost:9995/plugin.js` entered in Windy Developer Mode

### Test Suite Structure

| File | Tests | Coverage |
|------|-------|----------|
| `plugin-basic.spec.ts` | 8 | Plugin load, Windy platform, tabs |
| `02-fpl-import.spec.ts` | 7 | FPL import, validation, clear |
| `03-waypoint-table.spec.ts` | 7 | Select, delete, move, reverse, edit altitude |
| `04-map-route-display.spec.ts` | 5 | Polyline, markers, map center, clear |
| `05-weather-fetch.spec.ts` | 8 | Weather button, loading, data display |
| `06-weather-alerts.spec.ts` | 4 | Condition coloring, alerts, samples |
| `07-departure-time.spec.ts` | 5 | Slider, time display, sync, ETA |
| `08-vfr-windows.spec.ts` | 6 | VFR search, results, use button |
| `09-altitude-profile.spec.ts` | 5 | SVG graph, waypoints, terrain, TOC/TOD |
| `10-settings.spec.ts` | 7 | Accordion groups, toggles, modals |
| `11-export.spec.ts` | 6 | Export menu, GPX/FPL download |
| `12-edge-cases.spec.ts` | 5 | Empty FPL, single waypoint, malformed XML |

### Test Helpers

- **`e2e/helpers/plugin-helpers.ts`**: `loadWindyWithPlugin()`, `importFPLFixture()`, `interceptPluginRequests()`, `getWaypointNames()`, `clickReadWx()`, `waitForWeatherData()`
- **`e2e/helpers/map-helpers.ts`**: `getRoutePolyline()`, `getWaypointMarkers()`, `getMapCenter()`
- **`e2e/fixtures/CYVBCYQB.fpl`**: 5 waypoints (CYVB→CYCL→WP5→CYRI→CYQB)
- **`e2e/fixtures/single-waypoint.fpl`**: Single waypoint for edge case testing

### Test Gotchas

- Tabs (`.tabs`/`.tab`) only visible when `flightPlan` is truthy (after import or New Plan)
- `.wp-name` contains icon `<span>` + text; `getWaypointNames()` strips icons via regex
- `test.describe.serial()` shares browser contexts for read-only tests to avoid re-importing
- Weather-dependent tests fetch once then run assertions sequentially

## Recent Refactoring (commit c06503f)

All from deep code quality analysis:

1. **Split weatherService.ts** → `weatherInterpolation.ts` (231 lines) + `weatherAlerts.ts` (130 lines), reducing main file from 1243 to ~933 lines
2. **routeController deduplication** → `updatePreviousArrivalAltitude()` + `addWaypointToFlightPlan()` helpers (-60 lines)
3. **verticalWindService types** → Replaced `as any` with `MeteogramDataPayload`, `HttpPayload` from Windy types
4. **AirportDB API** → Skipped (their API requires `apiToken` as query param, can't use header)
5. **Circular dependency fix** → `SegmentCondition` moved from `profileService.ts` to `types/weather.ts`
6. **Wind barb extraction** → `src/utils/windBarb.ts` with `generateWindBarb()` + `generateSmallWindBarb()`
7. **RAF throttle** → `requestAnimationFrame` on AltitudeProfile mousemove handler
8. **CSS custom properties** → Theme colors defined on `.plugin__content`, used throughout `plugin.svelte`
9. **LRU cache** → `forecastCache.ts` uses Map insertion order for O(1) eviction
10. **ARIA accessibility** → `role="tablist"`, `role="tab"`, `aria-selected` on tabs; `role="img"` + `aria-label` on SVG

## Debugging Notes

- Logger singleton at `src/services/logger.ts` defaults to **disabled**
- `enableLogging` setting in session storage can override defaults
- For guaranteed debug output, use raw `console.log()` or set `logger.enabled = true` in logger.ts
- Weather service has `enableLogging` as function parameter AND logger gating

## Known Issues / Fixes Applied

- **VFR window selection race condition**: `isUpdatingToWindy` flag must stay true until weather fetch completes
- **VFR window UI not updating**: Must reassign `weatherData`/`weatherAlerts` for Svelte reactivity trigger
- **Cloud base discrepancy**: Was always fetching ECMWF regardless of active model (fixed: current model first, ECMWF fallback)
- **Mixed content blocking**: HTTPS required for browser `fetch()` from windy.com to local LLM endpoints

## Untracked Files (not committed)

These files exist in the working directory but are not in git:
- `.playwright-mcp/` — Playwright MCP temp files
- `*.png` — Debug screenshots (cloudbase, VFR windows, popups)
- `current-state.md`, `settings-panel.md` — Temporary working notes
