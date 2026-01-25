# Mobile Support Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Prepare the VFR Planner plugin for Windy's native mobile app (iOS/Android) expected late 2026 by implementing touch-first interactions, proper touch targets, and mobile-optimized state management.

**Architecture:** The approach is "Touch-First and Asset-Light" - adding pointer/touch event support alongside existing mouse events, increasing all interactive element sizes to 44x44px minimum, replacing localStorage with @windy/store for cloud sync compatibility, and adding :active/:focus states as hover alternatives.

**Tech Stack:** Svelte 4, TypeScript, Leaflet, @windy/store API

---

## Analysis Summary

| Criterion | Current Status | Action Required |
|-----------|----------------|-----------------|
| Leaflet Constructor Syntax | ✅ GOOD | None - already using `new L.Marker()` |
| Windy CSS Classes | ✅ GOOD | None - using `plugin__*` classes |
| Touch Target Sizes | ⚠️ NEEDS WORK | Increase buttons to 44x44px minimum |
| Hover States | ⚠️ NEEDS WORK | Add :active/:focus alternatives |
| Input Types | ✅ GOOD | None - proper HTML5 types used |
| Storage | ⚠️ NEEDS WORK | Migrate localStorage to @windy/store |
| External APIs | ✅ GOOD | Document for vetting process |
| Security | ✅ GOOD | No eval/innerHTML issues |
| Touch Events | ❌ CRITICAL | Add touch/pointer event handlers |

---

## Task 1: Add Touch Event Support to Floating Window Drag

**Files:**
- Modify: `src/plugin.svelte:1748-1780` (drag handler functions)

**Context:** The floating window currently only supports mouse events for dragging. On touch devices, users cannot move the window at all. We need to add touch event support using pointer events (which unify mouse and touch).

**Step 1: Update startDrag to handle both mouse and touch**

In `src/plugin.svelte`, find the `startDrag` function (around line 1748) and update it:

```typescript
function startDrag(e: MouseEvent | TouchEvent) {
    if (!floatingMode) return;

    // Get coordinates from mouse or touch event
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    isDragging = true;
    dragOffset = {
        x: clientX - floatingPosition.x,
        y: clientY - floatingPosition.y
    };

    // Add both mouse and touch listeners
    document.addEventListener('mousemove', handleDrag);
    document.addEventListener('mouseup', stopDrag);
    document.addEventListener('touchmove', handleDrag, { passive: false });
    document.addEventListener('touchend', stopDrag);

    e.preventDefault();
}
```

**Step 2: Update handleDrag for touch events**

Find the `handleDrag` function and update it:

```typescript
function handleDrag(e: MouseEvent | TouchEvent) {
    if (!isDragging) return;

    // Get coordinates from mouse or touch event
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    const newX = clientX - dragOffset.x;
    const newY = clientY - dragOffset.y;

    // Constrain to viewport
    const maxX = window.innerWidth - floatingSize.width;
    const maxY = window.innerHeight - floatingSize.height;

    floatingPosition = {
        x: Math.max(0, Math.min(newX, maxX)),
        y: Math.max(0, Math.min(newY, maxY))
    };

    e.preventDefault();
}
```

**Step 3: Update stopDrag to remove touch listeners**

```typescript
function stopDrag() {
    isDragging = false;
    document.removeEventListener('mousemove', handleDrag);
    document.removeEventListener('mouseup', stopDrag);
    document.removeEventListener('touchmove', handleDrag);
    document.removeEventListener('touchend', stopDrag);
    saveSession();
}
```

**Step 4: Add touchstart handler to drag handle in template**

Find the drag handle element (the header with `on:mousedown={startDrag}`) and add touch support:

```svelte
<div
    class="floating-header"
    on:mousedown={startDrag}
    on:touchstart={startDrag}
    role="button"
    tabindex="0"
>
```

**Step 5: Build and test manually**

Run: `npm run build`
Expected: Build succeeds without errors

Manual test: Open plugin in browser dev tools mobile emulator, verify window can be dragged with touch simulation.

**Step 6: Commit**

