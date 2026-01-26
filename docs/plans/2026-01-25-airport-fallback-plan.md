# Airport Fallback Data Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Provide embedded airport data from OurAirports as fallback for users without an AirportDB.io API key.

**Architecture:** Three-layer system: (1) Node.js script downloads and filters OurAirports CSV data into minified JSON, (2) TypeScript fallback service loads and queries the JSON, (3) Provider abstraction selects data source based on API key availability.

**Tech Stack:** Node.js (generation script), TypeScript, CSV parsing, Rollup bundling

---

## Task 1: Create Generation Script

**Files:**
- Create: `scripts/generate-airports-fallback.js`
- Create: `scripts/.cache/` (directory for cached CSVs)

**Step 1: Create the generation script with CSV download and caching**

```javascript
#!/usr/bin/env node

/**
 * Generate airports-fallback.json from OurAirports data
 *
 * Downloads airports.csv and runways.csv, filters by region and type,
 * and outputs minified JSON for embedding in the plugin.
 *
 * Usage: node scripts/generate-airports-fallback.js [--force]
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

// Configuration
const OURAIRPORTS_BASE = 'https://davidmegginson.github.io/ourairports-data';
const CACHE_DIR = path.join(__dirname, '.cache');
const OUTPUT_FILE = path.join(__dirname, '..', 'src', 'data', 'airports-fallback.json');
const CACHE_MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours
const MAX_FILE_SIZE_KB = 500;

// Geographic filters
const CANADA_REGION_PREFIX = 'CA-';
const US_STATES = ['US-ME', 'US-NH', 'US-VT', 'US-NY', 'US-MA', 'US-CT', 'US-RI', 'US-PA', 'US-NJ', 'US-MI', 'US-OH', 'US-MN', 'US-WI'];

// Airport type filters
const INCLUDED_TYPES = ['large_airport', 'medium_airport', 'small_airport', 'seaplane_base'];

/**
 * Download a file with caching
 */
async function downloadWithCache(url, cacheFile, forceRefresh = false) {
    // Ensure cache directory exists
    if (!fs.existsSync(CACHE_DIR)) {
        fs.mkdirSync(CACHE_DIR, { recursive: true });
    }

    const cachePath = path.join(CACHE_DIR, cacheFile);

    // Check if cache is valid
    if (!forceRefresh && fs.existsSync(cachePath)) {
        const stats = fs.statSync(cachePath);
        const age = Date.now() - stats.mtimeMs;
        if (age < CACHE_MAX_AGE_MS) {
            console.log(`Using cached ${cacheFile} (${Math.round(age / 1000 / 60)} min old)`);
            return fs.readFileSync(cachePath, 'utf-8');
        }
    }

    console.log(`Downloading ${url}...`);
    return new Promise((resolve, reject) => {
        https.get(url, (response) => {
            if (response.statusCode !== 200) {
                reject(new Error(`HTTP ${response.statusCode}: ${url}`));
                return;
            }

            let data = '';
            response.on('data', chunk => data += chunk);
            response.on('end', () => {
                fs.writeFileSync(cachePath, data);
                console.log(`Cached ${cacheFile} (${(data.length / 1024).toFixed(1)} KB)`);
                resolve(data);
            });
            response.on('error', reject);
        }).on('error', reject);
    });
}

/**
 * Parse CSV data into array of objects
 */
function parseCSV(csvData) {
    const lines = csvData.split('\n');
    if (lines.length === 0) return [];

    // Parse header
    const header = parseCSVLine(lines[0]);
    const rows = [];

    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        const values = parseCSVLine(line);
        const row = {};
        header.forEach((col, idx) => {
            row[col] = values[idx] || '';
        });
        rows.push(row);
    }

    return rows;
}

/**
 * Parse a single CSV line handling quoted fields
 */
function parseCSVLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
        const char = line[i];

        if (char === '"') {
            if (inQuotes && line[i + 1] === '"') {
                current += '"';
                i++;
            } else {
                inQuotes = !inQuotes;
            }
        } else if (char === ',' && !inQuotes) {
            result.push(current);
            current = '';
        } else {
            current += char;
        }
    }
    result.push(current);

    return result;
}

/**
 * Check if airport is in covered region
 */
function isInCoveredRegion(region) {
    if (!region) return false;
    if (region.startsWith(CANADA_REGION_PREFIX)) return true;
    return US_STATES.includes(region);
}

/**
 * Check if airport type should be included
 */
function isIncludedType(type) {
    return INCLUDED_TYPES.includes(type);
}

/**
 * Main generation function
 */
async function generate(forceRefresh = false) {
    console.log('=== Generating airports-fallback.json ===\n');

    // Download data
    const airportsCsv = await downloadWithCache(
        `${OURAIRPORTS_BASE}/airports.csv`,
        'airports.csv',
        forceRefresh
    );
    const runwaysCsv = await downloadWithCache(
        `${OURAIRPORTS_BASE}/runways.csv`,
        'runways.csv',
        forceRefresh
    );

    // Parse CSVs
    console.log('\nParsing CSV data...');
    const allAirports = parseCSV(airportsCsv);
    const allRunways = parseCSV(runwaysCsv);
    console.log(`  Total airports: ${allAirports.length}`);
    console.log(`  Total runways: ${allRunways.length}`);

    // Filter airports
    const filteredAirports = allAirports.filter(apt =>
        isInCoveredRegion(apt.iso_region) &&
        isIncludedType(apt.type) &&
        apt.ident // Must have ICAO code
    );
    console.log(`  Filtered airports: ${filteredAirports.length}`);

    // Index runways by airport ident
    const runwaysByAirport = {};
    for (const rwy of allRunways) {
        const ident = rwy.airport_ident;
        if (!ident) continue;
        if (!runwaysByAirport[ident]) {
            runwaysByAirport[ident] = [];
        }
        runwaysByAirport[ident].push(rwy);
    }

    // Build output structure
    const airports = {};
    for (const apt of filteredAirports) {
        const icao = apt.ident.toUpperCase();

        // Get runways for this airport
        const aptRunways = (runwaysByAirport[icao] || [])
            .filter(rwy => rwy.closed !== '1' && rwy.closed !== 'true')
            .map(rwy => ({
                i: `${rwy.le_ident}/${rwy.he_ident}`,
                l: parseInt(rwy.length_ft) || 0,
                w: parseInt(rwy.width_ft) || 0,
                s: rwy.surface || 'UNKNOWN',
                hd: [
                    parseFloat(rwy.le_heading_degT) || 0,
                    parseFloat(rwy.he_heading_degT) || 0
                ]
            }))
            .filter(rwy => rwy.l > 0); // Only runways with valid length

        airports[icao] = {
            n: apt.name,
            la: parseFloat(apt.latitude_deg),
            lo: parseFloat(apt.longitude_deg),
            el: parseInt(apt.elevation_ft) || 0,
            t: apt.type,
            m: apt.municipality || '',
            r: apt.iso_region,
            ...(aptRunways.length > 0 && { rw: aptRunways })
        };
    }

    // Build final output
    const output = {
        meta: {
            generated: new Date().toISOString(),
            source: 'OurAirports',
            sourceUrl: 'https://ourairports.com/data/',
            count: Object.keys(airports).length,
            regions: {
                canada: 'All provinces/territories',
                us: US_STATES.map(s => s.replace('US-', '')).join(', ')
            }
        },
        airports
    };

    // Ensure output directory exists
    const outputDir = path.dirname(OUTPUT_FILE);
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    // Write minified JSON
    const jsonStr = JSON.stringify(output);
    const sizeKB = jsonStr.length / 1024;

    if (sizeKB > MAX_FILE_SIZE_KB) {
        console.error(`\nERROR: Output file size (${sizeKB.toFixed(1)} KB) exceeds limit (${MAX_FILE_SIZE_KB} KB)`);
        process.exit(1);
    }

    fs.writeFileSync(OUTPUT_FILE, jsonStr);

    console.log(`\n=== Generation Complete ===`);
    console.log(`  Airports: ${output.meta.count}`);
    console.log(`  File size: ${sizeKB.toFixed(1)} KB`);
    console.log(`  Output: ${OUTPUT_FILE}`);
}

// Run with --force flag check
const forceRefresh = process.argv.includes('--force');
generate(forceRefresh).catch(err => {
    console.error('Generation failed:', err);
    process.exit(1);
});
```

