## HeroQuest Card Creator

HeroQuest Card Creator is a modern, browser‑based tool that lets you design HeroQuest‑style cards (heroes, monsters, treasure, backs, etc.), preview them in high(ish) fidelity, and export print‑ready PNGs – all client‑side, with no server or account.

The app is built with Next.js 14 (App Router), React 18 and TypeScript, and is designed from the ground up to ship as a static bundle that you can drop into any folder on a server or even open directly from the filesystem.

---

## Project shape

The app is intentionally a **single‑page editor**:

- `src/app/page.tsx` – the only page; wires together:
  - Header actions (Template / Assets / Cards / Help).
  - Central card preview (`CardPreviewContainer`).
  - Right‑hand inspector (`CardInspector`).
  - Modals for templates, assets, and saved cards.
- `src/app/layout.tsx` – root layout, global fonts and CSS, and the i18n provider.
- `src/app/page.module.css` – main layout and theme styling for the editor.
- `src/app/globals.css` / `src/variables.css` – shared theme tokens, fonts, and Bootstrap overrides.
- `src/app/robots.ts`, `src/app/sitemap.ts` – metadata routes, driven by `NEXT_PUBLIC_SITE_URL`.

Core feature areas:

- `src/components/CardPreview` – SVG card preview and PNG export (including font + image inlining).
- `src/components/CardTemplates/*` – one React component per card template.
- `src/components/CardParts/*` – reusable SVG parts (ribbons, stats blocks, text blocks, etc.).
- `src/components/CardInspector/*` – form controls for editing current card fields.
- `src/components/Assets/*` – asset manager (IndexedDB‑backed image library).
- `src/components/Stockpile/*` – “Cards” modal for browsing and loading saved cards.
- `src/components/CardEditor/CardEditorContext.tsx` – central editor state, drafts, and active card tracking.
- `src/data/card-templates.ts` / `src/types/*` – template metadata and shared type definitions.
- `src/lib/*` – browser‑side helpers:
  - `cards-db.ts` / `hqcc-db.ts` – IndexedDB wrapper for saved cards.
  - `assets-db.ts` – assets store (consolidated into the shared `hqcc` DB).
  - `card-record-mapper.ts` – mapping between editor data and `CardRecord`s.

Docs for internals and roadmap live under `docs/` (e.g. `progress.v1.md`, `card-stockpile.v1.md`, `user-experience.md`).

---

## Static single‑page build (important)

This project is configured to always emit a **fully static** build that can be opened from anywhere:

- `next.config.mjs`:
  - `output: "export"` – Next.js generates static HTML/JS/CSS into `out/`.
  - `assetPrefix: "./"` – assets are loaded relative to the current page, so the bundle works under any subfolder.
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
- To preview locally, you can:
  - Serve `out/` with any static file server, or
  - Open `out/index.html` directly in a modern browser (Chrome is the primary target).

Because fonts and assets are referenced relatively and IndexedDB/localStorage are used in the browser, the editor will work the same whether it’s hosted at `/`, `/some/sub/path`, or opened from the filesystem.

---

## Scripts

- `npm run dev` – start local dev server.
- `npm run build` – static production build into `out/`.
- `npm run start` – start Next server (mainly useful before the static export setup; not needed for static hosting).
- `npm run lint` – run ESLint.
- `npm run typecheck` – TypeScript type checking.
- `npm run test` / `test:*` – Jest test commands (see `jest.config.js`).
- `npm run format` / `format:check` – Prettier formatting.

### Testing

- Run the full Jest suite:
  - `npm run test`
- Generate coverage:
  - `npm run test:coverage`
  - Output is written to `artefacts/coverage/`
- Generate the HTML test report (includes coverage):
  - `npm run test:report`
  - Report is written to `artefacts/reports/test-report.html`

---

## Environment variables

- `NEXT_PUBLIC_SITE_URL`
  - Used only by `robots.ts` and `sitemap.ts` to generate absolute URLs.
  - Local example: set in `.env.local` to `http://localhost:3000`.
  - Production: set to your public site URL (e.g. `https://cards.example.com`).
  - As with any `NEXT_PUBLIC_*` var, do not put secrets here.

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
- `src/components/CardTemplates/*` and `src/components/CardParts/*` – how the SVG cards are built.

Prettier + ESLint are configured; running `npm run lint` and `npm run format` before committing will keep things consistent.

If you intend to contribute, please work on a fork and ensure `npm run test` (and ideally `npm run typecheck`) pass before opening a pull request — PRs with failing tests will be refused.
