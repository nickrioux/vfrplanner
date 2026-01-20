/**
 * API Adapters Barrel Export
 * Centralized exports for all API adapter implementations
 */

// Types
export * from './types';

// Base adapter
export { HttpApiAdapter } from './HttpApiAdapter';

// Specific adapters
export {
    AirportDbAdapter,
    type AirportDbAirport,
    type AirportDbRunway,
    type AirportDbFrequency,
    type AirportDbNavaid,
    type NormalizedAirport,
    type NormalizedRunway,
    type NormalizedFrequency,
} from './AirportDbAdapter';

export {
    OpenAipAdapter,
    type OpenAipAirport,
    type OpenAipRunway,
    type OpenAipFrequency,
    type OpenAipNavaid,
    type AirportSearchOptions,
    type NavaidSearchOptions,
    AIRPORT_TYPES,
    NAVAID_TYPES,
    FREQUENCY_TYPES,
} from './OpenAipAdapter';

export {
    ElevationAdapter,
    type Coordinate,
    type ElevationPoint,
    type BatchElevationResponse,
} from './ElevationAdapter';
