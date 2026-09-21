# Structured-list working data

`structured-lists.json` is the shared baseline and acceptance corpus for issue #186.
It feeds the existing-markup Jest tests and the local browser capture runner.
Production list support is tested through the same input data.

- `text` is the exact input, including spaces, tabs and backslashes. Do not trim it.
- `baselineLines` contains visible-text expectations for selected existing markup cases.
- `visualChecks` records the historical pre-implementation appearance.
- `futureChecks` records the adopted list acceptance checks for visual review.
- `expectedMarkers` is the complete marker sequence, asserted by the layout tests and by unclipped UI captures.

The 18 cases cover existing emphasis/HTML-like tags, headings, scale, alignment,
leaders and dice; proposed bullets, numbering, nesting, wrapping and resets;
invalid/escaped markers and whitespace; mixed rich text; backdrop separators;
and fitting/clipping stress. The implementation follows the adopted requirements.

## Run the baseline tests

From the repository root:

```sh
npm test -- --runInBand src/components/Cards/CardParts/__tests__/bodyText/structuredListsBaseline.test.ts
```

These seven checks use the public layout API with deterministic text measurement
and real dice tokenization. They do not replace browser visual review or exhaust
the existing parser's edge cases.

## Capture the real UI

Start the local app with `npm run dev`, unless it is already running. The runner
requires an available Playwright module and its Chromium browser. It does not
install dependencies or change package files. Set `HQCC_PLAYWRIGHT_MODULE` to an
absolute module path if Playwright is supplied by the agent runtime rather than
the project. Otherwise it resolves `playwright` normally.

```sh
node scripts/qa/structured-lists-ui.cjs --cases all --template Rules --fit off
node scripts/qa/structured-lists-ui.cjs --cases overflow-stress --template "Small Artwork" --fit off
node scripts/qa/structured-lists-ui.cjs --cases overflow-stress --template "Small Artwork" --fit on
node scripts/qa/structured-lists-ui.cjs --cases mixed-rich-lists --template "Hero Card" --fit off
```

Optional arguments: `--url http://127.0.0.1:3000`, `--cases id1,id2`, `--export on`
(download an actual PNG), `--help on` (capture inline help), `--backdrop-fit on`,
`--background /absolute/path/to/test-image.png` (upload into the isolated profile), and
`--output /absolute/path/outside/repository`. A unique output directory is created
each time; the default is the OS temporary directory. Use a durable external
directory for evidence you want to keep.

Each case gets a fresh browser context. The runner creates a new card through
the UI, sets fit mode, fills the description, checks exact input preservation,
waits for fonts and a stable preview, then captures:

- Preview-stage and workspace PNG screenshots.
- Exact plain-text input for manual paste, SVG DOM snapshot and accessibility text.
- A manifest with environment, branch/commit, clipping status, expectations,
  runtime errors, warnings and failed network URLs.

The preview stage may include surrounding editor edges. The SVG snapshot does
not embed fonts/assets and is not a standalone export. Browser contexts are
discarded; the user's normal browser cards and preferences are untouched.
Only localhost entry URLs are accepted, but the app can still make its normal
external requests. No external requests are blocked or mocked by this runner.

`capturePassed` means evidence was captured, **not** that appearance was accepted.
Review the images against each case's checks and record findings. The runner
exits nonzero on marker mismatches or capture/runtime errors. A known existing `data-theme,style`
hydration warning is retained separately; other console errors are not ignored.
Network failures are recorded separately for diagnosis.

## Manual review and later acceptance

Paste the generated `.txt` into the selected template's description. Use that
file especially for whitespace cases; copying JSON source would copy escape
characters rather than the intended input.

Review marker count and numbering, nesting, hanging wraps, paragraph transitions,
colours/emphasis/dice, row spacing, final-line visibility and clipping warnings.
Before implementation, literal prefixes and absent hanging indents are expected.
Rerun identical inputs and inspect the adopted checks in `futureChecks`. Do not approve output
by blindly updating snapshots.

The runner supports Monster, Labelled Back/backdrop modes, PNG export and help.
Deck PDF, thumbnails and persistence require additional UI steps. See the release planning document
`docs/2026 - 0.8.3/structured-lists.test-plan.v1.md` for the baseline evidence and
the boundary between prepared data and completed validation.