```bash
git add src/plugin.svelte
git commit -m "feat(mobile): add touch event support for floating window drag

- Update startDrag/handleDrag/stopDrag to handle TouchEvent
- Add touchstart/touchmove/touchend listeners
- Use passive: false for touchmove to allow preventDefault

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Task 2: Add Touch Event Support to Floating Window Resize

**Files:**
- Modify: `src/plugin.svelte:1785-1840` (resize handler functions)

**Context:** Similar to drag, the resize handlers only support mouse events. Touch users cannot resize the floating window.

**Step 1: Update startResize for touch events**

Find `startResize` function (around line 1785) and update:

```typescript
function startResize(e: MouseEvent | TouchEvent, direction: string) {
    if (!floatingMode) return;

    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    isResizing = true;
    resizeDirection = direction;
    resizeStart = {
        x: clientX,
        y: clientY,
        width: floatingSize.width,
        height: floatingSize.height,
        posX: floatingPosition.x,
        posY: floatingPosition.y
    };

    document.addEventListener('mousemove', handleResize);
    document.addEventListener('mouseup', stopResize);
    document.addEventListener('touchmove', handleResize, { passive: false });
    document.addEventListener('touchend', stopResize);

    e.preventDefault();
    e.stopPropagation();
}
```

**Step 2: Update handleResize for touch events**

```typescript
function handleResize(e: MouseEvent | TouchEvent) {
    if (!isResizing) return;

    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    const deltaX = clientX - resizeStart.x;
    const deltaY = clientY - resizeStart.y;

    let newWidth = resizeStart.width;
    let newHeight = resizeStart.height;
    let newX = resizeStart.posX;
    let newY = resizeStart.posY;

    // Handle resize direction logic (existing code)
    if (resizeDirection.includes('e')) {
        newWidth = Math.max(MIN_WIDTH, resizeStart.width + deltaX);
    }
    if (resizeDirection.includes('w')) {
        const widthDelta = Math.min(deltaX, resizeStart.width - MIN_WIDTH);
        newWidth = resizeStart.width - widthDelta;
        newX = resizeStart.posX + widthDelta;
    }
    if (resizeDirection.includes('s')) {
        newHeight = Math.max(MIN_HEIGHT, resizeStart.height + deltaY);
    }
    if (resizeDirection.includes('n')) {
        const heightDelta = Math.min(deltaY, resizeStart.height - MIN_HEIGHT);
        newHeight = resizeStart.height - heightDelta;
        newY = resizeStart.posY + heightDelta;
    }

    floatingSize = { width: newWidth, height: newHeight };
    floatingPosition = { x: newX, y: newY };

    e.preventDefault();
}
```

**Step 3: Update stopResize to remove touch listeners**

```typescript
function stopResize() {
    isResizing = false;
    document.removeEventListener('mousemove', handleResize);
    document.removeEventListener('mouseup', stopResize);
    document.removeEventListener('touchmove', handleResize);
    document.removeEventListener('touchend', stopResize);
    saveSession();
}
```

**Step 4: Add touchstart to resize handles in template**

Find all resize handle elements and add touch support. For each handle:

```svelte
<div
    class="resize-handle resize-handle-e"
    on:mousedown={(e) => startResize(e, 'e')}
    on:touchstart={(e) => startResize(e, 'e')}
></div>
```

Repeat for all 8 resize handles: n, s, e, w, ne, nw, se, sw.

**Step 5: Build and test**

Run: `npm run build`
Expected: Build succeeds

Manual test: Verify resize works with touch in mobile emulator.

**Step 6: Commit**

```bash
git add src/plugin.svelte
git commit -m "feat(mobile): add touch event support for floating window resize

- Update startResize/handleResize/stopResize for TouchEvent
- Add touchstart handlers to all 8 resize handles
- Maintain existing resize direction logic

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Task 3: Increase Touch Target Sizes for Floating Window Controls

**Files:**
- Modify: `src/plugin.svelte` (CSS section, around line 3240-3270)

**Context:** The floating window control buttons (minimize, close, float toggle) are currently 24x24px, below the 44x44px accessibility minimum for touch targets.

**Step 1: Update floating button CSS**

Find the `.floating-btn` CSS rule and update:

