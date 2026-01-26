# Airport Fallback Data Design

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Provide embedded airport data from OurAirports as fallback for users without an AirportDB.io API key.

**Architecture:** Three-layer system with generation script, fallback service, and provider abstraction that transparently selects the data source based on API key availability.

**Tech Stack:** Node.js (generation script), TypeScript (services), OurAirports CSV data

---

## Data Source

- **OurAirports**: https://ourairports.com/data/
- Files used: `airports.csv`, `runways.csv`
- Files excluded: `frequencies.csv`, `navaids.csv`

## Geographic Coverage

**Canada:** All provinces and territories (CA-*)

**United States:** Northeastern states only:
- ME, NH, VT, NY, MA, CT, RI, PA, NJ, MI, OH, MN, WI

## Airport Type Filters

**Include:**
- `large_airport`
- `medium_airport`
- `small_airport`
- `seaplane_base`

**Exclude:**
- `closed`
- `heliport`
- `balloonport`

## Data Structure

```json
{
  "meta": {
    "generated": "2026-01-25T00:00:00Z",
    "source": "OurAirports",
    "count": 2500
  },
  "airports": {
    "CYUL": {
      "n": "Montreal Pierre Elliott Trudeau Intl",
      "la": 45.4706,
      "lo": -73.7408,
      "el": 118,
      "t": "large_airport",
      "m": "Montreal",
      "r": "CA-QC",
      "rw": [
        {"i": "06L/24R", "l": 11000, "w": 200, "s": "ASP", "hd": [58, 238]}
      ]
    }
  }
}
```

**Property abbreviations:**
- `n` = name
- `la` = latitude
- `lo` = longitude
- `el` = elevation (feet)
- `t` = type
- `m` = municipality
- `r` = region
- `rw` = runways
- `i` = ident (e.g., "06L/24R")
- `l` = length (feet)
- `w` = width (feet)
- `s` = surface
- `hd` = headings [lowEnd, highEnd]

## Components

### 1. Generation Script (`scripts/generate-airports-fallback.js`)

- Downloads airports.csv and runways.csv from OurAirports
- Caches CSVs locally (re-download if >24 hours old)
- Applies geographic and type filters
- Joins runway data to airports
- Outputs minified JSON
- Validates file size (<500KB)
- Run via: `npm run generate:airports`

### 2. Fallback Service (`src/services/airportFallbackService.ts`)

- Imports JSON data at build time
- Provides `searchByIcao(icao: string)` function
- Returns data in normalized format matching AirportDB response

### 3. Airport Provider (`src/services/airportProvider.ts`)

```typescript
export interface AirportSearchResult {
  icao: string;
  name: string;
  lat: number;
  lon: number;
  elevation: number;
  type: string;
  municipality?: string;
  region: string;
  runways: RunwayInfo[];
  source: 'airportdb' | 'fallback';
}

export interface AirportProvider {
  searchByIcao(icao: string): Promise<AirportSearchResult | null>;
  isUsingFallback(): boolean;
}
```

### 4. Provider Factory

```typescript
export function createAirportProvider(apiKey?: string): AirportProvider {
  if (apiKey && apiKey.trim().length > 0) {
    return new AirportDbProvider(apiKey);
  }
  return new FallbackProvider();
}
```

## Error Handling

| Scenario | Behavior |
|----------|----------|
| API key set, AirportDB works | Use API response |
| API key set, API fails | Return error (don't fall back) |
| No API key, ICAO in fallback | Return fallback data |
| No API key, ICAO not found | Return null |

## Build Integration

- JSON file added to `.gitignore`
- Generated as part of build: `npm run generate:airports && rollup -c`
- CSVs cached locally for 24 hours

## UI Feedback

- Show indicator when using fallback: "📍 Offline airport data"
- If ICAO not found: "Airport not in offline database. Add API key for global coverage."

## File Structure

```
scripts/
  generate-airports-fallback.js
src/
  data/
    airports-fallback.json (generated, gitignored)
  services/
    airportProvider.ts
    airportFallbackService.ts
```

## Constraints

- Maximum JSON file size: 500KB
- No frequencies (not needed for VFR planning)
- No navaids (users can add as custom waypoints)
