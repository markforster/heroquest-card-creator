## HeroQuest Card Creator

HeroQuest Card Creator is a modern, browser‑based tool that lets you design HeroQuest‑style cards (heroes, monsters, treasure, backs, etc.), preview them in high(ish) fidelity, and export print‑ready PNGs – all client‑side, with no server or account.

The app is built with Next.js 14 (App Router), React 18 and TypeScript, and is designed from the ground up to ship as a static bundle that you can drop into any folder on a server or even open directly from the filesystem.

Key features:

- SVG preview + per-card PNG export (fonts/images inlined).
- Asset library (IndexedDB-backed) for uploading/using images.
- Saved cards (“Stockpile”), including collections + bulk export to a ZIP.
- Full backup import/export (`.hqcc`) of cards/assets (and related settings).

---

## Project shape

The app is intentionally a **single‑page editor**:

- `src/app/page.tsx` – the only page; wires together:
  - LeftNav actions (Cards / Assets / Settings / Help).
  - Central card preview (`CardPreviewContainer`).
  - Right‑hand inspector (`CardInspector`).
  - Tools toolbar for preview renderer controls (SVG/WebGL).
  - Modals for templates, assets, and saved cards.
- `src/app/layout.tsx` – root layout, global fonts and CSS, and the i18n provider.
- `src/app/page.module.css` – main layout and theme styling for the editor.
- `src/app/globals.css` / `src/variables.css` – shared theme tokens, fonts, and Bootstrap overrides.
- `src/app/robots.ts`, `src/app/sitemap.ts` – metadata routes, driven by `NEXT_PUBLIC_SITE_URL`.

Core feature areas:

- `src/components/CardPreview` – SVG card preview and PNG export (including font + image inlining).
- `src/components/BlueprintRenderer` – blueprint-driven renderer (single preview path).
- `src/components/CardParts/*` – reusable SVG parts (ribbons, stats blocks, text blocks, etc.).
- `src/components/CardInspector/*` – form controls for editing current card fields.
- `src/components/Assets/*` – asset manager (IndexedDB‑backed image library).
- `src/components/Stockpile/*` – “Cards” modal for browsing and loading saved cards.
- `src/components/CardEditor/CardEditorContext.tsx` – central editor state, drafts, and active card tracking.
- `src/data/card-templates.ts` / `src/types/*` – template metadata and shared type definitions.
- `src/lib/*` – browser‑side helpers:
  - `cards-db.ts` / `hqcc-db.ts` – IndexedDB wrapper for saved cards.
  - `assets-db.ts` – assets store (consolidated into the shared `hqcc` DB).
  - `backup.ts` – full import/export for cards/assets/settings (`.hqcc`).
  - `card-record-mapper.ts` – mapping between editor data and `CardRecord`s.

### Blueprint rendering (developer notes)
The preview renderer uses **blueprints** as the single source of truth for card layout. Each template defines layout bounds and layers in blueprint data, and the `BlueprintRenderer` maps card data onto those layers.

To tinker:
- Start at `src/components/BlueprintRenderer/index.tsx` to see how layers are interpreted.
- Blueprint definitions live in `src/data/blueprints.ts` (and related files). Update bounds, fonts, and layer config there.
- Shared SVG parts (ribbons, stats blocks, text blocks) are in `src/components/CardParts/*`.

This means adding or adjusting a template is primarily a **data change** (blueprint tweaks), not a new bespoke React template component.

---

## Static single‑page build (important)

This project is configured to always emit a **fully static** build that can be opened from anywhere:

- `next.config.mjs`:
  - `output: "export"` – Next.js generates static HTML/JS/CSS into `out/`.
  - `assetPrefix: "./"` – assets are loaded relative to the current page, so the bundle works under any subfolder.
  - `trailingSlash: true` – output uses directory-style routes (e.g. `out/some-page/index.html`).
  - `images.unoptimized: true` – disables the Next image optimizer so images are just plain files.
- `src/app/layout.tsx` inlines `@font-face` rules with **relative** font URLs (e.g. `./fonts/Carter Sans W01 Regular.ttf`).
- `src/components/CardPreview` embeds fonts and images into the exported PNG so exports are self‑contained.

What this means in practice:

