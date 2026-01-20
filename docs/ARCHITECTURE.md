# VFR Planner Plugin Architecture

## Overview

The VFR Planner is a Windy.com plugin built with TypeScript and Svelte. It provides VFR flight planning capabilities with weather integration.

**Version**: 0.9.0
**Platform**: Windy.com Plugin Framework

## Dependency Graph

```
┌─────────────────────────────────────────────────────────────┐
│                    PLUGIN.SVELTE (Entry)                    │
│                 Windy Plugin Framework Bridge                │
└────────────┬────────────────────────────────────────────────┘
             │
     ┌───────┴────────┬────────────────┬─────────────────┐
     │                │                │                 │
     v                v                v                 v
┌─────────┐    ┌──────────┐    ┌────────────┐    ┌─────────────┐
│ Parsers │    │ Exporters│    │ Components │    │   Services  │
├─────────┤    ├──────────┤    ├────────────┤    ├─────────────┤
│fplParser│    │fplExport │    │AltProfile  │    │ weather     │
│         │    │gpxExport │    │Settings    │    │ navigation  │
└────┬────┘    └────┬─────┘    └──────┬─────┘    │ elevation   │
     │              │                 │          │ profile     │
     │              │                 │          │ vfrWindow   │
     │              │                 │          └────┬────────┘
     │              │                 │               │
     └──────┬───────┴─────────────────┴───────────────┘
            │
     ┌──────v──────────────────────────────────┐
     │           TYPES (Data Contracts)        │
     ├──────────────────────────────────────────┤
     │ FlightPlan │ Waypoint │ Settings │ FPL  │
     └──────┬───────────────────────────────────┘
            │
     ┌──────v──────────────────────────────────┐
     │         UTILITIES (Shared Helpers)      │
     ├──────────────────────────────────────────┤
     │ units │ constants │ interpolation │ perf│
     └──────┬───────────────────────────────────┘
            │
     ┌──────v──────────────────────────────────┐
     │         ADAPTERS (External APIs)        │
     ├──────────────────────────────────────────┤
     │ HttpApiAdapter (base class)             │
     │   ├─ AirportDbAdapter                   │
     │   ├─ OpenAipAdapter                     │
     │   └─ ElevationAdapter                   │
     └──────┬───────────────────────────────────┘
            │
     ┌──────v──────────────────────────────────┐
     │         EXTERNAL DEPENDENCIES           │
     ├──────────────────────────────────────────┤
     │ @windy/* │ @turf/turf │ fast-xml-parser │
     └──────────────────────────────────────────┘
```

## Directory Structure

```
src/
├── adapters/          # API adapter pattern implementations
│   ├── types.ts       # Shared adapter interfaces
│   ├── HttpApiAdapter.ts
│   ├── AirportDbAdapter.ts
│   ├── OpenAipAdapter.ts
│   └── ElevationAdapter.ts
├── components/        # Svelte UI components
│   ├── AltitudeProfile.svelte
│   └── SettingsPanel.svelte
├── exporters/         # Flight plan export formats
│   ├── fplExporter.ts
│   └── gpxExporter.ts
├── parsers/           # Flight plan import parsers
│   └── fplParser.ts
├── services/          # Core business logic
│   ├── navigationCalc.ts
│   ├── elevationService.ts
│   ├── weatherService.ts
│   ├── weatherHelpers.ts
│   ├── profileService.ts
│   ├── vfrWindowService.ts
│   ├── vfrConditionRules.ts
│   ├── airportdbService.ts
│   └── openaipService.ts
├── types/             # TypeScript interfaces
│   ├── flightPlan.ts
│   ├── fpl.ts
│   ├── settings.ts
│   └── vfrWindow.ts
├── utils/             # Shared utilities
│   ├── units.ts
│   ├── constants.ts
│   ├── interpolation.ts
│   └── performance.ts
├── plugin.svelte      # Main entry point
└── pluginConfig.ts    # Plugin configuration
```

## Layer Architecture

### 1. UI Layer (Components)

| Component | Dependencies | Purpose |
|-----------|--------------|---------|
| plugin.svelte | All services, components | Main orchestrator |
| AltitudeProfile.svelte | weatherService, profileService | Route visualization |
| SettingsPanel.svelte | types only | User preferences |

### 2. Service Layer (Business Logic)

**Foundation Services** (No internal dependencies):
- `navigationCalc.ts` - Bearing, distance, ETE calculations
- `elevationService.ts` - Terrain elevation queries
- `weatherService.ts` - Weather data fetching from Windy

**Processing Services** (Compose foundation services):
- `weatherHelpers.ts` - Interpolation, unit conversion helpers
- `profileService.ts` - Integrated route analysis
- `vfrConditionRules.ts` - Table-based VFR evaluation

