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

// Geographic filters - North America + Europe
const NORTH_AMERICA_COUNTRIES = ['CA', 'US', 'MX'];
const EUROPE_COUNTRIES = [
    'GB', 'FR', 'DE', 'ES', 'IT', 'NL', 'BE', 'CH', 'AT', 'PT',
    'IE', 'DK', 'NO', 'SE', 'FI', 'PL', 'CZ', 'GR', 'HU', 'RO',
    'BG', 'HR', 'SK', 'SI', 'LT', 'LV', 'EE', 'IS', 'LU', 'MT',
    'CY', 'RS', 'BA', 'ME', 'MK', 'AL', 'XK'
];
const COVERED_COUNTRIES = [...NORTH_AMERICA_COUNTRIES, ...EUROPE_COUNTRIES];

// Airport type filters - Large and Medium only for broader coverage
const INCLUDED_TYPES = ['large_airport', 'medium_airport'];

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
 * Check if airport is in covered country (NA or Europe)
 */
function isInCoveredCountry(country) {
    if (!country) return false;
    return COVERED_COUNTRIES.includes(country);
}

/**
 * Check if airport type should be included
 */
function isIncludedType(type) {
    return INCLUDED_TYPES.includes(type);
}

/**
 * Check if ident is a valid ICAO code
 * ICAO codes are typically 4 characters (some regions use 3)
 * We accept any alphanumeric code of 3-4 characters
 */
function isValidIcaoCode(ident) {
    if (!ident) return false;
    if (ident.length < 3 || ident.length > 4) return false;
    return /^[A-Z0-9]+$/i.test(ident);
}

/**
 * Abbreviate surface type to save space
 */
function abbreviateSurface(surface) {
    if (!surface) return 'UNK';
    const upper = surface.toUpperCase();
    if (upper.includes('ASPH') || upper.includes('ASPHALT')) return 'ASP';
    if (upper.includes('CONC') || upper.includes('CONCRETE')) return 'CON';
    if (upper.includes('GRAV') || upper.includes('GRAVEL')) return 'GRV';
    if (upper.includes('TURF') || upper.includes('GRASS')) return 'TRF';
    if (upper.includes('DIRT') || upper.includes('EARTH')) return 'DRT';
    if (upper.includes('WATER')) return 'WTR';
    if (upper.includes('SAND')) return 'SND';
    if (upper.length > 3) return upper.substring(0, 3);
    return upper || 'UNK';
}

/**
 * Round a number to specified decimal places
 */
function round(num, decimals) {
    return Math.round(num * Math.pow(10, decimals)) / Math.pow(10, decimals);
}

/**
 * Truncate string to max length
 */
function truncate(str, maxLen) {
    if (!str) return '';
    if (str.length <= maxLen) return str;
    return str.substring(0, maxLen - 1) + '…';
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

    // Filter airports - only valid ICAO codes in covered countries (NA + Europe)
    const filteredAirports = allAirports.filter(apt =>
        isInCoveredCountry(apt.iso_country) &&
        isIncludedType(apt.type) &&
        isValidIcaoCode(apt.ident)
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
                s: abbreviateSurface(rwy.surface),
                hd: [
                    Math.round(parseFloat(rwy.le_heading_degT) || 0),
                    Math.round(parseFloat(rwy.he_heading_degT) || 0)
                ]
            }))
            .filter(rwy => rwy.l > 0); // Only runways with valid length

        airports[icao] = {
            n: truncate(apt.name, 50),
            la: round(parseFloat(apt.latitude_deg), 4),
            lo: round(parseFloat(apt.longitude_deg), 4),
            el: parseInt(apt.elevation_ft) || 0,
            t: apt.type.replace('_airport', '').replace('seaplane_base', 'seaplane'),
            m: truncate(apt.municipality || '', 30),
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
            coverage: {
                types: 'Large and medium airports',
                northAmerica: 'Canada, USA, Mexico',
                europe: 'All EU/EEA countries + UK, Switzerland, Balkans'
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