```css
.floating-btn {
    background: rgba(255, 255, 255, 0.1);
    border: none;
    color: #ccc;
    cursor: pointer;
    padding: 10px;
    min-width: 44px;
    min-height: 44px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 4px;
    font-size: 16px;
    transition: background 0.2s, color 0.2s;
    -webkit-tap-highlight-color: transparent;
    touch-action: manipulation;

    &:hover,
    &:active,
    &:focus {
        background: rgba(255, 255, 255, 0.2);
        color: #fff;
    }

    &:focus {
        outline: 2px solid #4a90d9;
        outline-offset: 2px;
    }
}
```

**Step 2: Update floating header layout for larger buttons**

Find `.floating-header` CSS and ensure proper spacing:

```css
.floating-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 12px;
    background: #1a1a1a;
    cursor: move;
    user-select: none;
    -webkit-user-select: none;
    touch-action: none;
    min-height: 44px;
}

.floating-controls {
    display: flex;
    gap: 4px;
    margin-left: 8px;
}
```

**Step 3: Build and verify**

Run: `npm run build`
Expected: Build succeeds

Manual test: Verify buttons are visually larger and easy to tap in mobile emulator.

**Step 4: Commit**

```bash
git add src/plugin.svelte
git commit -m "feat(mobile): increase floating window control touch targets to 44x44px

- Update .floating-btn min-width/min-height to 44px
- Add :active and :focus states for touch feedback
- Add touch-action: manipulation for better touch response

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Task 4: Increase Resize Handle Touch Targets

**Files:**
- Modify: `src/plugin.svelte` (CSS section, around line 3000-3050)

**Context:** Resize handles are currently 6px wide, making them nearly impossible to touch on mobile. We'll increase the touch target while keeping the visual indicator subtle.

**Step 1: Update resize handle CSS with larger touch targets**

```css
.resize-handle {
    position: absolute;
    z-index: 10;
    /* Visual size stays subtle, but touch target is larger */
}

/* Edge handles - thin visible line, large touch area */
.resize-handle-n,
.resize-handle-s {
    height: 20px;
    left: 20px;
    right: 20px;
    cursor: ns-resize;
}

.resize-handle-n {
    top: -10px;
}

.resize-handle-s {
    bottom: -10px;
}

.resize-handle-e,
.resize-handle-w {
    width: 20px;
    top: 20px;
    bottom: 20px;
    cursor: ew-resize;
}

.resize-handle-e {
    right: -10px;
}

.resize-handle-w {
    left: -10px;
}

/* Corner handles - larger for easier touch */
.resize-handle-ne,
.resize-handle-nw,
.resize-handle-se,
.resize-handle-sw {
    width: 30px;
    height: 30px;
}

.resize-handle-ne {
    top: -10px;
    right: -10px;
    cursor: nesw-resize;
}

.resize-handle-nw {
    top: -10px;
    left: -10px;
    cursor: nwse-resize;
}

.resize-handle-se {
    bottom: -10px;
    right: -10px;
    cursor: nwse-resize;
}

.resize-handle-sw {
    bottom: -10px;
    left: -10px;
    cursor: nesw-resize;
}

/* Visual indicator on hover/touch */
.resize-handle::after {
    content: '';
    position: absolute;
    background: rgba(74, 144, 217, 0);
    transition: background 0.2s;
}

.resize-handle:hover::after,
.resize-handle:active::after {
    background: rgba(74, 144, 217, 0.5);
}

.resize-handle-n::after,
.resize-handle-s::after {
    left: 0;
    right: 0;
    height: 4px;
    top: 50%;
    transform: translateY(-50%);
}

.resize-handle-e::after,
.resize-handle-w::after {
    top: 0;
    bottom: 0;
    width: 4px;
    left: 50%;
    transform: translateX(-50%);
}

.resize-handle-ne::after,
.resize-handle-nw::after,
.resize-handle-se::after,
.resize-handle-sw::after {
    width: 12px;
    height: 12px;
    border-radius: 50%;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
}
```

**Step 2: Build and test**

Run: `npm run build`
Expected: Build succeeds

Manual test: Verify resize handles are easier to grab in mobile emulator.

**Step 3: Commit**

```bash
git add src/plugin.svelte
git commit -m "feat(mobile): increase resize handle touch targets to 20-30px

- Extend edge handles to 20px touch area
- Extend corner handles to 30x30px
- Add visual feedback on hover/active via ::after pseudo-element
- Keep visual appearance subtle while improving touch usability

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Task 5: Increase Main UI Button Touch Targets

