# External API Dependencies

This document describes all external API calls made by the VFR Planner Windy plugin, intended for the Windy mobile app vetting process.

## Overview

The VFR Planner plugin makes HTTP requests to three external APIs to provide aviation-specific functionality. All requests use HTTPS for secure communication.

| API | Purpose | Authentication | Required |
|-----|---------|----------------|----------|
| Open-Meteo Elevation | Terrain elevation data | None | Yes |
| AirportDB | Airport lookup by ICAO | User API key | Optional |
| OpenAIP | Navaids and airspace data | User API key | Optional |

---

## 1. Open-Meteo Elevation API

### Endpoint
```
https://api.open-meteo.com/v1/elevation
```

### Source File
`src/services/elevationService.ts`

### Purpose
Fetches terrain elevation data along the flight route to display an elevation profile. This is essential for VFR flight planning to identify terrain obstacles and ensure safe altitude selection.

### Why Required
- VFR pilots need terrain awareness for safe altitude planning
- Elevation profile visualization shows potential terrain conflicts
- No alternative free API provides equivalent functionality without authentication

### Data Sent
| Parameter | Type | Description |
|-----------|------|-------------|
| `latitude` | string | Comma-separated list of latitudes (e.g., `45.123,45.456`) |
| `longitude` | string | Comma-separated list of longitudes (e.g., `-73.123,-73.456`) |

### Example Request
```
GET https://api.open-meteo.com/v1/elevation?latitude=45.8167,46.0000&longitude=-73.3833,-73.5000
```

### Response Data Received
```json
{
  "elevation": [35.0, 42.0]
}
```
Returns elevation values in meters MSL for each requested coordinate pair.

### Authentication
**None required** - Open-Meteo Elevation API is free and open.

### Rate Limiting
The API has generous rate limits for non-commercial use. The plugin batches requests efficiently to minimize API calls.

### Privacy Considerations
- Only geographic coordinates are sent (latitude/longitude along flight route)
- No user identification or personal data is transmitted
- No tracking or analytics data is sent

---

## 2. AirportDB API

### Endpoint
```
https://airportdb.io/api/v1/airport/{icao}
```

### Source File
`src/services/airportdbService.ts`

### Purpose
Looks up airport information by ICAO code to add airports as waypoints in flight plans. Provides airport name, coordinates, elevation, and runway information.

### Why Required
- Pilots need accurate airport positions and elevations for flight planning
- ICAO code lookup is standard in aviation workflows
- Runway information helps pilots plan approaches

### Data Sent
| Parameter | Type | Description |
|-----------|------|-------------|
| `{icao}` | path | 3-4 character ICAO airport code (e.g., `CYUL`) |
| `apiToken` | query | User-provided API key |

### Example Request
```
GET https://airportdb.io/api/v1/airport/CYUL?apiToken=USER_API_KEY
```

### Response Data Received
```json
{
  "icao_code": "CYUL",
  "name": "Montreal / Pierre Elliott Trudeau International Airport",
  "latitude_deg": 45.4706,
  "longitude_deg": -73.7408,
  "elevation_ft": 118,
  "runways": [...],
  "freqs": [...]
}
```