**Step 2: Create the data directory and add to .gitignore**

Run:
```bash
mkdir -p src/data
echo "src/data/airports-fallback.json" >> .gitignore
echo "scripts/.cache/" >> .gitignore
```

**Step 3: Add npm scripts to package.json**

Modify `package.json` to add:
```json
"generate:airports": "node scripts/generate-airports-fallback.js",
"generate:airports:force": "node scripts/generate-airports-fallback.js --force"
```

**Step 4: Run the generation script**

Run: `npm run generate:airports`

Expected: Script downloads CSVs, filters data, outputs JSON file with size report.

**Step 5: Verify the generated file**

Run: `ls -la src/data/airports-fallback.json && head -c 500 src/data/airports-fallback.json`

Expected: File exists, ~300-400KB, JSON starts with `{"meta":{...`

**Step 6: Commit**

```bash
git add scripts/generate-airports-fallback.js package.json .gitignore
git commit -m "feat: add OurAirports data generation script"
```

---

## Task 2: Create Fallback Service

**Files:**
- Create: `src/services/airportFallbackService.ts`
- Create: `tests/airportFallbackService.test.ts`

**Step 1: Create the fallback service**

```typescript
/**
 * Airport Fallback Service
 *
 * Provides airport lookup from embedded OurAirports data
 * Used when no AirportDB.io API key is configured
 */

import type { RunwayInfo } from '../types/flightPlan';

// Import generated JSON data
// This will be bundled at build time
import fallbackData from '../data/airports-fallback.json';

/**
 * Compact airport format from generated JSON
 */
interface CompactAirport {
    n: string;      // name
    la: number;     // latitude
    lo: number;     // longitude
    el: number;     // elevation (feet)
    t: string;      // type
    m: string;      // municipality
    r: string;      // region
    rw?: CompactRunway[];  // runways
}

/**
 * Compact runway format from generated JSON
 */
interface CompactRunway {
    i: string;      // ident (e.g., "06L/24R")
    l: number;      // length (feet)
    w: number;      // width (feet)
    s: string;      // surface
    hd: [number, number];  // headings [lowEnd, highEnd]
}

/**
 * Normalized airport result
 */
export interface FallbackAirport {
    icao: string;
    name: string;
    lat: number;
    lon: number;
    elevation: number;
    type: string;
    municipality: string;
    region: string;
    runways: RunwayInfo[];
}

/**
 * Fallback data metadata
 */
export interface FallbackMeta {
    generated: string;
    source: string;
    count: number;
    regions: {
        canada: string;
        us: string;
    };
}

// Type the imported data
const data = fallbackData as {
    meta: FallbackMeta;
    airports: Record<string, CompactAirport>;
};

/**
 * Get fallback data metadata
 */
export function getFallbackMeta(): FallbackMeta {
    return data.meta;
}

/**
 * Check if an ICAO code exists in fallback data
 */
export function hasAirport(icao: string): boolean {
    const normalized = icao.toUpperCase().trim();
    return normalized in data.airports;
}

/**
 * Get airport by ICAO code from fallback data
 */
export function getAirportByIcao(icao: string): FallbackAirport | null {
    const normalized = icao.toUpperCase().trim();
    const apt = data.airports[normalized];

    if (!apt) {
        return null;
    }

    return expandAirport(normalized, apt);
}

/**
 * Search airports by partial ICAO code
 * Returns up to maxResults matches
 */
export function searchAirports(query: string, maxResults: number = 10): FallbackAirport[] {
    const normalized = query.toUpperCase().trim();
    if (!normalized) return [];

    const results: FallbackAirport[] = [];

    for (const [icao, apt] of Object.entries(data.airports)) {
        if (icao.startsWith(normalized)) {
            results.push(expandAirport(icao, apt));
            if (results.length >= maxResults) break;
        }
    }

    return results;
}

/**
 * Expand compact airport format to full format
 */
function expandAirport(icao: string, apt: CompactAirport): FallbackAirport {
    return {
        icao,
        name: apt.n,
        lat: apt.la,
        lon: apt.lo,
        elevation: apt.el,
        type: apt.t,
        municipality: apt.m,
        region: apt.r,
        runways: (apt.rw || []).map(expandRunway),
    };
}

/**
 * Expand compact runway format to RunwayInfo format
 */
function expandRunway(rwy: CompactRunway): RunwayInfo {
    const [leIdent, heIdent] = rwy.i.split('/');

    return {
        id: rwy.i,
        lengthFt: rwy.l,
        widthFt: rwy.w,
        surface: rwy.s,
        lighted: false,  // Not available in OurAirports basic data
        closed: false,
        lowEnd: {
            ident: leIdent,
            headingTrue: rwy.hd[0],
        },
        highEnd: {
            ident: heIdent,
            headingTrue: rwy.hd[1],
        },
    };
}

/**
 * Get total number of airports in fallback data
 */
export function getAirportCount(): number {
    return data.meta.count;
}

/**
 * Check if fallback data is loaded and valid
 */
export function isAvailable(): boolean {
    return data && data.airports && Object.keys(data.airports).length > 0;
}
```

