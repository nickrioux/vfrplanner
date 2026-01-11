# Altitude Profile Segment Color-Coding Plan

## Overview
Color-code altitude profile segments (green/yellow/red) based on VFR flight conditions to provide quick visual assessment of route safety.

---

## 1. Condition Evaluation Criteria

**IMPORTANT**: Wind speed and gust checks only apply to **departure and arrival waypoints**, as high winds are primarily a concern for takeoff and landing operations, not cruise flight.

### Green (Good VFR Conditions)
All of the following must be true:
- ✅ Wind speed < 20 knots *(departure/arrival only)*
- ✅ Wind gusts < 30 knots (if available) *(departure/arrival only)*
- ✅ Cloud base > 2000 ft AGL (or flight altitude + 500 ft clearance)
- ✅ Visibility > 8 km (~5 statute miles)
- ✅ Precipitation < 2 mm
- ✅ Terrain clearance > 1000 ft AGL
- ✅ Cloud clearance > 500 ft vertical

### Yellow (Marginal VFR / Caution)
Any one of the following:
- ⚠️ Wind speed 20-25 knots *(departure/arrival only)*
- ⚠️ Wind gusts 30-35 knots *(departure/arrival only)*
- ⚠️ Cloud base 1500-2000 ft AGL
- ⚠️ Visibility 5-8 km
- ⚠️ Precipitation 2-5 mm
- ⚠️ Terrain clearance 500-1000 ft AGL
- ⚠️ Cloud clearance 200-500 ft vertical

### Red (Poor VFR / Warning)
Any one of the following:
- 🚨 Wind speed > 25 knots *(departure/arrival only)*
- 🚨 Wind gusts > 35 knots *(departure/arrival only)*
- 🚨 Cloud base < 1500 ft AGL
- 🚨 Visibility < 5 km
- 🚨 Precipitation > 5 mm
- 🚨 Terrain clearance < 500 ft AGL
- 🚨 Cloud clearance < 200 ft vertical
- 🚨 Flight altitude above cloud base (IMC conditions)

### Gray (No Data)
- Missing wind data (critical for any evaluation)

**IMPORTANT**: Missing cloud base data means **CLEAR SKY** (no clouds), which is a GOOD VFR condition. The API only returns cloud base when clouds are present. No cloud data = clear conditions!

---

## 2. Technical Implementation

### Phase 1: Data Structure Enhancement

**File**: `src/services/profileService.ts`

#### Add Condition Evaluation Function
```typescript
export type SegmentCondition = 'good' | 'marginal' | 'poor' | 'unknown';

export interface ConditionCriteria {
    windSpeed: number;
    gustSpeed?: number;
    cloudBaseAGL: number;
    visibility: number;
    precipitation: number;
    terrainClearance: number;
    cloudClearance: number;
}

/**
 * Evaluate VFR flight conditions for a profile segment
 * @param point - Profile data point with weather and terrain
 * @param flightAltitude - Planned flight altitude MSL
 * @param wx - Weather data for additional parameters
 * @param isTerminal - True if departure/arrival (wind checks apply)
 * @returns Condition assessment: 'good' | 'marginal' | 'poor' | 'unknown'
 */
export function evaluateSegmentCondition(
    point: ProfileDataPoint,
    flightAltitude: number,
    wx?: WaypointWeather,
    isTerminal: boolean = false
): SegmentCondition {
    // Check for missing critical data (wind is essential)
    if (!point.windSpeed) {
        return 'unknown';
    }

    // NOTE: Missing cloud base means CLEAR SKY (good VFR), not missing data!
    // The API only returns cloud base when clouds are present.

    // Calculate terrain clearance
    const terrainMSL = point.terrainElevation ?? 0;
    const terrainClearance = flightAltitude - terrainMSL;

    // Calculate cloud-related values ONLY if clouds are present
    let cloudBaseAGL: number | undefined;
    let cloudClearance: number | undefined;

    if (point.cloudBase !== undefined) {
        const cloudBaseMSL = point.cloudBase; // Already in MSL
        cloudBaseAGL = cloudBaseMSL - terrainMSL;
        cloudClearance = cloudBaseMSL - flightAltitude;

        // Check for IMC conditions (flying in clouds)
        if (flightAltitude >= cloudBaseMSL) {
            return 'poor'; // Aircraft above cloud base = IMC
        }
    }

    // Collect criteria
    const criteria: ConditionCriteria = {
        windSpeed: point.windSpeed,
        gustSpeed: undefined, // Will add if available
        cloudBaseAGL,
        visibility: 10, // Default if not available, will use actual if provided
        precipitation: 0, // Default if not available
        terrainClearance,
        cloudClearance,
    };

    // Evaluate conditions - Red (Poor) takes priority
    if (
        criteria.windSpeed > 25 ||
        (criteria.gustSpeed !== undefined && criteria.gustSpeed > 35) ||
        criteria.cloudBaseAGL < 1500 ||
        criteria.visibility < 5 ||
        criteria.precipitation > 5 ||
        criteria.terrainClearance < 500 ||
        criteria.cloudClearance < 200
    ) {
        return 'poor';
    }

    // Evaluate Yellow (Marginal)
    if (
        criteria.windSpeed > 20 ||
        (criteria.gustSpeed !== undefined && criteria.gustSpeed > 30) ||
        criteria.cloudBaseAGL < 2000 ||
        criteria.visibility < 8 ||
        criteria.precipitation > 2 ||
        criteria.terrainClearance < 1000 ||
        criteria.cloudClearance < 500
    ) {
        return 'marginal';
    }

    // All checks passed - Green (Good)
    return 'good';
}
```