**Analysis Services** (Decision making):
- `vfrWindowService.ts` - VFR window detection and temporal analysis

### 3. Adapter Layer (External APIs)

Inheritance hierarchy for API integrations:

```
HttpApiAdapter (abstract base)
├── AirportDbAdapter (airportdb.io)
├── OpenAipAdapter (api.core.openaip.net)
└── ElevationAdapter (api.open-meteo.com)
```

Features:
- Unified error handling
- Request/response logging
- Retry with exponential backoff
- Timeout protection
- Authentication abstraction

### 4. Type Layer (Data Contracts)

Foundation interfaces with no dependencies:
- `FlightPlan`, `Waypoint` - Core data structures
- `PluginSettings` - User configuration
- `VFRWindow`, `SegmentCondition` - Analysis results

### 5. Utility Layer (Shared Helpers)

| Module | Purpose | Dependencies |
|--------|---------|--------------|
| units.ts | Unit conversions (m↔ft, kt↔m/s) | None |
| constants.ts | Magic numbers, thresholds | None |
| interpolation.ts | Data interpolation | weatherService types |
| performance.ts | Performance monitoring | None |

## Service Dependencies Matrix

| Service | Internal Deps | Key External |
|---------|---------------|--------------|
| navigationCalc | 0 | @turf/turf |
| elevationService | 0 | Open-Meteo API |
| weatherService | 0 | @windy/* APIs |
| profileService | 4 | - |
| vfrWindowService | 2 | - |
| airportdbService | 0 | AirportDB API |
| openaipService | 0 | OpenAIP API |

## Data Flow

```
INPUT:
  ForeFlight .fpl file
       ↓
  fplParser.ts
       ↓
  Waypoint[] (FlightPlan)

PROCESSING:
  FlightPlan + Settings
       │
       ├─→ navigationCalc (bearing, distance, ETE)
       ├─→ elevationService (terrain profile)
       ├─→ weatherService (wind, clouds, visibility)
       │
       └─→ profileService
             ├─→ calculateWindComponent
             ├─→ interpolateWind
             └─→ evaluateSegmentCondition
                    └─→ vfrConditionRules

ANALYSIS:
  vfrWindowService
       ├─→ Hourly weather fetching
       ├─→ VFR condition evaluation
       └─→ Window detection

OUTPUT:
  ├─→ fplExporter.ts → ForeFlight format
  ├─→ gpxExporter.ts → GPX format
  └─→ UI Components → Visual display
```

## External Dependencies

| Package | Version | Used By | Purpose |
|---------|---------|---------|---------|
| @turf/turf | ^6.5.0 | navigationCalc | Geospatial calculations |
| fast-xml-parser | ^4.3.0 | fplParser | FPL file parsing |
| @windycom/plugin-devtools | ^3.0.1 | plugin.svelte | Windy framework |

## Design Principles

### SOLID Compliance

- **Single Responsibility**: Each service has one clear purpose
- **Open/Closed**: Adapter pattern for API flexibility
- **Liskov Substitution**: HttpApiAdapter hierarchy
- **Interface Segregation**: Focused type exports
- **Dependency Inversion**: Services don't depend on UI

### Architectural Rules

1. **No circular dependencies** - Verified clean dependency graph
2. **Foundation layer immutability** - Types and utils have no internal deps
3. **API isolation** - Each external API wrapped in dedicated adapter
4. **Testability** - Services are pure functions where possible

### Extension Points

When adding new features:

| Feature Type | Location | Pattern |
|--------------|----------|---------|
| New API source | adapters/ | Extend HttpApiAdapter |
| New calculation | services/ | Add to foundation tier |
| New export format | exporters/ | Create new exporter |
| New UI feature | components/ | Create Svelte component |

## Testing Architecture

```
tests/
├── units.test.ts           # Unit conversion tests
├── navigationCalc.test.ts  # Navigation calculations
├── weatherHelpers.test.ts  # Weather helper functions
├── vfrConditionRules.test.ts # VFR evaluation rules
├── adapters.test.ts        # API adapter tests
└── __mocks__/              # Jest mocks
    ├── windy/              # Windy API mocks
    └── @turf/              # Turf library mock

e2e/
└── plugin-basic.spec.ts    # Playwright E2E tests
```

## Performance Monitoring

Use the `performance.ts` utility for instrumentation:

```typescript
import { perfMonitor, PERF_CATEGORIES } from './utils/performance';

// Measure async operations
const result = await perfMonitor().measure(
  'fetchWeather',
  () => weatherService.fetch(waypoints),
  PERF_CATEGORIES.WEATHER_FETCH
);

// Generate report
console.log(perfMonitor().generateReport());
```

Categories: `api-calls`, `weather-fetch`, `route-calculation`, `elevation-fetch`, `vfr-evaluation`, `rendering`, `file-export`