**Step 2: Create test file**

```typescript
/**
 * Tests for Airport Fallback Service
 */

import {
    getAirportByIcao,
    hasAirport,
    searchAirports,
    getFallbackMeta,
    getAirportCount,
    isAvailable,
} from '../src/services/airportFallbackService';

describe('airportFallbackService', () => {
    describe('isAvailable', () => {
        it('returns true when data is loaded', () => {
            expect(isAvailable()).toBe(true);
        });
    });

    describe('getFallbackMeta', () => {
        it('returns metadata with expected fields', () => {
            const meta = getFallbackMeta();
            expect(meta.source).toBe('OurAirports');
            expect(meta.count).toBeGreaterThan(0);
            expect(meta.regions.canada).toBeDefined();
            expect(meta.regions.us).toBeDefined();
        });
    });

    describe('getAirportCount', () => {
        it('returns a positive number', () => {
            expect(getAirportCount()).toBeGreaterThan(100);
        });
    });

    describe('hasAirport', () => {
        it('returns true for known Canadian airport', () => {
            expect(hasAirport('CYUL')).toBe(true);
        });

        it('returns true for known US airport in coverage', () => {
            expect(hasAirport('KJFK')).toBe(true);
        });

        it('returns false for airport outside coverage', () => {
            // LAX is in California, not in NE US
            expect(hasAirport('KLAX')).toBe(false);
        });

        it('handles lowercase input', () => {
            expect(hasAirport('cyul')).toBe(true);
        });

        it('handles whitespace', () => {
            expect(hasAirport('  CYUL  ')).toBe(true);
        });
    });

    describe('getAirportByIcao', () => {
        it('returns airport data for valid ICAO', () => {
            const apt = getAirportByIcao('CYUL');
            expect(apt).not.toBeNull();
            expect(apt!.icao).toBe('CYUL');
            expect(apt!.name).toContain('Montreal');
            expect(apt!.lat).toBeCloseTo(45.47, 1);
            expect(apt!.lon).toBeCloseTo(-73.74, 1);
            expect(apt!.elevation).toBeGreaterThan(0);
            expect(apt!.type).toBe('large_airport');
            expect(apt!.region).toBe('CA-QC');
        });

        it('returns runways for major airports', () => {
            const apt = getAirportByIcao('CYUL');
            expect(apt).not.toBeNull();
            expect(apt!.runways.length).toBeGreaterThan(0);

            const rwy = apt!.runways[0];
            expect(rwy.lowEnd.ident).toBeDefined();
            expect(rwy.highEnd.ident).toBeDefined();
            expect(rwy.lengthFt).toBeGreaterThan(0);
            expect(rwy.lowEnd.headingTrue).toBeGreaterThanOrEqual(0);
            expect(rwy.lowEnd.headingTrue).toBeLessThan(360);
        });

        it('returns null for unknown ICAO', () => {
            expect(getAirportByIcao('ZZZZ')).toBeNull();
        });

        it('returns null for out-of-coverage airport', () => {
            expect(getAirportByIcao('KLAX')).toBeNull();
        });
    });

    describe('searchAirports', () => {
        it('returns airports matching prefix', () => {
            const results = searchAirports('CY');
            expect(results.length).toBeGreaterThan(0);
            expect(results.every(apt => apt.icao.startsWith('CY'))).toBe(true);
        });

        it('limits results to maxResults', () => {
            const results = searchAirports('C', 5);
            expect(results.length).toBeLessThanOrEqual(5);
        });

        it('returns empty array for no matches', () => {
            const results = searchAirports('ZZZ');
            expect(results).toEqual([]);
        });

        it('handles empty query', () => {
            const results = searchAirports('');
            expect(results).toEqual([]);
        });
    });
});
```

