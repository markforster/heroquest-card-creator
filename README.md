<a href="https://mark-forster.itch.io/heroquest-card-creator" target="_blank"><img src="https://public.markforster.info/Heroquest/Tools/HeroQuest-Card-Creator-Banner-shorter.png"/></a>

## HeroQuest Card Creator

HeroQuest Card Creator is a browser-based tool for creating, organising, and exporting authentic-looking HeroQuest-style cards and decks. It runs entirely in your browser, with no account, no server-side storage, and no backend required.

You can create cards from built-in HeroQuest-style templates, manage artwork in a local asset library, organise cards into collections and decks, preview cards as SVG, and export your work as individual PNGs, bulk PNG downloads, or print-ready PDFs.

The app is built with Next.js, React, and TypeScript, and is designed to ship as a fully static browser application. It can be hosted on a static web server, installed through the npm CLI package, downloaded as a local bundle, or opened directly from the filesystem.

Key features:

- HeroQuest-style templates for heroes, monsters, treasure, rules, card backs, and custom project backs.
- SVG-based live preview with direct artwork positioning on supported card elements.
- Single-card PNG export, bulk PNG export, and print-ready PDF export.
- Export profiles for reusable print/export settings, including bleed, crop marks, cut marks, rounded corners, and PDF layout defaults.
- Local asset library for uploaded artwork, logos, and card images.
- Stockpile view for browsing, searching, filtering, pairing, and recovering saved cards.
- Collections and Decks for organising larger projects and playable card sets.
- Full `.hqcc` backup import/export for moving or protecting local libraries.
- Settings for export profiles, appearance, stat labels, copyright defaults, assets, and library management.
- Built-in Help Centre, FAQs, troubleshooting guides, and offline help for downloaded builds.

**Itch.io**

