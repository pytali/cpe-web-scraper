import type { Config } from '@jest/types';

const config: Config.InitialOptions = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    moduleNameMapper: {
        '^(\\.{1,2}/.*)\\.js$': '$1',
        '^@/(.*)$': '<rootDir>/src/$1'
    },
    testMatch: [
        '**/__tests__/**/*.test.ts'
    ],
    setupFiles: [
        'dotenv/config',
        '<rootDir>/src/config/__tests__/setup.ts'
    ],
    moduleFileExtensions: ['ts', 'js', 'json', 'node'],
    collectCoverage: true,
    coverageDirectory: 'coverage',
    coverageReporters: ['text', 'lcov'],
    coveragePathIgnorePatterns: [
        '/node_modules/',
        '/dist/',
        '/__tests__/'
    ],
    transform: {
        '^.+\\.ts$': ['ts-jest', {
            useESM: true,
            tsconfig: 'tsconfig.json'
        }]
    },
    extensionsToTreatAsEsm: ['.ts']
}

export default config; 