**Files:**
- Modify: `src/plugin.svelte` (CSS section, button styles around line 3050-3150)

**Context:** Many action buttons (sync, clear, browse, new plan, etc.) have padding that results in heights below 44px.

**Step 1: Create mobile-friendly button mixin and update button styles**

```css
/* Base button styles with mobile-friendly sizing */
.btn-action,
.btn-browse,
.btn-new,
.btn-find-windows,
.btn-use-window,
.btn-sync,
.btn-clear,
.btn-delete {
    min-height: 44px;
    min-width: 44px;
    padding: 10px 16px;
    font-size: 14px;
    border-radius: 4px;
    cursor: pointer;
    border: none;
    transition: background 0.2s, transform 0.1s;
    -webkit-tap-highlight-color: transparent;
    touch-action: manipulation;

    &:active {
        transform: scale(0.98);
    }

    &:focus {
        outline: 2px solid #4a90d9;
        outline-offset: 2px;
    }
}

.btn-browse,
.btn-new {
    background: #2c3e50;
    color: #fff;
    flex: 1;

    &:hover,
    &:active {
        background: #34495e;
    }
}

.btn-find-windows {
    background: #27ae60;
    color: #fff;
    width: 100%;

    &:hover,
    &:active {
        background: #2ecc71;
    }

    &:disabled {
        background: #555;
        cursor: not-allowed;
        transform: none;
    }
}

.btn-use-window {
    background: #3498db;
    color: #fff;

    &:hover,
    &:active {
        background: #2980b9;
    }
}

.btn-sync {
    background: #8e44ad;
    color: #fff;

    &:hover,
    &:active {
        background: #9b59b6;
    }
}

.btn-clear,
.btn-delete {
    background: #c0392b;
    color: #fff;

    &:hover,
    &:active {
        background: #e74c3c;
    }
}

.btn-action {
    background: #3498db;
    color: #fff;

    &:hover,
    &:active {
        background: #2980b9;
    }
}
```

**Step 2: Build and test**

Run: `npm run build`
Expected: Build succeeds

Manual test: Verify all buttons are at least 44px tall and easy to tap.

**Step 3: Commit**

```bash
git add src/plugin.svelte
git commit -m "feat(mobile): increase all action button touch targets to 44px minimum

- Set min-height: 44px on all button classes
- Add :active transform feedback for touch
- Add :focus outlines for accessibility
- Use touch-action: manipulation for faster touch response

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Task 6: Add Active/Focus States as Hover Alternatives

**Files:**
- Modify: `src/plugin.svelte` (CSS section)
- Modify: `src/components/SettingsPanel.svelte` (CSS section)
- Modify: `src/components/ConditionsModal.svelte` (CSS section)

**Context:** Hover states don't work on touch devices. We need to add :active and :focus states that provide visual feedback on tap.

**Step 1: Update plugin.svelte interactive element styles**

Find and update these CSS rules to include :active and :focus alongside :hover:

```css
/* Tabs */
.tab {
    /* existing styles */

    &:hover,
    &:active {
        background: rgba(255, 255, 255, 0.1);
    }

    &:focus {
        outline: 2px solid #4a90d9;
        outline-offset: -2px;
    }

    &.active {
        background: rgba(255, 255, 255, 0.15);
        border-bottom-color: #3498db;
    }
}

/* Plan name (editable) */
.plan-name {
    /* existing styles */

    &:hover,
    &:active,
    &:focus-within {
        background: rgba(255, 255, 255, 0.1);
    }
}

/* Drop zone */
.drop-zone {
    /* existing styles */

    &:hover,
    &:active,
    &:focus-within {
        border-color: rgba(255, 255, 255, 0.5);
    }
}

/* Waypoint rows */
.waypoint-row {
    /* existing styles */

    &:hover,
    &:active {
        background: rgba(255, 255, 255, 0.05);
    }
}

/* VFR window items */
.window-item {
    /* existing styles */

    &:hover,
    &:active {
        background: rgba(255, 255, 255, 0.1);
    }
}
```

**Step 2: Update SettingsPanel.svelte styles**

```css
.setting-checkbox {
    /* existing styles */

    &:hover,
    &:active {
        background: rgba(255, 255, 255, 0.05);
    }
}

