// Mock for @windy/store
export default {
    get: jest.fn().mockReturnValue('ecmwf'),
    set: jest.fn(),
};