**Step 3: Configure TypeScript for JSON imports**

Add to `tsconfig.json` (if not already present):
```json
{
  "compilerOptions": {
    "resolveJsonModule": true,
    "esModuleInterop": true
  }
}
```

**Step 4: Run tests**

Run: `npm test -- tests/airportFallbackService.test.ts`

Expected: All tests pass

**Step 5: Commit**

```bash
git add src/services/airportFallbackService.ts tests/airportFallbackService.test.ts
git commit -m "feat: add airport fallback service with OurAirports data"
```

---

## Task 3: Create Airport Provider Abstraction

**Files:**
- Create: `src/services/airportProvider.ts`
- Create: `tests/airportProvider.test.ts`

**Step 1: Create the provider interface and implementations**

```typescript
/**
 * Airport Provider
 *
 * Abstraction layer that selects between AirportDB.io API and fallback data
 * based on API key availability.
 */

import type { RunwayInfo } from '../types/flightPlan';
import type { AirportDBResult } from './airportdbService';
import { getAirportByICAO } from './airportdbService';
import {
    getAirportByIcao as getFallbackAirport,
    getFallbackMeta,
    isAvailable as isFallbackAvailable,
} from './airportFallbackService';

/**
 * Unified airport search result
 */
export interface AirportSearchResult {
    icao: string;
    iata?: string;
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

/**
 * Airport provider interface
 */
export interface IAirportProvider {
    /**
     * Search for airport by ICAO code
     */
    searchByIcao(icao: string): Promise<AirportSearchResult | null>;

    /**
     * Check if using fallback data
     */
    isUsingFallback(): boolean;

    /**
     * Get provider name for display
     */
    getSourceName(): string;

    /**
     * Get coverage description (for fallback)
     */
    getCoverageDescription(): string | null;
}

/**
 * AirportDB.io provider implementation
 */
class AirportDbProvider implements IAirportProvider {
    constructor(private apiKey: string) {}

    async searchByIcao(icao: string): Promise<AirportSearchResult | null> {
        try {
            const result = await getAirportByICAO(icao, this.apiKey);
            if (!result) return null;

            return this.normalizeResult(result);
        } catch (error) {
            // Re-throw API errors - don't silently fall back
            throw error;
        }
    }

    isUsingFallback(): boolean {
        return false;
    }

    getSourceName(): string {
        return 'AirportDB.io';
    }

    getCoverageDescription(): string | null {
        return null; // Global coverage
    }

    private normalizeResult(apt: AirportDBResult): AirportSearchResult {
        const runways: RunwayInfo[] = (apt.runways || [])
            .filter(rwy => !rwy.closed)
            .map(rwy => ({
                id: rwy.id,
                lengthFt: rwy.length_ft,
                widthFt: rwy.width_ft,
                surface: rwy.surface,
                lighted: rwy.lighted,
                closed: rwy.closed,
                lowEnd: {
                    ident: rwy.le_ident,
                    headingTrue: rwy.le_heading_degT,
                },
                highEnd: {
                    ident: rwy.he_ident,
                    headingTrue: rwy.he_heading_degT,
                },
            }));

        return {
            icao: apt.icao_code || apt.gps_code || apt.local_code,
            iata: apt.iata_code || undefined,
            name: apt.name,
            lat: apt.latitude_deg,
            lon: apt.longitude_deg,
            elevation: apt.elevation_ft,
            type: apt.type,
            municipality: apt.municipality || undefined,
            region: apt.iso_region,
            runways,
            source: 'airportdb',
        };
    }
}

/**
 * Fallback provider implementation (embedded OurAirports data)
 */
class FallbackProvider implements IAirportProvider {
    async searchByIcao(icao: string): Promise<AirportSearchResult | null> {
        const apt = getFallbackAirport(icao);
        if (!apt) return null;

        return {
            ...apt,
            source: 'fallback',
        };
    }

    isUsingFallback(): boolean {
        return true;
    }

    getSourceName(): string {
        return 'Offline Data (OurAirports)';
    }

    getCoverageDescription(): string {
        const meta = getFallbackMeta();
        return `Canada + NE US (${meta.regions.us})`;
    }
}

/**
 * Create an airport provider based on configuration
 *
 * @param apiKey - AirportDB.io API key (optional)
 * @returns Airport provider instance
 */
export function createAirportProvider(apiKey?: string): IAirportProvider {
    if (apiKey && apiKey.trim().length > 0) {
        return new AirportDbProvider(apiKey);
    }

    if (!isFallbackAvailable()) {
        console.warn('[Airport Provider] Fallback data not available');
    }

    return new FallbackProvider();
}

/**
 * Check if fallback data is available
 */
export function isFallbackDataAvailable(): boolean {
    return isFallbackAvailable();
}
```