.customize-btn {
    /* existing styles */
    min-height: 44px;

    &:hover,
    &:active {
        background: #444;
        color: #fff;
    }

    &:focus {
        outline: 2px solid #4a90d9;
        outline-offset: 2px;
    }
}

select {
    /* existing styles */
    min-height: 44px;

    &:focus {
        outline: none;
        border-color: #4a90d9;
    }
}
```

**Step 3: Update ConditionsModal.svelte styles**

```css
.section-header {
    /* existing styles */
    min-height: 44px;

    &:hover,
    &:active {
        background: #2a2a2a;
    }

    &:focus {
        outline: 2px solid #4a90d9;
        outline-offset: -2px;
    }
}

.btn {
    /* existing styles */
    min-height: 44px;

    &:active:not(:disabled) {
        transform: scale(0.98);
    }

    &:focus:not(:disabled) {
        outline: 2px solid #4a90d9;
        outline-offset: 2px;
    }
}

input[type="number"] {
    /* existing styles */
    min-height: 44px;

    &:focus {
        outline: none;
        border-color: #4a90d9;
    }
}
```

**Step 4: Build and test**

Run: `npm run build`
Expected: Build succeeds

Manual test: Verify tapping elements shows visual feedback in mobile emulator.

**Step 5: Commit**

```bash
git add src/plugin.svelte src/components/SettingsPanel.svelte src/components/ConditionsModal.svelte
git commit -m "feat(mobile): add :active and :focus states as hover alternatives

- Add :active states alongside :hover for touch feedback
- Add :focus states for keyboard/accessibility
- Ensure minimum 44px height on interactive inputs
- Add transform feedback on button press

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Task 7: Migrate Session Storage to @windy/store

**Files:**
- Modify: `src/plugin.svelte:2815-2875` (saveSession/loadSession functions)

**Context:** localStorage may have issues on mobile (sandboxing, private browsing). Windy recommends using @windy/store for cloud sync compatibility. We'll add a hybrid approach that tries @windy/store first with localStorage fallback.

**Step 1: Create storage utility functions**

Add near the top of the script section (after imports):

```typescript
// Storage keys
const STORAGE_KEY = 'vfr-planner-session';
const WINDY_STORE_KEY = 'plugin-vfr-planner-session';

// Storage utilities for mobile compatibility
async function saveToWindyStore(data: object): Promise<boolean> {
    try {
        // @windy/store may support persistent storage in future
        // For now, we save to both for redundancy
        store.set(WINDY_STORE_KEY as any, JSON.stringify(data));
        return true;
    } catch (e) {
        console.warn('Windy store save failed:', e);
        return false;
    }
}

function loadFromWindyStore(): object | null {
    try {
        const data = store.get(WINDY_STORE_KEY as any);
        if (data && typeof data === 'string') {
            return JSON.parse(data);
        }
    } catch (e) {
        console.warn('Windy store load failed:', e);
    }
    return null;
}

function saveToLocalStorage(data: object): boolean {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        return true;
    } catch (e) {
        console.warn('localStorage save failed:', e);
        return false;
    }
}

function loadFromLocalStorage(): object | null {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
            return JSON.parse(saved);
        }
    } catch (e) {
        console.warn('localStorage load failed:', e);
    }
    return null;
}
```

**Step 2: Update saveSession to use hybrid storage**

```typescript
function saveSession() {
    const sessionData = {
        flightPlan,
        settings,
        floatingMode,
        floatingPosition,
        floatingSize,
        minimized,
        maxProfileAltitude,
        timestamp: Date.now()
    };

    // Save to both storage systems for maximum compatibility
    saveToWindyStore(sessionData);
    saveToLocalStorage(sessionData);
}
```

**Step 3: Update loadSession to try both storage systems**

