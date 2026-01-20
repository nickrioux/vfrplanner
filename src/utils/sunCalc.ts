/**
 * Sun Position Calculations
 * Calculates sunrise/sunset times for a given location and date
 * Based on NOAA Solar Calculator algorithms
 */

const DEGREES_TO_RADIANS = Math.PI / 180;
const RADIANS_TO_DEGREES = 180 / Math.PI;

/**
 * Calculate the Julian Day from a JavaScript Date
 */
function dateToJulianDay(date: Date): number {
    const year = date.getUTCFullYear();
    const month = date.getUTCMonth() + 1;
    const day = date.getUTCDate();
    const hour = date.getUTCHours() + date.getUTCMinutes() / 60 + date.getUTCSeconds() / 3600;

    let jd = 367 * year - Math.floor(7 * (year + Math.floor((month + 9) / 12)) / 4) -
        Math.floor(3 * (Math.floor((year + (month - 9) / 7) / 100) + 1) / 4) +
        Math.floor(275 * month / 9) + day + 1721028.5 + hour / 24;

    return jd;
}

/**
 * Calculate the Julian Century from Julian Day
 */
function julianDayToJulianCentury(jd: number): number {
    return (jd - 2451545) / 36525;
}

/**
 * Calculate the geometric mean longitude of the sun (degrees)
 */
function sunGeomMeanLong(t: number): number {
    let l0 = 280.46646 + t * (36000.76983 + 0.0003032 * t);
    while (l0 > 360) l0 -= 360;
    while (l0 < 0) l0 += 360;
    return l0;
}

/**
 * Calculate the geometric mean anomaly of the sun (degrees)
 */
function sunGeomMeanAnomaly(t: number): number {
    return 357.52911 + t * (35999.05029 - 0.0001537 * t);
}

/**
 * Calculate the eccentricity of Earth's orbit
 */
function earthOrbitEccentricity(t: number): number {
    return 0.016708634 - t * (0.000042037 + 0.0000001267 * t);
}

/**
 * Calculate the equation of center for the sun (degrees)
 */
function sunEquationOfCenter(t: number): number {
    const m = sunGeomMeanAnomaly(t);
    const mRad = m * DEGREES_TO_RADIANS;
    const sinM = Math.sin(mRad);
    const sin2M = Math.sin(2 * mRad);
    const sin3M = Math.sin(3 * mRad);

    return sinM * (1.914602 - t * (0.004817 + 0.000014 * t)) +
        sin2M * (0.019993 - 0.000101 * t) +
        sin3M * 0.000289;
}

/**
 * Calculate the sun's true longitude (degrees)
 */
function sunTrueLong(t: number): number {
    return sunGeomMeanLong(t) + sunEquationOfCenter(t);
}

/**
 * Calculate the sun's apparent longitude (degrees)
 */
function sunApparentLong(t: number): number {
    const o = sunTrueLong(t);
    const omega = 125.04 - 1934.136 * t;
    return o - 0.00569 - 0.00478 * Math.sin(omega * DEGREES_TO_RADIANS);
}

/**
 * Calculate the mean obliquity of the ecliptic (degrees)
 */
function meanObliquityOfEcliptic(t: number): number {
    const seconds = 21.448 - t * (46.8150 + t * (0.00059 - t * 0.001813));
    return 23 + (26 + seconds / 60) / 60;
}

/**
 * Calculate the corrected obliquity of the ecliptic (degrees)
 */
function obliquityCorrection(t: number): number {
    const e0 = meanObliquityOfEcliptic(t);
    const omega = 125.04 - 1934.136 * t;
    return e0 + 0.00256 * Math.cos(omega * DEGREES_TO_RADIANS);
}

/**
 * Calculate the sun's declination (degrees)
 */
function sunDeclination(t: number): number {
    const e = obliquityCorrection(t);
    const lambda = sunApparentLong(t);

    const sint = Math.sin(e * DEGREES_TO_RADIANS) * Math.sin(lambda * DEGREES_TO_RADIANS);
    return Math.asin(sint) * RADIANS_TO_DEGREES;
}

