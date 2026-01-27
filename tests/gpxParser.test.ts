/**
 * Unit tests for GPX parser
 */
import { parseGPX } from '../src/parsers/gpxParser';

describe('GPX Parser', () => {
    describe('parseGPX', () => {
        it('parses GPX with standalone waypoints', () => {
            const gpx = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="Test">
  <wpt lat="45.4706" lon="-73.7408">
    <name>CYUL</name>
    <sym>Airport</sym>
  </wpt>
  <wpt lat="45.5175" lon="-73.4169">
    <name>CYHU</name>
    <sym>Airport</sym>
  </wpt>
</gpx>`;

            const result = parseGPX(gpx, 'test.gpx');

            expect(result.success).toBe(true);
            expect(result.flightPlan).toBeDefined();
            expect(result.flightPlan!.waypoints).toHaveLength(2);
            expect(result.flightPlan!.waypoints[0].name).toBe('CYUL');
            expect(result.flightPlan!.waypoints[0].lat).toBe(45.4706);
            expect(result.flightPlan!.waypoints[0].lon).toBe(-73.7408);
            expect(result.flightPlan!.waypoints[0].type).toBe('AIRPORT');
            expect(result.flightPlan!.waypoints[1].name).toBe('CYHU');
            expect(result.flightPlan!.sourceFormat).toBe('gpx');
        });

        it('parses GPX with route', () => {
            const gpx = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="Test">
  <rte>
    <name>Montreal Tour</name>
    <rtept lat="45.4706" lon="-73.7408">
      <name>CYUL</name>
    </rtept>
    <rtept lat="45.5" lon="-73.6">
      <name>WPT1</name>
    </rtept>
    <rtept lat="45.5175" lon="-73.4169">
      <name>CYHU</name>
    </rtept>
  </rte>
</gpx>`;

            const result = parseGPX(gpx, 'route.gpx');

            expect(result.success).toBe(true);
            expect(result.flightPlan!.waypoints).toHaveLength(3);
            expect(result.flightPlan!.name).toBe('Montreal Tour');
            expect(result.flightPlan!.waypoints[0].name).toBe('CYUL');
            expect(result.flightPlan!.waypoints[1].name).toBe('WPT1');
            expect(result.flightPlan!.waypoints[2].name).toBe('CYHU');
        });

        it('prioritizes routes over standalone waypoints', () => {
            const gpx = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="Test">
  <wpt lat="0" lon="0">
    <name>IGNORED</name>
  </wpt>
  <rte>
    <rtept lat="45.4706" lon="-73.7408">
      <name>CYUL</name>
    </rtept>
    <rtept lat="45.5175" lon="-73.4169">
      <name>CYHU</name>
    </rtept>
  </rte>
</gpx>`;

            const result = parseGPX(gpx);

            expect(result.success).toBe(true);
            expect(result.flightPlan!.waypoints).toHaveLength(2);
            expect(result.flightPlan!.waypoints[0].name).toBe('CYUL');
        });

        it('parses GPX with track', () => {
            const gpx = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="Test">
  <trk>
    <name>Flight Track</name>
    <trkseg>
      <trkpt lat="45.4706" lon="-73.7408">
        <name>Start</name>
      </trkpt>
      <trkpt lat="45.5" lon="-73.6">
        <name>Mid</name>
      </trkpt>
      <trkpt lat="45.5175" lon="-73.4169">
        <name>End</name>
      </trkpt>
    </trkseg>
  </trk>
</gpx>`;

            const result = parseGPX(gpx);

            expect(result.success).toBe(true);
            expect(result.flightPlan!.waypoints).toHaveLength(3);
            expect(result.flightPlan!.name).toBe('Flight Track');
        });

        it('handles waypoint elevation', () => {
            const gpx = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1">
  <wpt lat="45.4706" lon="-73.7408">
    <name>CYUL</name>
    <ele>36</ele>
  </wpt>
</gpx>`;

            const result = parseGPX(gpx);

            expect(result.success).toBe(true);
            expect(result.flightPlan!.waypoints[0].elevation).toBe(36);
        });

        it('handles waypoint description', () => {
            const gpx = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1">
  <wpt lat="45.4706" lon="-73.7408">
    <name>CYUL</name>
    <desc>Montreal International Airport</desc>
  </wpt>
</gpx>`;

            const result = parseGPX(gpx);

            expect(result.success).toBe(true);
            expect(result.flightPlan!.waypoints[0].comment).toBe('Montreal International Airport');
        });

        it('maps symbols to waypoint types', () => {
            const gpx = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1">
  <wpt lat="45.0" lon="-73.0"><name>WP1</name><sym>Airport</sym></wpt>
  <wpt lat="45.1" lon="-73.1"><name>WP2</name><sym>VOR</sym></wpt>
  <wpt lat="45.2" lon="-73.2"><name>WP3</name><sym>NDB</sym></wpt>
  <wpt lat="45.3" lon="-73.3"><name>WP4</name><sym>Intersection</sym></wpt>
  <wpt lat="45.4" lon="-73.4"><name>WP5</name><sym>VRP</sym></wpt>
  <wpt lat="45.5" lon="-73.5"><name>WP6</name></wpt>
</gpx>`;

            const result = parseGPX(gpx);

            expect(result.success).toBe(true);
            expect(result.flightPlan!.waypoints[0].type).toBe('AIRPORT');
            expect(result.flightPlan!.waypoints[1].type).toBe('VOR');
            expect(result.flightPlan!.waypoints[2].type).toBe('NDB');
            expect(result.flightPlan!.waypoints[3].type).toBe('INT');
            expect(result.flightPlan!.waypoints[4].type).toBe('INT-VRP');
            expect(result.flightPlan!.waypoints[5].type).toBe('USER WAYPOINT');
        });

        it('generates default waypoint names', () => {
            const gpx = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1">
  <wpt lat="45.0" lon="-73.0"></wpt>
  <wpt lat="45.1" lon="-73.1"></wpt>
</gpx>`;

            const result = parseGPX(gpx);

            expect(result.success).toBe(true);
            expect(result.flightPlan!.waypoints[0].name).toBe('WPT0');
            expect(result.flightPlan!.waypoints[1].name).toBe('WPT1');
        });

        it('uses metadata name for flight plan', () => {
            const gpx = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1">
  <metadata>
    <name>My Flight Plan</name>
  </metadata>
  <wpt lat="45.0" lon="-73.0"><name>A</name></wpt>
  <wpt lat="45.1" lon="-73.1"><name>B</name></wpt>
</gpx>`;

            const result = parseGPX(gpx);

            expect(result.success).toBe(true);
            expect(result.flightPlan!.name).toBe('My Flight Plan');
        });

        it('generates flight plan name from waypoints', () => {
            const gpx = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1">
  <wpt lat="45.0" lon="-73.0"><name>CYUL</name></wpt>
  <wpt lat="45.1" lon="-73.1"><name>CYHU</name></wpt>
</gpx>`;

            const result = parseGPX(gpx);

            expect(result.success).toBe(true);
            expect(result.flightPlan!.name).toBe('CYUL to CYHU');
        });

        it('uses filename for flight plan name when no other source', () => {
            const gpx = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1">
  <wpt lat="45.0" lon="-73.0"></wpt>
</gpx>`;

            const result = parseGPX(gpx, 'MyRoute.gpx');

            expect(result.success).toBe(true);
            expect(result.flightPlan!.name).toBe('MyRoute');
        });

        it('returns error for missing gpx root element', () => {
            const result = parseGPX('<invalid></invalid>');

            expect(result.success).toBe(false);
            expect(result.error).toContain('missing gpx root element');
        });

        it('returns error for empty GPX file', () => {
            const gpx = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1"></gpx>`;

            const result = parseGPX(gpx);

            expect(result.success).toBe(false);
            expect(result.error).toContain('no waypoints, routes, or tracks');
        });

        it('returns error for non-GPX content', () => {
            const result = parseGPX('not xml at all {json: true}');

            expect(result.success).toBe(false);
            // Parser may return different errors for invalid content
            expect(result.error).toBeDefined();
        });

        it('handles single waypoint in route', () => {
            const gpx = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1">
  <rte>
    <rtept lat="45.4706" lon="-73.7408">
      <name>CYUL</name>
    </rtept>
  </rte>
</gpx>`;

            const result = parseGPX(gpx);

            expect(result.success).toBe(true);
            expect(result.flightPlan!.waypoints).toHaveLength(1);
        });

        it('sets default aircraft values', () => {
            const gpx = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1">
  <wpt lat="45.0" lon="-73.0"><name>TEST</name></wpt>
</gpx>`;

            const result = parseGPX(gpx);

            expect(result.success).toBe(true);
            expect(result.flightPlan!.aircraft.airspeed).toBe(100);
            expect(result.flightPlan!.aircraft.defaultAltitude).toBe(3000);
        });

        it('converts waypoint names to uppercase', () => {
            const gpx = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1">
  <wpt lat="45.0" lon="-73.0"><name>cyul</name></wpt>
</gpx>`;

            const result = parseGPX(gpx);

            expect(result.success).toBe(true);
            expect(result.flightPlan!.waypoints[0].name).toBe('CYUL');
        });
    });
});