```typescript
function loadSession() {
    // Try Windy store first (better for mobile/cloud sync)
    let sessionData = loadFromWindyStore();

    // Fall back to localStorage
    if (!sessionData) {
        sessionData = loadFromLocalStorage();
    }

    if (sessionData && typeof sessionData === 'object') {
        const data = sessionData as any;

        // Restore state with validation
        if (data.flightPlan) {
            flightPlan = data.flightPlan;
        }
        if (data.settings) {
            settings = { ...DEFAULT_SETTINGS, ...data.settings };
        }
        if (typeof data.floatingMode === 'boolean') {
            floatingMode = data.floatingMode;
        }
        if (data.floatingPosition) {
            floatingPosition = data.floatingPosition;
        }
        if (data.floatingSize) {
            floatingSize = data.floatingSize;
        }
        if (typeof data.minimized === 'boolean') {
            minimized = data.minimized;
        }
        if (typeof data.maxProfileAltitude === 'number') {
            maxProfileAltitude = data.maxProfileAltitude;
        }
    }
}
```

**Step 4: Update clearSession**

```typescript
function clearSession() {
    try {
        store.set(WINDY_STORE_KEY as any, null);
    } catch (e) {
        // Ignore
    }
    try {
        localStorage.removeItem(STORAGE_KEY);
    } catch (e) {
        // Ignore
    }
}
```

**Step 5: Build and test**

Run: `npm run build`
Expected: Build succeeds

Manual test: Change settings, reload page, verify settings persist.

**Step 6: Commit**

```bash
git add src/plugin.svelte
git commit -m "feat(mobile): add hybrid storage with @windy/store and localStorage

- Add saveToWindyStore/loadFromWindyStore utilities
- Save to both storage systems for redundancy
- Load from Windy store first, fall back to localStorage
- Improves compatibility with mobile sandboxing and cloud sync

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Task 8: Document External API Dependencies

**Files:**
- Create: `docs/EXTERNAL_APIS.md`

**Context:** For the Windy mobile app vetting process, we need to document all external API calls explaining why they're needed.

**Step 1: Create API documentation**

```markdown
# External API Dependencies

This document lists all external APIs used by the VFR Flight Planner plugin, as required for the Windy mobile app vetting process.

## APIs Used

### 1. Open-Meteo Elevation API

**URL:** `https://api.open-meteo.com/v1/elevation`

**Purpose:** Fetch terrain elevation data for flight path profile visualization.

**Why Required:**
- VFR flight planning requires terrain awareness
- Elevation data is used to calculate terrain clearance along the route
- Enables the altitude profile chart showing terrain vs flight altitude

**Data Sent:** Latitude/longitude coordinates (no personal data)

**Authentication:** None required (public API)

**File:** `src/services/elevationService.ts`

---

### 2. AirportDB API

**URL:** `https://airportdb.io/api/v1/airport/{icao}`

**Purpose:** Look up airport information by ICAO code.

**Why Required:**
- Allows users to search airports by ICAO code
- Provides airport coordinates, elevation, runways, and frequencies
- Essential for flight plan waypoint lookup

**Data Sent:** ICAO airport code (no personal data)

**Authentication:** API key (user-provided, stored locally)

**File:** `src/services/airportdbService.ts`

---

### 3. OpenAIP API (Optional)

**URL:** `https://api.core.openaip.net/api`

**Purpose:** Look up navigation aids, airports, and airspace data.

**Why Required:**
- Alternative/supplement to AirportDB
- Provides VOR/NDB/waypoint information
- Access to airspace boundaries

**Data Sent:** Search coordinates and queries (no personal data)

**Authentication:** API key (user-provided, stored locally)

**File:** `src/services/openaipService.ts`

---

### 4. Windy Internal APIs

**URL:** Various `@windy/*` module calls

**Purpose:** Weather forecast data, map tiles, application state.

**Why Required:**
- Core functionality depends on Windy weather data
- Point forecasts for flight route
- Meteogram data for VFR window search

**Note:** These are internal Windy APIs, not external third-party calls.

---

## Security Considerations

1. **HTTPS Only:** All external API calls use HTTPS
2. **No eval():** No dynamic code execution
3. **No innerHTML:** All content rendered via Svelte templates
4. **API Keys:** Stored locally, never transmitted to our servers
5. **No Tracking:** No analytics or user tracking implemented
6. **No Personal Data:** Only geographic coordinates are sent to APIs

## CORS Compliance

All APIs have been verified to support CORS for browser-based requests.
```

**Step 2: Commit**

```bash
git add docs/EXTERNAL_APIS.md
git commit -m "docs: add external API documentation for mobile vetting

- Document Open-Meteo, AirportDB, and OpenAIP API usage
- Explain purpose and data sent for each API
- Include security considerations section
- Required for Windy mobile app approval process

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Task 9: Add Mobile-Specific Meta and Viewport Handling

