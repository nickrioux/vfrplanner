# VFR Flight Planner for Windy

Your pre-flight weather window assistant. A Windy plugin for VFR flight planning with flight plan import, weather integration, and altitude profile visualization.

![Version](https://img.shields.io/badge/version-1.0.1-blue)
![License](https://img.shields.io/badge/license-ISC-green)

## Features

### Flight Plan Import
- Import `.fpl` (ForeFlight/Garmin) and `.gpx` flight plan files
- Drag & drop or browse to load files
- Automatic route visualization on the Windy map
- Support for airports, waypoints, and user-defined points

### Airport Search
- Search airports by ICAO code
- Runway data with headings and dimensions
- Best runway selection based on wind conditions
- Crosswind component calculation

### Weather Integration
- Real-time weather data from Windy's forecast models
- Wind speed and direction at flight altitude
- Surface winds and gusts for departure/arrival
- Temperature at waypoints
- Cloud base (ceiling) and visibility
- Automatic ground speed calculation with wind correction
- Headwind/tailwind component display

### VFR Window Finder
- Scan forecast for best departure windows
- Configurable minimum conditions (Good, Marginal, or Poor)
- Shows window duration and overall conditions
- Click to set departure time

### Altitude Profile View
- Visual terrain elevation profile along your route
- Flight path overlay with VFR condition color-coding:
  - **Green**: Good VFR conditions
  - **Orange**: Marginal VFR conditions
  - **Red**: Poor/IFR conditions
- Cloud layer visualization
- **Winds aloft display** at multiple altitude levels (surface to FL450)
- Interactive hover showing:
  - Altitude and terrain clearance
  - Wind at flight level
  - Cloud information
  - Winds aloft at all available levels

### Route Management
- Add waypoints by clicking on the map
- Insert waypoints by clicking on route segments
- Drag waypoints to reposition
- Reorder waypoints with up/down buttons
- Delete individual waypoints
- Reverse entire route
- Weather alerts for each waypoint

### Timeline & Departure Planning
- Departure time slider synced with Windy forecast timeline
- ETA calculation based on ground speed
- Weather data adjusts for estimated arrival time at each waypoint

### Export & Integration
- Export route as GPX or FPL file
- Send route to Windy's Distance & Planning tool

## Installation

1. Open [Windy.com](https://www.windy.com)
2. Go to Menu > Install Windy Plugin
3. Enter the plugin URL or search for "VFR Flight Planner"

## Usage

1. **Load a Flight Plan**: Drag and drop a `.fpl` file from ForeFlight (or click Browse)
2. **Fetch Weather**: Click "Read Wx" to load weather data for all waypoints
3. **Review Route**: Check the waypoint list for weather and alerts
4. **View Profile**: Switch to the Profile tab to see terrain and altitude visualization
5. **Adjust Departure**: Use the timeline slider to see forecast at different times

## Settings

| Setting | Description | Default |
|---------|-------------|---------|
| VFR Condition Thresholds | Standard, Conservative, or Custom minimums | Standard |
| Default Airspeed (TAS) | True airspeed for time calculations | 120 kt |
| Default Altitude | Cruise altitude for weather lookup | 3000 ft |
| Auto Terrain Elevation | Fetch airport elevations automatically | On |
| Show Waypoint Labels | Display waypoint names on map | On |
| Include Night Hours | Include nighttime in VFR window search | Off |
| Max VFR Windows | Maximum windows to find in search | 5 |
| Terrain Sample Interval | Distance between elevation samples | 5 NM |
| Profile Top Height | Maximum altitude on profile graph | 15000 ft |
| AirportDB API Key | Optional key for enhanced airport data | - |
| Debug Logging | Enable console logging for troubleshooting | Off |

## Development

### Prerequisites
- Node.js 18+
- npm

### Setup
```bash
npm install
```

### Development Server
```bash
npm start
```
Opens development server at `https://localhost:9999`

### Build for Production
```bash
npm run build
```

## Changelog

### v0.9.9
- VFR Window Finder to scan forecast for best departure times
- Airport search by ICAO code with runway data
- Best runway selection with crosswind calculation
- GPX and FPL export options
- Help modal with comprehensive documentation
- Configurable VFR condition thresholds
- Weather model warning when using non-ECMWF models
- Terrain elevation batching for long routes (100+ points)

### v0.8.0
- Added multi-level wind data fetching using Windy meteogram API
- Vertical wind barbs displayed at each altitude level in profile view
- Winds aloft in cursor info with altitude notation (5k, 10k format)
- Flight-level wind highlighting in green
- Complete pressure level to altitude mapping (surface to FL450)

### v0.5.0
- VFR segment color-coding (good/marginal/poor conditions)
- Enhanced weather integration
- Debug logging toggle

## License

ISC License

## Author

Nicolas

## Acknowledgments

- Built on the [Windy Plugin Template](https://github.com/windycom/windy-plugin-template)
- Uses [Turf.js](https://turfjs.org/) for geospatial calculations
- Weather data provided by [Windy.com](https://www.windy.com)
