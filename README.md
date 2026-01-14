# VFR Flight Planner for Windy

A Windy plugin for VFR flight planning with ForeFlight flight plan import, weather integration, and altitude profile visualization.

![Version](https://img.shields.io/badge/version-0.8.0-blue)
![License](https://img.shields.io/badge/license-ISC-green)

## Features

### Flight Plan Import
- Import ForeFlight `.fpl` flight plan files
- Drag & drop or browse to load files
- Automatic route visualization on the Windy map
- Support for airports, waypoints, and user-defined points

### Weather Integration
- Real-time weather data from Windy's forecast models
- Wind speed and direction at flight altitude
- Temperature at waypoints
- Cloud base and cloud top information
- Automatic ground speed calculation with wind correction
- Headwind/tailwind component display

### Altitude Profile View
- Visual terrain elevation profile along your route
- Flight path overlay with VFR condition color-coding:
  - **Green**: Good VFR conditions
  - **Orange**: Marginal VFR conditions
  - **Red**: Poor/IFR conditions
- Cloud layer visualization
- **Winds aloft display** at multiple altitude levels (1000ft to 45000ft)
- Interactive hover showing:
  - Altitude and terrain clearance
  - Wind at flight level
  - Cloud information
  - Winds aloft at all available levels

### Route Management
- Add waypoints by clicking on the map
- Drag waypoints to reposition (configurable)
- Reorder waypoints with up/down buttons
- Delete individual waypoints
- Reverse entire route
- Weather alerts for each waypoint

### Timeline & Departure Planning
- Departure time slider synced with Windy forecast timeline
- ETA calculation based on ground speed
- Weather data updates based on selected departure time

### Export & Integration
- Export route as GPX file
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
| Default Airspeed (TAS) | True airspeed for time calculations | 120 kt |
| Default Altitude | Cruise altitude for weather lookup | 3000 ft |
| Allow Waypoint Dragging | Enable/disable marker dragging | On |
| Show Labels | Display waypoint names on map | On |
| Terrain Sample Interval | Distance between elevation samples | 2 NM |
| Profile Top Height | Maximum altitude on profile graph | 15000 ft |
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

### v0.8.0
- Added multi-level wind data fetching using Windy meteogram API
- Vertical wind barbs displayed at each altitude level in profile view
- Winds aloft in cursor info with altitude notation (5k, 10k format)
- Flight-level wind highlighting in green
- Fixed 5-line cursor info layout
- Complete pressure level to altitude mapping (1000h to 100h)

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
