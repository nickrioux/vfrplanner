/**
 * Map interaction helpers for E2E tests
 */

import { type Page } from '@playwright/test';

/**
 * Click on the map at a specific lat/lon coordinate.
 * Uses Windy's map API to convert lat/lon to pixel coordinates.
 */
export async function clickMapAtCoords(
    page: Page,
    lat: number,
    lon: number,
): Promise<void> {
    const point = await page.evaluate(
        ([lat, lon]) => {
            const map = (window.W.map as any).map || window.W.map;
            const latlng = (window as any).L.latLng(lat, lon);
            const pixel = map.latLngToContainerPoint(latlng);
            return { x: pixel.x, y: pixel.y };
        },
        [lat, lon],
    );

    const mapContainer = page.locator('#map-container');
    const box = await mapContainer.boundingBox();
    if (!box) throw new Error('Map container not found');

    await page.mouse.click(box.x + point.x, box.y + point.y);
}

/**
 * Pan the map to center on a lat/lon coordinate
 */
export async function panMapTo(page: Page, lat: number, lon: number, zoom?: number): Promise<void> {
    await page.evaluate(
        ([lat, lon, zoom]) => {
            const map = (window.W.map as any).map || window.W.map;
            if (zoom) {
                map.setView([lat, lon], zoom);
            } else {
                map.panTo([lat, lon]);
            }
        },
        [lat, lon, zoom ?? null],
    );
    // Wait for map tiles to settle
    await page.waitForTimeout(1000);
}

/**
 * Get the current map center coordinates
 */
export async function getMapCenter(page: Page): Promise<{ lat: number; lon: number }> {
    return page.evaluate(() => {
        const map = (window.W.map as any).map || window.W.map;
        const center = map.getCenter();
        return { lat: center.lat, lon: center.lng };
    });
}

/**
 * Get the current map zoom level
 */
export async function getMapZoom(page: Page): Promise<number> {
    return page.evaluate(() => {
        const map = (window.W.map as any).map || window.W.map;
        return map.getZoom();
    });
}

/**
 * Check if route polylines are visible on the map
 */
export async function hasRouteOnMap(page: Page): Promise<boolean> {
    return page.evaluate(() => {
        const map = (window.W.map as any).map || window.W.map;
        let hasPolyline = false;
        map.eachLayer((layer: any) => {
            if (layer instanceof (window as any).L.Polyline && !(layer instanceof (window as any).L.Polygon)) {
                hasPolyline = true;
            }
        });
        return hasPolyline;
    });
}

/**
 * Count the number of markers on the map
 */
export async function getMarkerCount(page: Page): Promise<number> {
    return page.evaluate(() => {
        const map = (window.W.map as any).map || window.W.map;
        let count = 0;
        map.eachLayer((layer: any) => {
            if (layer instanceof (window as any).L.Marker) {
                count++;
            }
        });
        return count;
    });
}

/**
 * Take a screenshot of the map area only
 */
export async function screenshotMap(page: Page, name: string): Promise<Buffer> {
    const mapContainer = page.locator('#map-container');
    return mapContainer.screenshot({ path: `test-results/screenshots/${name}.png` });
}

/**
 * Check if the Windy overlay is set to a specific layer
 */
export async function getWindyOverlay(page: Page): Promise<string> {
    return page.evaluate(() => {
        return window.W.store.get('overlay') as string;
    });
}

/**
 * Set the Windy overlay layer
 */
export async function setWindyOverlay(page: Page, overlay: string): Promise<void> {
    await page.evaluate((overlay) => {
        window.W.store.set('overlay', overlay);
    }, overlay);
}