**Step 2: Create test file**

```typescript
/**
 * Tests for Airport Provider
 */

import {
    createAirportProvider,
    isFallbackDataAvailable,
    type IAirportProvider,
    type AirportSearchResult,
} from '../src/services/airportProvider';

describe('airportProvider', () => {
    describe('createAirportProvider', () => {
        it('returns fallback provider when no API key', () => {
            const provider = createAirportProvider();
            expect(provider.isUsingFallback()).toBe(true);
            expect(provider.getSourceName()).toContain('Offline');
        });

        it('returns fallback provider for empty API key', () => {
            const provider = createAirportProvider('');
            expect(provider.isUsingFallback()).toBe(true);
        });

        it('returns fallback provider for whitespace API key', () => {
            const provider = createAirportProvider('   ');
            expect(provider.isUsingFallback()).toBe(true);
        });

        it('returns AirportDB provider when API key provided', () => {
            const provider = createAirportProvider('test-api-key');
            expect(provider.isUsingFallback()).toBe(false);
            expect(provider.getSourceName()).toContain('AirportDB');
        });
    });

    describe('isFallbackDataAvailable', () => {
        it('returns true when fallback data is loaded', () => {
            expect(isFallbackDataAvailable()).toBe(true);
        });
    });

    describe('FallbackProvider', () => {
        let provider: IAirportProvider;

        beforeAll(() => {
            provider = createAirportProvider(); // No API key = fallback
        });

        it('returns coverage description', () => {
            const coverage = provider.getCoverageDescription();
            expect(coverage).toContain('Canada');
            expect(coverage).toContain('US');
        });

        it('finds Canadian airport', async () => {
            const result = await provider.searchByIcao('CYUL');
            expect(result).not.toBeNull();
            expect(result!.icao).toBe('CYUL');
            expect(result!.source).toBe('fallback');
        });

        it('finds US airport in coverage area', async () => {
            const result = await provider.searchByIcao('KJFK');
            expect(result).not.toBeNull();
            expect(result!.icao).toBe('KJFK');
            expect(result!.source).toBe('fallback');
        });

        it('returns null for out-of-coverage airport', async () => {
            const result = await provider.searchByIcao('KLAX');
            expect(result).toBeNull();
        });

        it('includes runway data', async () => {
            const result = await provider.searchByIcao('CYUL');
            expect(result).not.toBeNull();
            expect(result!.runways.length).toBeGreaterThan(0);
            expect(result!.runways[0].lowEnd).toBeDefined();
            expect(result!.runways[0].highEnd).toBeDefined();
        });
    });
});
```