/**
 * Calculate the equation of time (minutes)
 */
function equationOfTime(t: number): number {
    const epsilon = obliquityCorrection(t);
    const l0 = sunGeomMeanLong(t);
    const e = earthOrbitEccentricity(t);
    const m = sunGeomMeanAnomaly(t);

    let y = Math.tan(epsilon * DEGREES_TO_RADIANS / 2);
    y *= y;

    const sin2l0 = Math.sin(2 * l0 * DEGREES_TO_RADIANS);
    const sinM = Math.sin(m * DEGREES_TO_RADIANS);
    const cos2l0 = Math.cos(2 * l0 * DEGREES_TO_RADIANS);
    const sin4l0 = Math.sin(4 * l0 * DEGREES_TO_RADIANS);
    const sin2m = Math.sin(2 * m * DEGREES_TO_RADIANS);

    const eqTime = y * sin2l0 - 2 * e * sinM + 4 * e * y * sinM * cos2l0 -
        0.5 * y * y * sin4l0 - 1.25 * e * e * sin2m;

    return eqTime * 4 * RADIANS_TO_DEGREES;
}

/**
 * Calculate the hour angle of sunrise/sunset (degrees)
 * @param lat - Latitude in degrees
 * @param solarDec - Solar declination in degrees
 * @param zenith - Solar zenith angle (default: 90.833 for official sunrise/sunset)
 * @returns Hour angle in degrees, or NaN if sun doesn't rise/set
 */
function hourAngleSunrise(lat: number, solarDec: number, zenith: number = 90.833): number {
    const latRad = lat * DEGREES_TO_RADIANS;
    const sdRad = solarDec * DEGREES_TO_RADIANS;

    const cosHA = (Math.cos(zenith * DEGREES_TO_RADIANS) / (Math.cos(latRad) * Math.cos(sdRad))) -
        Math.tan(latRad) * Math.tan(sdRad);

    if (cosHA > 1 || cosHA < -1) {
        return NaN; // Sun doesn't rise or set on this day
    }

    return Math.acos(cosHA) * RADIANS_TO_DEGREES;
}

/**
 * Calculate sunrise time for a given location and date
 * @param lat - Latitude in degrees
 * @param lon - Longitude in degrees
 * @param date - The date to calculate for
 * @returns Sunrise time as a Date, or null if sun doesn't rise
 */
export function getSunrise(lat: number, lon: number, date: Date): Date | null {
    const jd = dateToJulianDay(date);
    const t = julianDayToJulianCentury(jd);

    const eqTime = equationOfTime(t);
    const solarDec = sunDeclination(t);
    const hourAngle = hourAngleSunrise(lat, solarDec);

    if (isNaN(hourAngle)) {
        return null; // Polar day or polar night
    }

    // Calculate sunrise time in minutes from midnight UTC
    const timeUTC = 720 - 4 * (lon + hourAngle) - eqTime;

    // Create date at midnight UTC and add the calculated minutes
    const sunrise = new Date(date);
    sunrise.setUTCHours(0, 0, 0, 0);
    sunrise.setUTCMinutes(sunrise.getUTCMinutes() + timeUTC);

    return sunrise;
}

/**
 * Calculate sunset time for a given location and date
 * @param lat - Latitude in degrees
 * @param lon - Longitude in degrees
 * @param date - The date to calculate for
 * @returns Sunset time as a Date, or null if sun doesn't set
 */
export function getSunset(lat: number, lon: number, date: Date): Date | null {
    const jd = dateToJulianDay(date);
    const t = julianDayToJulianCentury(jd);

    const eqTime = equationOfTime(t);
    const solarDec = sunDeclination(t);
    const hourAngle = hourAngleSunrise(lat, solarDec);

    if (isNaN(hourAngle)) {
        return null; // Polar day or polar night
    }

    // Calculate sunset time in minutes from midnight UTC
    const timeUTC = 720 - 4 * (lon - hourAngle) - eqTime;

    // Create date at midnight UTC and add the calculated minutes
    const sunset = new Date(date);
    sunset.setUTCHours(0, 0, 0, 0);
    sunset.setUTCMinutes(sunset.getUTCMinutes() + timeUTC);

    return sunset;
}