### Authentication
**User-provided API key required**
- Users must register at [airportdb.io](https://airportdb.io) to obtain a free API key
- The API key is stored locally in the user's browser (localStorage)
- The plugin never transmits the API key to any server other than AirportDB

### Rate Limiting
AirportDB has rate limits based on the user's subscription tier. The plugin makes individual requests only when the user explicitly searches for an airport.

### Privacy Considerations
- Only ICAO codes are sent (no personal data)
- API key is stored locally in user's browser
- No user tracking or analytics data is transmitted

---

## 3. OpenAIP API

### Endpoint
```
https://api.core.openaip.net/api
```

### Source File
`src/services/openaipService.ts`

### Purpose
Provides access to navigation aids (VORs, NDBs, DMEs) and can search for airports. Used as an optional alternative data source for enhanced navigation information.

### Why Required
- Navigation aids are essential for VFR flight planning
- VORs and NDBs serve as visual and radio navigation references
- Provides comprehensive aeronautical data not available elsewhere

### Endpoints Used

#### Airport Search
```
GET /airports?apiKey={key}&search={query}&limit={n}
```

#### Nearby Airport Search
```
GET /airports?apiKey={key}&pos={lon},{lat}&dist={meters}&limit={n}
```

#### Navaid Search
```
GET /navaids?apiKey={key}&search={query}&limit={n}
```

#### Nearby Navaid Search
```
GET /navaids?apiKey={key}&pos={lon},{lat}&dist={meters}&limit={n}
```

### Data Sent
| Parameter | Type | Description |
|-----------|------|-------------|
| `apiKey` | query | User-provided API key |
| `search` | query | Search query (ICAO code, name, or identifier) |
| `pos` | query | Position as `lon,lat` for nearby searches |
| `dist` | query | Search radius in meters |
| `limit` | query | Maximum results to return |
| `page` | query | Pagination (always `1`) |
| `sort` | query | Sort order (`distance` for nearby searches) |

### Example Request
```
GET https://api.core.openaip.net/api/navaids?apiKey=USER_API_KEY&search=YUL&limit=20&page=1
```

### Response Data Received
```json
{
  "limit": 20,
  "totalCount": 1,
  "totalPages": 1,
  "page": 1,
  "items": [
    {
      "_id": "...",
      "identifier": "YUL",
      "name": "Montreal VOR/DME",
      "type": 4,
      "geometry": { "coordinates": [-73.75, 45.47] },
      "frequency": 116.3
    }
  ]
}
```

### Authentication
**User-provided API key required**
- Users must register at [openaip.net](https://www.openaip.net/) to obtain an API key
- The API key is stored locally in the user's browser (localStorage)
- The plugin never transmits the API key to any server other than OpenAIP

### Rate Limiting
OpenAIP has rate limits based on the user's subscription tier. The plugin batches requests where possible and only makes requests when the user explicitly searches.

### Privacy Considerations
- Only search queries and coordinates are sent (no personal data)
- API key is stored locally in user's browser
- No user tracking or analytics data is transmitted

---

## Security Considerations

### Transport Security
- **All API requests use HTTPS** - No plain HTTP requests are made
- TLS encryption ensures data in transit is secure
- Certificate validation is performed by the browser

### Code Security
- **No use of `eval()`** - All code is statically compiled
- **No use of `innerHTML` with untrusted content** - DOM manipulation uses safe methods
- **No dynamic script loading** - All code is bundled at build time
- API responses are parsed as JSON only, never executed as code

### API Key Storage
- API keys are stored in the browser's localStorage
- Keys are entered by the user in the plugin settings
- Keys are only transmitted to their respective API endpoints
- Keys are never logged, stored remotely, or transmitted elsewhere

### Input Validation
- ICAO codes are validated (3-4 alphanumeric characters) before API calls
- Coordinates are validated as numbers before transmission
- API responses are type-checked before use

---

## CORS Compliance

All three APIs support Cross-Origin Resource Sharing (CORS), allowing the plugin to make requests directly from the browser:

| API | CORS Support |
|-----|--------------|
| Open-Meteo | Yes - Public API with permissive CORS |
| AirportDB | Yes - API designed for browser use |
| OpenAIP | Yes - API designed for browser use |

The plugin does not use any proxy servers or backend services. All API calls are made directly from the user's browser to the respective API endpoints.

---

## Offline Behavior

When offline or when API calls fail:
- The plugin gracefully degrades functionality
- Elevation profile is not displayed if Open-Meteo is unavailable
- Airport/navaid search shows appropriate error messages
- Core flight planning features (waypoints, route calculation) remain functional

---

## Data Usage Summary

| Data Type | Transmitted To | Purpose |
|-----------|---------------|---------|
| Route coordinates | Open-Meteo | Terrain elevation lookup |
| ICAO codes | AirportDB | Airport information lookup |
| Search queries | OpenAIP | Airport/navaid search |
| Geographic coordinates | OpenAIP | Nearby feature search |
| User API keys | AirportDB, OpenAIP | Authentication |

**No personal data, device identifiers, or tracking information is transmitted to any external service.**
