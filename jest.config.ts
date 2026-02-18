import type { Config } from 'jest'

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['./src/test/setup.ts'],
  moduleNameMapper: {
    '@tarojs/taro': '<rootDir>/src/__mocks__/taro.ts',
    '@tarojs/components': '<rootDir>/src/__mocks__/components.tsx',
    '\\.(scss|css|sass)$': '<rootDir>/src/__mocks__/style.ts',
    '\\.(png|jpg|jpeg|gif|svg)$': '<rootDir>/src/__mocks__/file.ts',
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', {
      tsconfig: {
        jsx: 'react-jsx',
        esModuleInterop: true,
        allowSyntheticDefaultImports: true,
        strictNullChecks: true,
        noUnusedLocals: false,
        noUnusedParameters: false,
      },
    }],
  },
  globals: {
    API_BASE: 'http://localhost:8900',
  },
  coverageThreshold: {
    global: {
      lines: 50,
    },
  },
  testMatch: ['**/src/__tests__/**/*.test.(ts|tsx)'],
  coveragePathIgnorePatterns: [
    '/node_modules/',
    'src/app.ts',
    'src/app.config.ts',
    'src/__mocks__/',
    'src/test/',
  ],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/app.ts',
    '!src/app.config.ts',
    '!src/__mocks__/**',
    '!src/test/**',
  ],
}

export default config
