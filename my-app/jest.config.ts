import type { Config } from 'jest';
import { pathsToModuleNameMapper } from 'ts-jest';
import { compilerOptions } from './tsconfig.json';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'jest-environment-jsdom',
  // Correct pattern for matching test files
  testMatch: [
    '**/__tests__/**/*.(spec|test).(ts|tsx)',
    '**/__test__/**/*.(spec|test).(ts|tsx)',
    '**/src/**/*.(spec|test).(ts|tsx)',
  ],
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', {
      tsconfig: 'tsconfig.json',
    }],
  },
  moduleNameMapper: {
    // Fix the CSS module regex pattern
    "\\.(css|less|scss|sass)$": "identity-obj-proxy",
    // Image files
    "\\.(jpg|jpeg|png|gif|webp|svg)$": "<rootDir>/__mocks__/fileMock.js",
    
    // Use path mappings from tsconfig
    '@/(.*)': '<rootDir>/src/$1',
  },
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  testPathIgnorePatterns: ['/node_modules/', '/.next/'],
  verbose: true,
};

export default config;