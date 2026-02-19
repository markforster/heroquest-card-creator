# HeroQuest Card Creator

Create HeroQuest‑style cards (heroes, monsters, treasure, backs, and more) in your browser, preview them live, and export print‑ready PNGs — no server, no account, all client‑side.

## Highlights

- SVG preview with high‑fidelity layout.
- Export print‑ready PNGs with fonts and images embedded.
- Asset library for uploading and reusing images.
- Saved cards (“Stockpile”) with collections and bulk export.
- Full backup import/export (`.hqcc`) for cards and assets.

## Install

```bash
npm i -g heroquest-card-creator
```

## Run

Start the app (defaults to `http://127.0.0.1:3000`):

```bash
heroquest-card-creator
```

Use a specific port:

```bash
heroquest-card-creator -p 4000
```

## Port behavior & storage

- If no port is supplied, the app tries port `3000` first.
- If `3000` is busy, it auto‑selects a free port.
- Recent ports are stored in `~/.hqcc/info.yml` and the CLI may prompt you to reuse them.
- Browser storage is tied to the origin (host + port). If you run on a new port, you won’t see libraries created on other ports.

## Data & backups

Your cards and assets are stored locally in your browser (IndexedDB + localStorage).

You can export a full backup (`.hqcc`) from the app to move or restore your library.
