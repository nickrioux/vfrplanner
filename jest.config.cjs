/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    roots: ['<rootDir>/tests'],
    testMatch: ['**/*.test.ts'],
    moduleNameMapper: {
        '^@windy/(.*)$': '<rootDir>/tests/__mocks__/windy/$1',
        '^@turf/turf$': '<rootDir>/tests/__mocks__/@turf/turf',
    },
    collectCoverageFrom: [
        'src/utils/**/*.ts',
        'src/services/navigationCalc.ts',
        'src/services/weatherHelpers.ts',
        'src/services/vfrConditionRules.ts',
        '!src/**/*.d.ts',
    ],
    coverageThreshold: {
        global: {
            branches: 60,
            functions: 70,
            lines: 70,
            statements: 70,
        },
    },
    transform: {
        '^.+\\.ts$': ['ts-jest', {
            tsconfig: {
                module: 'commonjs',
                esModuleInterop: true,
                allowSyntheticDefaultImports: true,
            },
        }],
    },
    moduleFileExtensions: ['ts', 'js', 'json'],
};