#### Enhance ProfileDataPoint Interface
```typescript
export interface ProfileDataPoint {
    // ... existing fields ...

    // Add condition assessment
    condition?: SegmentCondition;
    conditionReasons?: string[]; // List of factors causing marginal/poor rating
}
```

#### Update calculateProfileData Function
```typescript
export function calculateProfileData(
    waypoints: Waypoint[],
    weatherData: Map<string, WaypointWeather>,
    defaultAltitude: number = 3000
): ProfileDataPoint[] {
    // ... existing code ...

    waypoints.forEach((wp, index) => {
        // ... existing code to create point ...

        // Evaluate segment condition
        const altitude = wp.altitude ?? defaultAltitude;
        point.condition = evaluateSegmentCondition(point, altitude);

        profilePoints.push(point);
    });

    return profilePoints;
}
```

---

### Phase 2: Visual Rendering

**File**: `src/components/AltitudeProfile.svelte`

#### Add Color Mapping Function
```typescript
/**
 * Get segment color based on condition
 */
function getSegmentColor(condition: SegmentCondition): string {
    switch (condition) {
        case 'good':
            return '#4caf50'; // Green
        case 'marginal':
            return '#ff9800'; // Orange/Yellow
        case 'poor':
            return '#f44336'; // Red
        case 'unknown':
        default:
            return '#757575'; // Gray
    }
}
```

#### Replace Single Path with Segmented Paths
Replace the single altitude profile path with individual segments:

```svelte
<!-- Altitude profile line (segmented by condition) -->
{#each profileData as point, index}
    {#if index < profileData.length - 1}
        {@const nextPoint = profileData[index + 1]}
        {@const segmentColor = getSegmentColor(point.condition || 'unknown')}
        <line
            x1={distanceToX(point.distance)}
            y1={altitudeToY(point.altitude)}
            x2={distanceToX(nextPoint.distance)}
            y2={altitudeToY(nextPoint.altitude)}
            stroke={segmentColor}
            stroke-width="3"
            stroke-linecap="round"
        />
    {/if}
{/each}
```

#### Add Condition Legend
```svelte
<div class="condition-legend">
    <div class="legend-item">
        <span class="legend-color" style="background-color: #4caf50;"></span>
        <span class="legend-label">Good VFR</span>
    </div>
    <div class="legend-item">
        <span class="legend-color" style="background-color: #ff9800;"></span>
        <span class="legend-label">Marginal VFR</span>
    </div>
    <div class="legend-item">
        <span class="legend-color" style="background-color: #f44336;"></span>
        <span class="legend-label">Poor VFR</span>
    </div>
    <div class="legend-item">
        <span class="legend-color" style="background-color: #757575;"></span>
        <span class="legend-label">No Data</span>
    </div>
</div>
```

#### Enhance Cursor Tooltip
Add condition information to the cursor tooltip:

```svelte
{#if cursorData}
    <!-- Existing cursor info -->

    <!-- Add condition display -->
    <div class="cursor-condition" style="color: {getSegmentColor(cursorData.condition || 'unknown')}">
        Conditions: {cursorData.condition?.toUpperCase() || 'UNKNOWN'}
    </div>

    {#if cursorData.conditionReasons && cursorData.conditionReasons.length > 0}
        <div class="cursor-condition-reasons">
            {#each cursorData.conditionReasons as reason}
                <div>⚠️ {reason}</div>
            {/each}
        </div>
    {/if}
{/if}
```

---

### Phase 3: Styling

**File**: `src/components/AltitudeProfile.svelte` (style section)

```css
.condition-legend {
    display: flex;
    gap: 15px;
    padding: 8px;
    background-color: rgba(0, 0, 0, 0.3);
    border-radius: 4px;
    margin-bottom: 10px;
    font-size: 11px;
}

.legend-item {
    display: flex;
    align-items: center;
    gap: 6px;
}

.legend-color {
    width: 20px;
    height: 3px;
    border-radius: 2px;
}

.legend-label {
    color: rgba(255, 255, 255, 0.8);
}

.cursor-condition {
    font-weight: bold;
    margin-top: 4px;
}

.cursor-condition-reasons {
    font-size: 10px;
    color: rgba(255, 255, 255, 0.7);
    margin-top: 4px;
}
```