**Files:**
- Modify: `src/plugin.svelte` (add mobile detection and adjustments)

**Context:** Add runtime detection of mobile environment and apply appropriate adjustments.

**Step 1: Add mobile detection utility**

Add to the script section:

```typescript
// Mobile detection
const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
const isMobileViewport = window.innerWidth < 768;

// Reactive mobile state
let isMobile = isTouchDevice || isMobileViewport;

// Update on resize
function handleWindowResize() {
    isMobile = isTouchDevice || window.innerWidth < 768;
}
```

**Step 2: Add resize listener in onMount**

```typescript
onMount(async () => {
    // Existing onMount code...

    // Mobile detection
    window.addEventListener('resize', handleWindowResize);

    return () => {
        window.removeEventListener('resize', handleWindowResize);
        // Other cleanup...
    };
});
```

**Step 3: Add mobile-specific class to container**

Update the main container in the template:

```svelte
<div
    class="vfr-planner"
    class:floating-mode={floatingMode}
    class:minimized={minimized}
    class:mobile={isMobile}
    class:dragging={isDragging}
    class:resizing={isResizing}
>
```

**Step 4: Add mobile-specific CSS adjustments**

```css
/* Mobile-specific adjustments */
.vfr-planner.mobile {
    /* Disable floating mode on mobile - use full pane instead */
    &.floating-mode {
        position: relative !important;
        width: 100% !important;
        height: auto !important;
        min-height: 100%;
    }

    /* Hide resize handles on mobile */
    .resize-handle {
        display: none;
    }

    /* Larger touch targets */
    .tab {
        min-height: 48px;
        font-size: 15px;
    }

    /* Simplified waypoint list */
    .waypoint-row {
        padding: 12px;
    }

    /* Stack buttons vertically on narrow screens */
    .button-row {
        flex-direction: column;
        gap: 8px;

        button {
            width: 100%;
        }
    }
}
```

**Step 5: Build and test**

Run: `npm run build`
Expected: Build succeeds

Manual test: Resize browser to mobile width, verify mobile styles apply.

**Step 6: Commit**

```bash
git add src/plugin.svelte
git commit -m "feat(mobile): add mobile detection and responsive adjustments

- Add isTouchDevice and isMobileViewport detection
- Add .mobile class to container for mobile-specific styles
- Disable floating mode resize handles on mobile
- Increase touch targets and stack buttons on narrow screens

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Task 10: Final Integration Test and Version Bump

**Files:**
- Modify: `package.json`
- Modify: `src/pluginConfig.ts`

**Step 1: Run all tests**

Run: `npm test`
Expected: All tests pass

**Step 2: Build**

Run: `npm run build`
Expected: Build succeeds

**Step 3: Bump version to 0.9.7**

Update `package.json`:
```json
"version": "0.9.7",
```

Update `src/pluginConfig.ts`:
```typescript
version: '0.9.7',
```

**Step 4: Manual testing checklist**

- [ ] Open plugin in desktop browser
- [ ] Open Chrome DevTools, enable mobile emulation (iPhone 12)
- [ ] Verify tabs are tappable
- [ ] Verify buttons have adequate size
- [ ] Verify floating window drag works (if not in mobile mode)
- [ ] Verify settings panel controls are tappable
- [ ] Verify ConditionsModal opens and inputs are usable
- [ ] Verify session persists after reload

**Step 5: Final commit**

```bash
git add package.json src/pluginConfig.ts
git commit -m "chore: bump version to 0.9.7 for mobile support release

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Summary

This plan implements the key mobile readiness requirements:

| Requirement | Task |
|-------------|------|
| Touch event support | Tasks 1, 2 |
| 44x44px touch targets | Tasks 3, 4, 5 |
| Hover alternatives | Task 6 |
| Cloud sync storage | Task 7 |
| API documentation | Task 8 |
| Mobile detection | Task 9 |
| Version bump | Task 10 |

**Not Changed (Already Compliant):**
- Leaflet constructor syntax (already using `new L.Marker()`)
- Windy CSS classes (already using `plugin__*`)
- HTML5 input types (already using proper types)
- Security (no eval/innerHTML issues)
