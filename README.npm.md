# HeroQuest Card Creator

![HeroQuest Card Creator](https://public.markforster.info/Heroquest/Tools/HeroQuest-Card-Creator-Banner.jpg)

Create HeroQuest‑style cards (heroes, monsters, treasure, backs, and more) in your browser, preview them live, and export print‑ready PNGs — no server, no account, all client‑side.

Layouts, typography, and proportions are tuned to match the classic cards, so you can focus on ideas instead of fighting fonts and spacing. Pick a template, drop in artwork, tweak framing, write rules text, and export print‑ready PNGs. Everything runs locally in your browser, and you can export a single `.hqcc` backup to move or restore your library.

**Itch.io**

- Play in your browser: [https://mark-forster.itch.io/heroquest-card-creator](https://mark-forster.itch.io/heroquest-card-creator)
- Download: [Download](https://mark-forster.itch.io/heroquest-card-creator/purchase)
- Rate the app: [Rate](https://mark-forster.itch.io/heroquest-card-creator/rate?source=npm)
- Community and updates: [https://mark-forster.itch.io/heroquest-card-creator/community](https://mark-forster.itch.io/heroquest-card-creator/community)

## Highlights

- SVG preview with high‑fidelity layout.
- Export print‑ready PNGs with fonts and images embedded.
- Asset library for uploading and reusing images.
- Saved cards (“Stockpile”) with collections and bulk export.
- Full backup import/export (`.hqcc`) for cards and assets.
- Stockpile panels/table view with Recently Deleted safety.
- Assets inspector with asset kind classification and filtering.
- Missing‑artwork checks before export help avoid bad ZIPs.

## Install

```bash
npm i -g @markforster/heroquest-card-creator
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
