// Mock for @turf/turf
// Simplified implementations for testing purposes

export function point(coordinates: number[]): { type: string; geometry: { type: string; coordinates: number[] } } {
    return {
        type: 'Feature',
        geometry: {
            type: 'Point',
            coordinates,
        },
    };
}

export function bearing(
    from: { geometry: { coordinates: number[] } },
    to: { geometry: { coordinates: number[] } }
): number {
    const [lon1, lat1] = from.geometry.coordinates;
    const [lon2, lat2] = to.geometry.coordinates;

    const dLon = (lon2 - lon1) * Math.PI / 180;
    const lat1Rad = lat1 * Math.PI / 180;
    const lat2Rad = lat2 * Math.PI / 180;

    const y = Math.sin(dLon) * Math.cos(lat2Rad);
    const x = Math.cos(lat1Rad) * Math.sin(lat2Rad) -
              Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLon);

    const brng = Math.atan2(y, x) * 180 / Math.PI;
    return (brng + 360) % 360;
}

export function distance(
    from: { geometry: { coordinates: number[] } },
    to: { geometry: { coordinates: number[] } },
    options?: { units?: string }
): number {
    const [lon1, lat1] = from.geometry.coordinates;
    const [lon2, lat2] = to.geometry.coordinates;

    const R = options?.units === 'nauticalmiles' ? 3440.065 : 6371; // Earth radius in NM or km
    const lat1Rad = lat1 * Math.PI / 180;
    const lat2Rad = lat2 * Math.PI / 180;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1Rad) * Math.cos(lat2Rad) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
}