---

## 3. Advanced Features (Future Enhancements)

### Phase 4: Interpolation Between Waypoints
Currently, each segment uses the condition of the starting waypoint. For more accuracy:
- Interpolate weather conditions between waypoints
- Sample conditions at multiple points along each segment
- Use worst condition found in segment

### Phase 5: User-Configurable Thresholds
Allow users to adjust condition thresholds:
- Conservative (stricter thresholds for less experienced pilots)
- Standard (current values)
- Relaxed (for experienced pilots)

### Phase 6: Additional Condition Factors
- Temperature extremes (density altitude warnings)
- Time of day (night VFR restrictions)
- Freezing level proximity
- Turbulence forecast (if available)

### Phase 7: Segment Highlighting
- Hover over segment to highlight it
- Click segment to show detailed condition breakdown
- Link segment clicks to route map (highlight corresponding waypoints)

---

## 4. Testing Strategy

### Test Cases
1. **All green route** - Perfect VFR conditions throughout
2. **Degrading conditions** - Green → Yellow → Red progression
3. **High terrain** - Test terrain clearance warnings
4. **Low clouds** - Test cloud clearance and IMC detection
5. **High winds** - Test wind speed thresholds
6. **Missing data** - Test gray segments for missing weather
7. **Mixed conditions** - Combination of good/marginal/poor segments

### Visual Verification
- Color transitions should be smooth and clear
- Legend should be easy to understand
- Cursor tooltip should provide helpful details
- Performance should remain smooth with long routes

---

## 5. Implementation Checklist

- [ ] Phase 1: Data Structure
  - [ ] Create `SegmentCondition` type
  - [ ] Create `ConditionCriteria` interface
  - [ ] Implement `evaluateSegmentCondition()` function
  - [ ] Enhance `ProfileDataPoint` with condition fields
  - [ ] Update `calculateProfileData()` to evaluate conditions
  - [ ] Add condition reasons tracking

- [ ] Phase 2: Visual Rendering
  - [ ] Create `getSegmentColor()` function
  - [ ] Replace single path with segmented lines
  - [ ] Add condition legend component
  - [ ] Enhance cursor tooltip with condition info
  - [ ] Add condition reasons display

- [ ] Phase 3: Styling
  - [ ] Style condition legend
  - [ ] Style cursor condition display
  - [ ] Ensure colors are accessible/visible
  - [ ] Test on different backgrounds

- [ ] Testing
  - [ ] Test with sample flight plans
  - [ ] Verify color accuracy
  - [ ] Check performance with long routes
  - [ ] Validate condition evaluation logic

---

## 6. Color Scheme Rationale

### Aviation-Standard Colors
- **Green (#4caf50)**: Universal "go" signal, good conditions
- **Yellow/Orange (#ff9800)**: Caution, marginal conditions require attention
- **Red (#f44336)**: Warning, poor conditions, reconsider flight
- **Gray (#757575)**: Neutral, no data available

### Accessibility Considerations
- High contrast against dark background
- Distinguishable for color-blind users (use patterns if needed)
- Clear visual hierarchy (red = most attention)

---

## 7. Example Output

```
Route Profile Visualization:
═══════════════════════════════════════════════════════════════

CYQB ───(green)─── WP1 ───(green)─── WP2 ───(yellow)─── WP3 ───(red)─── CYHU
3000ft           3000ft           3000ft            3500ft           4000ft

Conditions Summary:
✅ CYQB-WP1: Good VFR (wind 12kt, clouds 3500ft AGL)
✅ WP1-WP2: Good VFR (wind 15kt, clouds 3200ft AGL)
⚠️ WP2-WP3: Marginal VFR (wind 22kt, clouds 1800ft AGL)
🚨 WP3-CYHU: Poor VFR (wind 28kt, clouds 1200ft AGL)
```

---

## 8. Performance Considerations

### Optimization Strategies
1. **Condition evaluation caching**: Calculate once, reuse for rendering
2. **Memoization**: Only recalculate when weather data changes
3. **Lazy evaluation**: Only evaluate visible segments when zoomed in (future)
4. **Batch rendering**: Render all segments in single pass

### Expected Impact
- Minimal performance impact (simple calculations per waypoint)
- No additional API calls required
- Rendering remains smooth with SVG line segments

---

## Summary

This plan provides a comprehensive, aviation-focused approach to segment color-coding that:
- ✅ Uses standard VFR minimums and safety criteria
- ✅ Provides clear visual feedback at a glance
- ✅ Includes detailed condition information on demand
- ✅ Maintains good performance
- ✅ Follows aviation safety best practices
- ✅ Extensible for future enhancements

The implementation is phased to allow incremental development and testing.