- After `npm run build`, the **only** thing you need to deploy is the `out/` folder.
- You can:
  - Serve `out/` from any path on a web server (e.g. `/tools/card-maker/`).
  - Or open `out/index.html` directly via `file://` in a browser.
- No Node server or runtime is required once built.

The only place `NEXT_PUBLIC_SITE_URL` matters is for `robots.ts` and `sitemap.ts` (to generate absolute URLs). It does **not** affect how the static bundle runs.

If you need a fixed `basePath`/`assetPrefix` for a specific deployment target, see `static.next.config.mjs`.

---

## Running locally

Prerequisites: Node 18+ and npm.

- Install dependencies:
  - `npm install`
- Start dev server:
  - `npm run dev`
  - Open `http://localhost:3000`

The dev server behaves like a normal Next.js SPA, but all logic still runs on the client.

---

## Building & using the static output

- Production build (static export):
  - `npm run build`
  - Output is written to `out/`.
- Optional: generate a downloadable zip bundle:
  - `npm run build:download`
  - Writes `artefacts/heroquest-card-maker.<version>.zip` (requires a `zip` binary).
- To preview locally, you can:
  - Serve `out/` with any static file server, or
  - Open `out/index.html` directly in a modern browser (Chrome is the primary target).

Because fonts and assets are referenced relatively and IndexedDB/localStorage are used in the browser, the editor will work the same whether it’s hosted at `/`, `/some/sub/path`, or opened from the filesystem.

---

## Optional: Tauri desktop build

This repo includes a thin Tauri wrapper so you can ship a native desktop app around the static build.

Setup notes:

- Tauri uses the static Next.js export (`out/`) as its frontend bundle.
- App icons are generated from `public/assets/web-app-manifest-512x512.png` via the Tauri icon generator.
- You’ll need a Rust toolchain installed to build desktop bundles.

Build flow:

- `npm run tauri:icons` – generate native icons into `src-tauri/icons/`.
- `npm run tauri:build` – build the static export and bundle the desktop app.

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

- `npm run generate:embedded-assets` – generate embedded asset manifests (run automatically on install/build/dev).
- `npm run dev` – start local dev server.
- `npm run build` – static production build into `out/`.
- `npm run build:download` – build + package `out/` as a downloadable zip bundle in `artefacts/`.
- `npm run serve:out` – serve `out/` locally for quick testing.
- `npm run tauri:icons` – generate native app icons from `public/assets/web-app-manifest-512x512.png`.
- `npm run tauri:build` – build the static export and bundle the Tauri desktop app.
- `npm run start` – start Next server (not used for static hosting).
- `npm run lint` – run ESLint.
- `npm run typecheck` – TypeScript type checking.
- `npm run test` / `test:*` – Jest test commands (see `jest.config.js`).
- `npm run format` / `format:check` – Prettier formatting.

### Testing

- Run the full Jest suite:
  - `npm run test`
- Generate coverage:
  - `npm run test:coverage`
- Generate the HTML test report (includes coverage):
  - `npm run test:report`
  - Report is written to `artefacts/reports/test-report.html`

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
- `NEXT_PUBLIC_GTM_ID`
  - Optional Google Tag Manager id (enables GTM in `src/app/layout.tsx`).

The core editor itself does **not** depend on any backend credentials or secret env vars.

---

## Data storage & browser support

- Cards and assets are stored client‑side:
  - `cards` and `assets` live in a shared `hqcc` IndexedDB database.
  - Drafts, selected template, and language live in `localStorage` under `hqcc.*` keys.
- No user accounts, authentication, or server‑side persistence.
- Target environment:
  - Desktop Chrome is the primary dev/test browser.
  - Recent Safari and Firefox should work, though some minor layout quirks are possible.
  - Mobile is not currently a focus.

---

## Contributing / tinkering

The codebase is deliberately small and component‑driven. If you’re exploring or extending it, good starting points are:

- `src/app/page.tsx` – top‑level wiring of the editor UI.
- `src/components/BlueprintRenderer` and `src/components/CardParts/*` – how the SVG cards are built.

Prettier + ESLint are configured; running `npm run lint` and `npm run format` before committing will keep things consistent.

If you intend to contribute, please work on a fork and ensure `npm run test` (and ideally `npm run typecheck`) pass before opening a pull request — PRs with failing tests will be refused.