**Step 3: Run tests**

Run: `npm test -- tests/airportProvider.test.ts`

Expected: All tests pass

**Step 4: Commit**

```bash
git add src/services/airportProvider.ts tests/airportProvider.test.ts
git commit -m "feat: add airport provider abstraction layer"
```

---

## Task 4: Integrate Provider into Plugin

**Files:**
- Modify: `src/plugin.svelte`
- Modify: `src/services/airportdbService.ts` (minor adjustment)

**Step 1: Add provider to plugin state**

In `src/plugin.svelte`, add imports and state:

```typescript
// Add import
import {
    createAirportProvider,
    type IAirportProvider,
    type AirportSearchResult
} from './services/airportProvider';

// Add state variable (near other state declarations)
let airportProvider: IAirportProvider;
```

**Step 2: Initialize provider when settings change**

Find the settings initialization/change handler and add:

```typescript
// Create/update airport provider when API key changes
$: airportProvider = createAirportProvider(settings.airportdbApiKey);
```

**Step 3: Update airport search function**

Find the `handleAirportSearch` or similar function that searches for airports. Update it to use the provider:

```typescript
async function handleAirportSearch(query: string): Promise<void> {
    if (!query || query.length < 2) return;

    try {
        const result = await airportProvider.searchByIcao(query);
        if (result) {
            // Convert to waypoint and add to flight plan
            const waypoint = airportSearchResultToWaypoint(result);
            // ... existing logic to add waypoint
        } else if (airportProvider.isUsingFallback()) {
            // Show message for fallback users
            console.log(`Airport ${query} not in offline database`);
        }
    } catch (error) {
        console.error('Airport search error:', error);
    }
}
```

