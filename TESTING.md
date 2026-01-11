# Testing

This repo uses Jest (via `next/jest`) and Testing Library. The goal is to increase confidence without changing app behaviour.

## Principles

- Prefer tests over refactors: avoid changing production code unless it is strictly required to make it testable, and keep any such changes behaviour-preserving.
- Test through the public surface area where possible; only export internal helpers when there’s no reasonable way to cover the behaviour via existing exports.
- Start with deterministic “pure” modules (helpers/mappers/normalizers) before moving to React providers/components and IndexedDB.
- Avoid snapshot-heavy tests; assert behaviour/outputs instead.
- Be mindful of coverage noise: TypeScript can make some branches unreachable, and generated/data-heavy modules can skew coverage without adding confidence.

## Test Organisation (preferred)

When a file contains multiple functions, create **one test file per function**.

Pattern:

- `src/<area>/__tests__/<module>/<functionName>.test.ts`
- For React: `src/<area>/__tests__/<module>/<functionName>.test.tsx`

Example:

- `src/lib/asset-filename.ts` → `src/lib/__tests__/asset-filename/splitFilename.test.ts`

## UI / UX Tests

UI-focused tests (presence of UI elements, user interactions, “UAT-style” assertions) live in:

- `src/__tests__/UI/**`

These tests can (and often will) cover components too, but with a different purpose than function-level tests.

## Environments

- Default Jest environment is `jsdom` (see `jest.config.js`).
- For code paths that depend on `window` being absent, create a dedicated node test with:
  - `/** @jest-environment node */`
- Some browser APIs may be missing in jsdom (e.g. `URL.revokeObjectURL`). It’s acceptable to polyfill in a test via `Object.defineProperty` and restore the original descriptor in `afterEach`.

## Running Tests

- Single test file: `npm test -- <name-or-path>`
- Coverage: `npm run test:coverage`
- Coverage report: `npm run test:report` (writes HTML to `artefacts/reports/test-report.html`)
- If there are temporarily no tests in a scope but you want coverage output anyway: `npx jest --coverage --passWithNoTests`

## Coverage Hygiene (const-only files)

For “constants only” modules that intentionally contain no logic:

- Prefer excluding by pattern in `jest.config.js` (best when there are many files following a convention).
- Otherwise, for one-offs, add `/* istanbul ignore file */` at the top of the file.

## Coverage Hygiene (unreachable branches)

Sometimes a branch is “unreachable” in TypeScript but still exists at runtime (e.g. `default` cases for exhaustive unions, defensive checks). If coverage flags these:

- Prefer adding a small “runtime safety” test that triggers the branch via a cast, rather than changing production logic just to satisfy coverage.

## Generated Code

Generated output (e.g. `src/generated/**`) should not count toward coverage:

- Exclude via `jest.config.js` patterns (preferred).
- Avoid adding `/* istanbul ignore file */` inside generated files since it will be overwritten on regeneration.

## Typecheck Stability

Keep `npm run typecheck` green while testing:

- Avoid `for..of` iteration over typed arrays (`Uint8Array`, `Uint32Array`) in production code unless TS `target`/`downlevelIteration` guarantees iterator support; use index-based loops to be safe.
