// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck
const nextJest = require("next/jest");

const createJestConfig = nextJest({
  dir: "./",
});

/** @type {import('jest').Config} */
const customJestConfig = {
  testEnvironment: "jest-environment-jsdom",
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
  watchman: false,
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
    "\\.(svg)$": "<rootDir>/__mocks__/svgrMock.tsx",
    "^next/link$": "<rootDir>/__mocks__/nextLinkMock.tsx",
  },
  coverageDirectory: "<rootDir>/artefacts/coverage",
  collectCoverageFrom: [
    "src/**/*.{ts,tsx}",
    "!src/generated/**/*",
    "!src/**/__tests__/**/*",
    "!src/**/index.ts",
    "!**/*.d.ts",
  ],
  coveragePathIgnorePatterns: [
    "/node_modules/",
    "<rootDir>/src/data/.*",
    "<rootDir>/src/generated/.*",
    "<rootDir>/next.config.mjs",
    "<rootDir>/custom.d.ts",
    "<rootDir>/src/app/page.tsx",
    "<rootDir>/src/app/layout.tsx",
    "<rootDir>/src/components/AvatarStripe/consts.tsx",
  ],
  coverageReporters: ["text", "text-summary", "lcov", "html"],
};

module.exports = createJestConfig(customJestConfig);