/**
 * Check if a given timestamp is during daylight hours
 * Uses civil twilight (6 degrees below horizon) for VFR considerations
 * @param timestamp - Timestamp in milliseconds
 * @param lat - Latitude in degrees
 * @param lon - Longitude in degrees
 * @returns true if during daylight, false if during night
 */
export function isDaylight(timestamp: number, lat: number, lon: number): boolean {
    const date = new Date(timestamp);

    const sunrise = getSunrise(lat, lon, date);
    const sunset = getSunset(lat, lon, date);

    // Handle polar regions
    if (sunrise === null || sunset === null) {
        // Check if it's polar day (sun always up) or polar night (sun always down)
        const jd = dateToJulianDay(date);
        const t = julianDayToJulianCentury(jd);
        const solarDec = sunDeclination(t);

        // If latitude and declination have same sign and magnitude is high enough
        // it could be polar day or polar night
        if (lat > 0) {
            // Northern hemisphere
            return solarDec > 0 && Math.abs(lat) + Math.abs(solarDec) > 90;
        } else {
            // Southern hemisphere
            return solarDec < 0 && Math.abs(lat) + Math.abs(solarDec) > 90;
        }
    }

    const time = date.getTime();
    return time >= sunrise.getTime() && time <= sunset.getTime();
}

/**
 * Get sunrise and sunset times for a given date and location
 * @param lat - Latitude in degrees
 * @param lon - Longitude in degrees
 * @param date - The date to calculate for
 * @returns Object with sunrise and sunset times, or null if sun doesn't rise/set
 */
export function getSunTimes(lat: number, lon: number, date: Date): { sunrise: Date; sunset: Date } | null {
    const sunrise = getSunrise(lat, lon, date);
    const sunset = getSunset(lat, lon, date);

    if (sunrise === null || sunset === null) {
        return null;
    }

    return { sunrise, sunset };
}

/**
 * Filter a time range to only include daylight hours
 * @param startTime - Start timestamp in milliseconds
 * @param endTime - End timestamp in milliseconds
 * @param lat - Latitude in degrees
 * @param lon - Longitude in degrees
 * @returns Array of daylight time ranges within the original range
 */
export function filterToDaylightHours(
    startTime: number,
    endTime: number,
    lat: number,
    lon: number
): { start: number; end: number }[] {
    const daylightRanges: { start: number; end: number }[] = [];

    // Iterate through each day in the range
    const startDate = new Date(startTime);
    startDate.setUTCHours(0, 0, 0, 0);

    const endDate = new Date(endTime);
    endDate.setUTCHours(23, 59, 59, 999);

    for (let date = new Date(startDate); date <= endDate; date.setUTCDate(date.getUTCDate() + 1)) {
        const sunTimes = getSunTimes(lat, lon, date);

        if (sunTimes === null) {
            // Polar day - entire day is daylight
            const dayStart = new Date(date);
            dayStart.setUTCHours(0, 0, 0, 0);
            const dayEnd = new Date(date);
            dayEnd.setUTCHours(23, 59, 59, 999);

            // Check if this is polar day (always light) based on declination
            const jd = dateToJulianDay(date);
            const t = julianDayToJulianCentury(jd);
            const solarDec = sunDeclination(t);
            const isPolarDay = (lat > 0 && solarDec > 0) || (lat < 0 && solarDec < 0);

            if (isPolarDay) {
                daylightRanges.push({
                    start: Math.max(startTime, dayStart.getTime()),
                    end: Math.min(endTime, dayEnd.getTime()),
                });
            }
            // If polar night, don't add any range
            continue;
        }

        // Calculate daylight window for this day
        const dayLightStart = Math.max(startTime, sunTimes.sunrise.getTime());
        const dayLightEnd = Math.min(endTime, sunTimes.sunset.getTime());

        // Only add if there's a valid daylight period
        if (dayLightStart < dayLightEnd) {
            daylightRanges.push({
                start: dayLightStart,
                end: dayLightEnd,
            });
        }
    }

    return daylightRanges;
}