**Step 4: Add helper function to convert search result to waypoint**

```typescript
function airportSearchResultToWaypoint(apt: AirportSearchResult): Waypoint {
    return {
        id: `airport-${apt.icao}-${Date.now()}`,
        name: apt.icao,
        type: 'AIRPORT',
        lat: apt.lat,
        lon: apt.lon,
        elevation: apt.elevation,
        countryCode: apt.region.split('-')[0],
        comment: apt.name,
        altitude: apt.elevation,
        runways: apt.runways.length > 0 ? apt.runways : undefined,
    };
}
```

**Step 5: Add fallback indicator in UI**

In the settings panel or status area, add indicator:

```svelte
{#if airportProvider?.isUsingFallback()}
    <div class="fallback-indicator" title={airportProvider.getCoverageDescription()}>
        📍 Offline airport data
    </div>
{/if}
```

**Step 6: Update build script in package.json**

```json
"build": "npm run generate:airports && rm -rf dist && mkdir dist && SERVE=false rollup -c && cp package.json dist/"
```

**Step 7: Run full test suite and build**

Run: `npm test && npm run build`

Expected: All tests pass, build succeeds

**Step 8: Commit**

```bash
git add src/plugin.svelte src/services/airportdbService.ts package.json
git commit -m "feat: integrate airport provider with fallback support"
```

---

## Task 5: Update Rollup Config for JSON Import

**Files:**
- Modify: `rollup.config.js`

**Step 1: Ensure Rollup can import JSON**

Check if `@rollup/plugin-json` is installed. If not:

Run: `npm install --save-dev @rollup/plugin-json`

**Step 2: Add JSON plugin to rollup config**

```javascript
import json from '@rollup/plugin-json';

export default {
    // ... existing config
    plugins: [
        json(), // Add this before other plugins
        // ... existing plugins
    ]
};
```

**Step 3: Test the build**

Run: `npm run build`

Expected: Build succeeds without JSON import errors

**Step 4: Commit**

```bash
git add rollup.config.js package.json package-lock.json
git commit -m "chore: configure rollup for JSON imports"
```

---

## Task 6: Final Testing and Documentation

**Files:**
- Run all tests
- Test manually in Windy

**Step 1: Run all tests**

Run: `npm test`

Expected: All tests pass (including new fallback and provider tests)

**Step 2: Test build**

Run: `npm run build`

Expected: Build succeeds, dist/plugin.min.js includes fallback data

**Step 3: Manual testing checklist**

- [ ] Remove API key from settings → fallback indicator appears
- [ ] Search "CYUL" → Montreal airport found with runways
- [ ] Search "KJFK" → JFK found with runways
- [ ] Search "KLAX" → Not found (outside coverage)
- [ ] Add API key → fallback indicator disappears
- [ ] Search works with API key

**Step 4: Final commit**

```bash
git add -A
git commit -m "feat: complete airport fallback implementation"
```

---

## Summary

| Task | Component | Key Files |
|------|-----------|-----------|
| 1 | Generation Script | `scripts/generate-airports-fallback.js` |
| 2 | Fallback Service | `src/services/airportFallbackService.ts` |
| 3 | Provider Abstraction | `src/services/airportProvider.ts` |
| 4 | Plugin Integration | `src/plugin.svelte` |
| 5 | Rollup Config | `rollup.config.js` |
| 6 | Testing & Docs | Manual verification |
