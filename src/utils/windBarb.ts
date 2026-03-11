/**
 * Aviation wind barb SVG path generation utilities.
 *
 * Wind barbs follow standard meteorological conventions:
 * - Staff points in the direction wind comes FROM
 * - Long barb = 10 knots, short barb = 5 knots, pennant (triangle) = 50 knots
 * - Calm wind (< 3 kt) produces no barb
 */

export interface WindBarbResult {
    staff: string;
    barbs: Array<{ path: string; type: string }>;
}

/**
 * Generate an aviation wind barb symbol as SVG paths.
 * @param x - Center X position
 * @param y - Center Y position (top of flight path marker)
 * @param windDir - Wind direction in degrees (where wind comes FROM)
 * @param windSpeed - Wind speed in knots
 * @returns SVG staff path and barb paths with their types
 */
export function generateWindBarb(x: number, y: number, windDir: number, windSpeed: number): WindBarbResult {
    const staffLength = 30;
    const barbLength = 10;
    const shortBarbLength = 5;
    const triangleSize = 8;

    // Convert wind direction to radians (wind comes FROM this direction)
    const angle = (windDir - 90) * Math.PI / 180; // -90 to adjust for SVG coordinate system

    // Calculate staff end point
    const staffEndX = x + Math.cos(angle) * staffLength;
    const staffEndY = y + Math.sin(angle) * staffLength;

    // Staff line
    const staff = `M ${x},${y} L ${staffEndX},${staffEndY}`;

    // Calculate barbs (perpendicular to staff, on the right side)
    const barbs: Array<{ path: string; type: string }> = [];
    let remainingSpeed = Math.round(windSpeed);
    let barbPosition = 0;
    const barbSpacing = 6;

    // Add 50-knot pennants (triangles)
    while (remainingSpeed >= 50) {
        const posX = x + Math.cos(angle) * (staffLength - barbPosition);
        const posY = y + Math.sin(angle) * (staffLength - barbPosition);

        // Triangle vertices
        const perpAngle = angle + Math.PI / 2; // Perpendicular to staff
        const tip1X = posX + Math.cos(perpAngle) * triangleSize;
        const tip1Y = posY + Math.sin(perpAngle) * triangleSize;
        const tip2X = posX + Math.cos(angle) * triangleSize;
        const tip2Y = posY + Math.sin(angle) * triangleSize;

        barbs.push({
            path: `M ${posX},${posY} L ${tip1X},${tip1Y} L ${tip2X},${tip2Y} Z`,
            type: 'triangle'
        });

        remainingSpeed -= 50;
        barbPosition += barbSpacing * 1.5; // Extra space for triangles
    }

    // Add 10-knot barbs (long lines)
    while (remainingSpeed >= 10) {
        const posX = x + Math.cos(angle) * (staffLength - barbPosition);
        const posY = y + Math.sin(angle) * (staffLength - barbPosition);

        const perpAngle = angle + Math.PI / 2;
        const barbEndX = posX + Math.cos(perpAngle) * barbLength;
        const barbEndY = posY + Math.sin(perpAngle) * barbLength;

        barbs.push({
            path: `M ${posX},${posY} L ${barbEndX},${barbEndY}`,
            type: 'long'
        });

        remainingSpeed -= 10;
        barbPosition += barbSpacing;
    }

    // Add 5-knot barbs (short lines)
    if (remainingSpeed >= 5) {
        const posX = x + Math.cos(angle) * (staffLength - barbPosition);
        const posY = y + Math.sin(angle) * (staffLength - barbPosition);

        const perpAngle = angle + Math.PI / 2;
        const barbEndX = posX + Math.cos(perpAngle) * shortBarbLength;
        const barbEndY = posY + Math.sin(perpAngle) * shortBarbLength;

        barbs.push({
            path: `M ${posX},${posY} L ${barbEndX},${barbEndY}`,
            type: 'short'
        });
    }

    // If wind speed is less than 3 knots, just show circle at center
    if (windSpeed < 3) {
        return { staff: '', barbs: [] };
    }

    return { staff, barbs };
}

/**
 * Generate a smaller wind barb for vertical wind display.
 * Same logic as generateWindBarb but with configurable scale factor.
 * @param x - Center X position
 * @param y - Center Y position
 * @param windDir - Wind direction in degrees (where wind comes FROM)
 * @param windSpeed - Wind speed in knots
 * @param scale - Scale factor (default 0.6)
 * @returns SVG staff path and barb paths with their types
 */
export function generateSmallWindBarb(x: number, y: number, windDir: number, windSpeed: number, scale: number = 0.6): WindBarbResult {
    const staffLength = 20 * scale;
    const barbLength = 8 * scale;
    const shortBarbLength = 4 * scale;
    const triangleSize = 6 * scale;

    // Convert wind direction to radians (wind comes FROM this direction)
    const angle = (windDir - 90) * Math.PI / 180;

    // Calculate staff end point
    const staffEndX = x + Math.cos(angle) * staffLength;
    const staffEndY = y + Math.sin(angle) * staffLength;

    // Staff line
    const staff = `M ${x},${y} L ${staffEndX},${staffEndY}`;

    // Calculate barbs
    const barbs: Array<{ path: string; type: string }> = [];
    let remainingSpeed = Math.round(windSpeed);
    let barbPosition = 0;
    const barbSpacing = 4 * scale;

    // Add 50-knot pennants (triangles)
    while (remainingSpeed >= 50) {
        const posX = x + Math.cos(angle) * (staffLength - barbPosition);
        const posY = y + Math.sin(angle) * (staffLength - barbPosition);

        const perpAngle = angle + Math.PI / 2;
        const tip1X = posX + Math.cos(perpAngle) * triangleSize;
        const tip1Y = posY + Math.sin(perpAngle) * triangleSize;
        const tip2X = posX + Math.cos(angle) * triangleSize;
        const tip2Y = posY + Math.sin(angle) * triangleSize;

        barbs.push({
            path: `M ${posX},${posY} L ${tip1X},${tip1Y} L ${tip2X},${tip2Y} Z`,
            type: 'triangle'
        });

        remainingSpeed -= 50;
        barbPosition += barbSpacing * 1.5;
    }

    // Add 10-knot barbs (long lines)
    while (remainingSpeed >= 10) {
        const posX = x + Math.cos(angle) * (staffLength - barbPosition);
        const posY = y + Math.sin(angle) * (staffLength - barbPosition);

        const perpAngle = angle + Math.PI / 2;
        const barbEndX = posX + Math.cos(perpAngle) * barbLength;
        const barbEndY = posY + Math.sin(perpAngle) * barbLength;

        barbs.push({
            path: `M ${posX},${posY} L ${barbEndX},${barbEndY}`,
            type: 'long'
        });

        remainingSpeed -= 10;
        barbPosition += barbSpacing;
    }

    // Add 5-knot barbs (short lines)
    if (remainingSpeed >= 5) {
        const posX = x + Math.cos(angle) * (staffLength - barbPosition);
        const posY = y + Math.sin(angle) * (staffLength - barbPosition);

        const perpAngle = angle + Math.PI / 2;
        const barbEndX = posX + Math.cos(perpAngle) * shortBarbLength;
        const barbEndY = posY + Math.sin(perpAngle) * shortBarbLength;

        barbs.push({
            path: `M ${posX},${posY} L ${barbEndX},${barbEndY}`,
            type: 'short'
        });
    }

    if (windSpeed < 3) {
        return { staff: '', barbs: [] };
    }

    return { staff, barbs };
}