- Play in your browser: [https://mark-forster.itch.io/heroquest-card-creator](https://mark-forster.itch.io/heroquest-card-creator)
- Download: [Download](https://mark-forster.itch.io/heroquest-card-creator/purchase)
- Rate the app: [Rate](https://mark-forster.itch.io/heroquest-card-creator/rate?source=github)
- Community and updates: [https://mark-forster.itch.io/heroquest-card-creator/community](https://mark-forster.itch.io/heroquest-card-creator/community)

---

## Project shape

HeroQuest Card Creator is a static browser app with route-owned workspaces and a shared application shell. The app still ships as a single static bundle, but the codebase is now organised around feature areas rather than one large page component.

High-level structure:

- `src/app/*` – Next.js app entrypoints, global layout, fonts, metadata routes, and the main static shell.
- `src/components/App/*` – app-level page/workspace composition.
- `src/components/Layout/*` – shared shell UI such as navigation and header areas.
- `src/components/Cards/*` – card editor, inspector, preview, card parts, and card-specific editing workflows.
- `src/components/Assets/*` – asset library UI, asset inspection, replacement, classification, and related modals.
- `src/components/Stockpile/*` – saved-card browsing, search, filtering, grouping, pairing, and recovery workflows.
- `src/components/Decks/*` – deck grid, deck detail, grouped sets, deck entries, deck preview, and deck export workflows.
- `src/components/Export/*` – PNG/PDF export UI and export workflow controls.
- `src/components/Modals/*` – reusable and feature-specific modal flows, including Settings, Help, release notes, confirmations, and import/export prompts.
- `src/components/common/*` – shared controls and UI primitives used across features.
- `src/components/Providers/*` – shared React providers for app-wide behaviour.
- `src/api/*` – local API contracts and client hooks used by the app.
- `src/lib/*` – browser-side domain logic, rendering/export helpers, backup/import/export logic, storage helpers, and feature utilities.
- `src/lib/data/*` – data services for cards, assets, settings, decks, collections, pairs, export profiles, and related library state.
- `src/lib/db/*` – Dexie database ownership, schema declarations, migrations, startup jobs, and maintenance helpers.
- `src/data/card-systems/*` – card system definitions, template metadata, inspector fields, and blueprint data.
- `src/types/*` – shared TypeScript contracts for cards, blueprints, storage records, templates, decks, and UI state.
- `src/i18n/*` – localisation runtime, supported language metadata, and locale JSON files.
- `help-site/docs/*` – authored public Help Centre content.
- `docs/*` – requirements, specifications, release notes, project policy, and planning documents.

The main architectural split is:

- React components own UI and interaction.
- Blueprint data owns card layout and template structure.
- The renderer turns blueprint layers plus card data into SVG output.
- Export workflows reuse the same SVG/rendering foundations where possible.
- Local API and data-service layers sit between UI workflows and browser storage.
- Dexie owns the browser database schema, migrations, and startup maintenance.

This keeps most feature work inside the relevant workspace or domain folder while allowing shared rendering, persistence, modal, and UI behaviour to stay reusable.

### Blueprint rendering

Card layout is primarily blueprint-driven. Each card system defines templates, inspector fields, and SVG layer data under `src/data/card-systems/*`.

For the current HeroQuest 2021 card system, the main entry points are:

- `src/data/card-systems/hq/2021/card-templates/*` – template registration and metadata shown to users, such as template id, kind, description, thumbnail, background, and default face.
- `src/data/card-systems/hq/2021/inspector-fields/*` – inspector field definitions for each template, including field type, label, binding key, toolbar options, and per-field behaviour.
- `src/data/card-systems/hq/2021/blueprints/*` – authored card layout, layer bounds, grouping, bindings, visibility rules, and render configuration.
- `src/components/BlueprintRenderer/*` – interpretation of blueprint layers into SVG.
- `src/components/Cards/CardParts/*` – reusable SVG card pieces such as ribbons, stats, text, and artwork layers.

The template metadata, inspector fields, and blueprint usually move together. A template defines what the card is, the inspector config defines which form controls edit it, and the blueprint defines how those values are rendered.

Blueprint layers select reusable render components by type, then use bounds, bindings, conditions, and `props` to adapt those components for a specific card template. For example, the same image, title, tint, copyright, text, or stats renderer can be reused across multiple templates while each blueprint controls placement, sizing, defaults, visibility, and optional editor capabilities.

Some blueprint properties also act as feature switches for the editor. A layer can opt into behaviours such as background tinting, title typography defaults, or adjustable artwork clipping without requiring every template to support the same controls.

Adding or adjusting a template is usually a combination of template metadata, inspector-field data, blueprint data, and shared renderer/card-part behaviour. Avoid adding bespoke template components unless the existing blueprint/rendering model cannot reasonably express the card.

### Card data and persistence

Saved cards are stored in a normalized browser database rather than as one large flat card object.

At a high level, each saved card has:

- a base card record for identity, template, face, status, name, timestamps, and library-level metadata
- slot links that connect blueprint slots to saved component records
- component records for editable areas such as background, title, text, copyright, images, icons, logos, and stats
- thumbnail records for saved-card previews

This mirrors the blueprint model. A blueprint defines the slots that make up a card, and the normalized card records store data against those slots. That keeps saved data closer to the rendered structure of the card and makes it easier to evolve individual components without continuing to grow one large card record forever.

The main files are:

- `src/types/cards-normalized.ts` – normalized card record types.
- `src/lib/data/cards-normalized.ts` – migration, assembly, and normalized-card helpers.
- `src/lib/card-record-mapper.ts` – mapping between editor data and saved card records.
- `src/lib/db/hqcc-dexie.ts` – Dexie database schema, versions, stores, and migration wiring.
- `src/lib/data/*` – data services for cards, assets, settings, collections, pairs, decks, export profiles, and library reset behaviour.

The app still assembles card data into the editor-friendly shape used by the UI, but persistence is structured around card identity plus component records. This is the model to follow when adding new editable card features.

### Local API boundary

Although the app currently stores data locally in the browser, UI and feature code should treat data access as API-shaped.

The app uses a layered model:

- React features call API clients and hooks.
- API contracts live under `src/api/*`.
- Zodios and Axios provide the client/request shape.
- In local mode, request plugins under `src/api/local/*` intercept those API calls and forward them to browser-backed data services.
- Data services under `src/lib/data/*` own domain operations.
- Dexie/database lifecycle code stays under `src/lib/db/*`.

This is intentional. It keeps IndexedDB and Dexie details out of feature components, gives the app a single data-access contract, and preserves a path toward future remote or third-party-backed services without rewriting every UI workflow.

In practice, feature code should usually depend on the API layer rather than importing database or data-service modules directly. Local request handlers can call the data services, but app components should send intent through the same API-shaped boundary used by the rest of the application.

The main files are:

- `src/api/*/api.ts` – Zodios endpoint declarations.
- `src/api/*/schema.ts` – request and response validation schemas.
- `src/api/*/types.ts` – API-facing TypeScript types.
- `src/api/client.ts` – API client setup, local/remote mode selection, and local request plugin registration.
- `src/api/hooks.ts` – shared React Query/Zodios hook setup.
- `src/api/local/*Request.ts` – local request handlers that satisfy API calls using browser-backed services.
- `src/lib/data/*` – domain data services used behind the API boundary.
- `src/lib/db/*` – Dexie schema, migrations, startup jobs, and maintenance helpers.

When adding new persisted workflows, prefer extending the API contract first, then implement the local request handler behind it. Avoid calling Dexie or data services directly from `src/app`, `src/components`, or general UI hooks unless there is a deliberate database-ownership exception.

---

## Internationalisation

The app supports multiple languages through `react-i18next` and JSON locale files.

Locale source files live under `src/i18n/locales/<locale>/` and are split by namespace:

- `common.json` – general app UI, settings, modals, editor labels, and shared copy.
- `decks.json` – Decks-specific UI.
- `formattingHelp.json` – formatting and rich-text help copy.
- `templates.json` – template names and template-specific labels.

The runtime wiring lives in:

- `src/i18n/resources.ts` – imports the locale JSON files and groups them by namespace.
- `src/i18n/messages.ts` – defines supported languages, visible languages, typed message keys, and flattened message bundles.
- `src/i18n/I18nProvider.tsx` – initialises `react-i18next`, stores the selected language, and exposes `useI18n()`.

When adding user-facing strings, prefer adding an English key first, then keep the other locale files in sync. Missing keys can be seeded into non-English locale files with English fallback values, then translated later.

Useful i18n maintenance scripts:

- `npm run i18n:sync-raw-keys` – inserts missing English keys into other locale JSON files.
- `npm run i18n:check-raw` – checks raw locale JSON files for missing, extra, and untranslated keys.
- `npm run i18n:audit` – audits the compiled message bundles.
- `npm run i18n:remediation-report` – generates a Markdown worklist for untranslated or missing locale entries.

Run the i18n checks whenever adding or changing user-facing copy.

---

## Static single‑page build (important)

This project is configured to always emit a **fully static** build that can be opened from anywhere:

- `next.config.mjs`:
  - `output: "export"` – Next.js generates static HTML/JS/CSS into `out/`.
  - `assetPrefix: "./"` – assets are loaded relative to the current page, so the bundle works under any subfolder.
  - `trailingSlash: true` – output uses directory-style routes (e.g. `out/some-page/index.html`).
  - `images.unoptimized: true` – disables the Next image optimizer so images are just plain files.
- `src/app/layout.tsx` inlines `@font-face` rules with **relative** font URLs (e.g. `./fonts/Carter Sans W04 Regular.ttf`).
- `src/components/CardPreview` embeds fonts and images into the exported PNG so exports are self‑contained.

What this means in practice:

- After `npm run build`, the **only** thing you need to deploy is the `out/` folder.
- You can:
  - Serve `out/` from any path on a web server (e.g. `/tools/card-maker/`).
  - Or open `out/index.html` directly via `file://` in a browser.
- Note: Firefox `file://` requires a small URL shim (included) to avoid `URL constructor: null` errors.
- No Node server or runtime is required once built.

The only place `NEXT_PUBLIC_SITE_URL` matters is for `robots.ts` and `sitemap.ts` (to generate absolute URLs). It does **not** affect how the static bundle runs.

If you need a fixed `basePath`/`assetPrefix` for a specific deployment target, see `static.next.config.mjs`.

---

## Running locally

Prerequisites: Node 18+ and npm.

Recommended for heavy build and typecheck tasks:

- Prefer Node `20.x` or `18.x`.
- The repo scripts now add a larger V8 heap automatically for production builds and TypeScript checks.
- If you still hit memory pressure under a newer Node release such as `22.x`, switch back to Node `20.x` or `18.x` before investigating app-level causes.

- Install dependencies:
  - `npm install`
- Start dev server:
  - `npm run dev`
  - Open `http://localhost:3000`

The dev server behaves like a normal Next.js SPA, but all logic still runs on the client.

---

## Analytics (file:// fallback)

The app uses GA4 when available, but also supports a **pixel fallback** for `file://` usage or when `gtag` is unavailable.

Set these env vars before building:

- `NEXT_PUBLIC_GA_ID` – GA4 Measurement ID (existing behavior).
- `NEXT_PUBLIC_PIXEL_URL` – Pixel endpoint (e.g. `http://localhost:3001/p.gif`).
- `NEXT_PUBLIC_PIXEL_KEY` – Optional shared key, if your pixel server expects `k=...`.

When the app is opened via `file://`, analytics events are sent via an image request to the pixel endpoint.

---

## Building & using the static output

- Production build (static export):
  - `npm run build`
  - Output is written to `out/`.
- Optional: generate a downloadable zip bundle for end users:
  - `npm run build:download`
  - Writes `artefacts/heroquest-card-maker.<version>.zip` (requires a `zip` binary).
  - Contains the static site plus helper files (miniserve binaries, launcher scripts, and `README.pdf`) so users can double-click and run locally without extra setup.
- Optional: generate a clean hosted web archive:
  - `npm run build:itch`
  - Writes `artefacts/heroquest-card-maker.<version>.itch.zip`.
  - Contains **only** the `out/` folder contents for lightweight static hosting.
- To preview locally, you can:
  - Serve `out/` with any static file server, or
  - Open `out/index.html` directly in a modern browser (Chrome is the primary target).

Because fonts and assets are referenced relatively, the editor can run whether it’s hosted at `/`, `/some/sub/path`, or opened from the filesystem. Browser storage is still scoped to the browser and location used to open the app, so each hosted URL, local port, or downloaded file location can have its own separate library.

---

## CLI module (npm)

You can run the static build from a simple local server via the published CLI package:

- Install globally:
- `npm i -g @markforster/heroquest-card-creator`
- Run (default `http://127.0.0.1:3000`):
  - `heroquest-card-creator`
- Run on another port:
  - `heroquest-card-creator -p 4000`

Notes:

- The CLI serves the bundled static `out/` content included in the npm package.
- Your cards and assets are stored in the browser via IndexedDB/localStorage.
- Browser storage is tied to the origin (host + port). If you run on a new port, you won’t see libraries from other ports.
- Port behavior:
  - If no port is supplied, the CLI tries 3000 first.
  - If 3000 is busy, it auto-selects a free port.
  - It stores recent ports in `~/.hqcc/info.yml` and may prompt you to reuse them.

## Optional: Tauri desktop build

This repo includes a thin Tauri wrapper for experimental/local desktop packaging around the static build.

Setup notes:

- Tauri uses the static Next.js export (`out/`) as its frontend bundle.
- App icons are generated from `public/assets/web-app-manifest-512x512.png` via the Tauri icon generator.
- You’ll need a Rust toolchain installed to build desktop bundles.

Build flow:

- `npm run tauri:icons` – generate native icons into `src-tauri/icons/`.
- `npm run tauri:build` – build the static export and bundle the desktop app.

macOS install note (unsigned builds):

- Local Tauri builds are unsigned unless you notarize them with an Apple Developer ID. When users download the DMG, macOS Gatekeeper will report the app as “damaged” and block it.
- To install anyway, drag the app to `/Applications`, then right-click the app and choose `Open` (you may need to confirm in System Settings > Privacy & Security).
- If Gatekeeper still blocks the app, remove the quarantine flag:
  - `xattr -dr com.apple.quarantine /Applications/heroquest-card-creator.app`
- If you are technical and want to give it a go, you can build the app yourself on your machine; the web `index.html` works in any browser, and the native app is just a wrapper that makes it look installed.

Docs:

- Tauri distribute/build guide. https://v2.tauri.app/
- Plugin docs (used by this project):
  - Opener (open paths / reveal in file explorer).
  - File system (read/write files).
  - Dialog (open/save dialogs).

Platform prerequisites (local builds):

- macOS: Xcode Command Line Tools (`xcode-select --install`).
- Windows: Microsoft Visual Studio C++ Build Tools.
- Linux: distro build dependencies (GTK/WebKit libs; varies by distro).

Build on your own OS:

- `npm run build` (generates `out/` for the Tauri frontend bundle).
- `npx tauri build` (bundles a native installer for the host OS).

Outputs are written under `src-tauri/target/release/bundle/`.

---

## Scripts

The project has a fairly large script surface because it supports local development, static builds, downloadable bundles, help-site generation, i18n maintenance, tests, and release packaging.

The commands used most often during normal development are:

- `npm run dev` - start the local Next.js development server.
- `npm run test` - run the Jest test suite.
- `npm run typecheck` - type-check the application code.
- `npm run lint:changed` - lint files changed in the current branch.
- `npm run format:changed` - format files changed in the current branch.
- `npm run help:validate` - validate authored help-site content.

### Local development

- `npm run dev` starts the development server on port `3000`.
- `npm run start` starts a production Next.js server after a build.
- `npm run serve:out` serves the static `out/` directory for checking exported builds.
- `npm run pages:preview-root` creates a preview root for static page-output checks.
- `npm run generate:embedded-assets` rebuilds the generated embedded-asset module used by renderer and export paths.

The `predev` and `prebuild` lifecycle scripts regenerate embedded assets and copy worker files automatically, so they normally do not need to be run by hand.

### Builds and distribution

- `npm run build` runs the production build after checking required environment configuration.
- `npm run build:download` creates the downloadable app bundle, including the local static-file server helper.
- `npm run build:itch` creates the smaller hosted web archive used for the web distribution build.
- `npm run download:miniserve` downloads the bundled local server binary used by the downloadable build.
- `npm run verify:env` checks build-time environment requirements.
- `npm run verify:out` checks that the exported static output contains the expected files.

There are also package-publishing scripts such as `publish:npm`, `publish:gh`, and `publish:all`. These are release-maintainer commands rather than day-to-day development commands.

### Tests and type checking

- `npm run test` runs Jest once.
- `npm run test:watch` runs Jest in watch mode.
- `npm run test:coverage` runs Jest with coverage output.
- `npm run test:report` creates the HTML coverage report in `artefacts/reports/test-report.html`.
- `npm run typecheck` checks the app TypeScript project.
- `npm run typecheck:tests` checks the test TypeScript project.
- `npm run typecheck:all` runs both type-checking passes.
- `npm run typecheck:watch` and `npm run typecheck:tests:watch` run the same checks in watch mode.

### Linting, formatting, and code audits

- `npm run lint` runs ESLint across source, scripts, and configuration files.
- `npm run lint:fix` runs ESLint with automatic fixes.
- `npm run lint:changed` and `npm run lint:changed:fix` scope ESLint to changed files.
- `npm run format` formats the configured source and script files.
- `npm run format:check` checks formatting without writing changes.
- `npm run format:changed` and `npm run format:changed:check` scope Prettier to changed files.
- `npm run fallow:dead-code`, `npm run fallow:audit`, `npm run fallow:changed`, and `npm run fallow:ci` support dead-code and dependency-surface audits.
- `npm run dup:report` and `npm run dup:idents` help identify duplication.

### Internationalisation

- `npm run i18n:sync-raw-keys` keeps locale JSON files aligned with the English source keys.
- `npm run i18n:check-raw` checks raw locale files for missing or inconsistent keys.
- `npm run i18n:audit` runs the broader i18n audit.
- `npm run i18n:remediation-report` generates a Markdown worklist for untranslated or missing locale entries.

### Help site and generated documentation

- `npm run help:setup` installs or prepares help-site tooling.
- `npm run help:validate` validates authored help documentation.
- `npm run help:build` builds the help site.
- `npm run help:preview` serves the help site locally.
- `npm run api:openapi` generates the OpenAPI description from the local API contracts.
- `npm run api:reference` aliases the OpenAPI generation command.
- `npm run docs:data-service` generates data-service API documentation.
- `npm run graph:data-service` and `npm run graph:app` generate dependency graphs for architecture review.

### Desktop build

- `npm run tauri` runs the Tauri CLI.
- `npm run sync:tauri-version` syncs the Tauri app version from the package metadata.
- `npm run tauri:icons` regenerates desktop app icons.
- `npm run tauri:build` builds the desktop wrapper after building the web app.

---

## Environment variables

- `NEXT_PUBLIC_SITE_URL`
  - Used only by `robots.ts` and `sitemap.ts` to generate absolute URLs.
  - For `npm run build`, this must be set to a **non-localhost** URL (enforced by `scripts/verify-env.js`).
    - Recommended: set it in `.env.production` (and keep `.env.local` for dev).
    - Example: `NEXT_PUBLIC_SITE_URL=https://cards.example.com npm run build`
  - Dev example: set in `.env.local` to `http://localhost:3000` (or omit it entirely).
  - Production: set to your public site URL (e.g. `https://cards.example.com`).
  - As with any `NEXT_PUBLIC_*` var, do not put secrets here.
- `NEXT_PUBLIC_GA_ID`
  - Optional GA4 Measurement ID (enables analytics in `src/app/layout.tsx`).

The core editor itself does **not** depend on any backend credentials or secret env vars.

---

## Data storage & browser support

HeroQuest Card Creator stores your library locally in the browser. There is no account, login, backend database, or server-side copy of your cards.

Saved cards, assets, decks, collections, pairings, thumbnails, and related library records live in the browser database for the place where the app is opened. Smaller preference values, such as selected language and some UI state, are stored alongside that in browser storage.

That has a few practical consequences:

- A library created in Chrome is separate from one created in Firefox or Safari.
- A library created on itch.io is separate from one created from a downloaded `index.html` file.
- A library created on `localhost` during development is separate from one created on the public app URL.
- Clearing browser site data can remove the local library.
- Moving work between browsers, machines, or app locations should be done with `.hqcc` export/import.

The app includes full library export/import so users can back up their work and move it between environments. Regular exports are the safest way to protect a library, especially if it contains many uploaded images.

Target environment:

- Desktop Chrome is the primary dev/test browser.
- Recent Firefox, Safari, and Edge should work, but browser storage behaviour and minor layout details can vary.
- Mobile browsers are not currently a focus.

---

## Contributing and tinkering

HeroQuest Card Creator is open source, and you are welcome to explore the code, fork the project, adapt it, or use it as a starting point for your own experiments.

This is also a personal hobby project with a fairly specific product direction. I am happy to look at focused pull requests, bug fixes, documentation improvements, and changes that fit naturally with the existing architecture, but I may not always be able to accept larger changes or changes that move the app in a different direction.

If you want to contribute, the best approach is:

- Open an issue first for larger changes, so the idea can be discussed before you spend too much time on it.
- Keep pull requests focused and reasonably small.
- Follow the existing project structure and patterns where possible.
- Make sure the relevant checks pass before opening a pull request.

Useful checks before submitting changes:

- `npm run test`
- `npm run typecheck`
- `npm run typecheck:tests` when changing tests or test utilities
- `npm run lint:changed`
- `npm run format:changed`

The codebase has grown quite a bit, so good starting points are:

- `src/data/card-systems/*` for templates, blueprints, and inspector definitions.
- `src/components/BlueprintRenderer/*` and `src/components/Cards/CardParts/*` for card rendering.
- `src/components/App/*`, `src/components/Stockpile/*`, `src/components/Assets/*`, and `src/components/Decks/*` for the main workspaces.
- `src/api/*`, `src/lib/data/*`, and `src/lib/db/*` for API-shaped data access and browser persistence.

Forks and personal modifications are very welcome. Pull requests are welcome too, but acceptance will depend on whether the change fits the direction of the app and can be maintained alongside the rest of the project.
