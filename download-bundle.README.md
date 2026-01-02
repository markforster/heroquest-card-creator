# HeroQuest Card Creator – Downloaded Bundle

Thanks for downloading the HeroQuest Card Creator bundle.

This folder contains a **fully static build** of the app. You can use it in two main ways:

---

## Option 1 – Open directly from your filesystem

1. Extract the `.zip` file somewhere on your computer.
2. Inside the extracted folder, find and open the `index.html` file in your browser:
   - On most systems you can double‑click `index.html`, or
   - Right‑click it and choose “Open With…” then your preferred browser.

The app should load and work entirely offline, as long as your browser allows local file access for this kind of app.

---

## Option 2 – Serve from a simple HTTP server

If you’re comfortable running a small web server, you’ll get the most reliable behaviour by serving the folder over HTTP:

1. Extract the `.zip` file somewhere on your machine or server.
2. Point any static file server at that folder. For example:
   - Using `npx serve`:
     - Open a terminal in the extracted folder.
     - Run: `npx serve .`
     - Open the URL shown in the terminal (e.g. `http://localhost:3000`).
   - Or use any other static hosting (nginx, Apache, Netlify, GitHub Pages, etc.).

Because the app is built as a **single‑page, static site** with relative asset paths, you can host it from **any folder or URL path**, not just the web root.

---

## Data & storage

- The app stores your cards and image assets in your browser using IndexedDB and localStorage.
- This means:
  - Your data stays on the machine and browser where you use the app.
  - If you open the bundle on a different machine or browser, it will start with a fresh, empty library.

---

## Updates

If you download a newer version of the bundle in future:

1. Extract it into a **new folder** (or replace the old one entirely).
2. Open the new folder’s `index.html` or re‑point your HTTP server to the new folder.

Existing data in your browser will usually remain available, as it is keyed by the app’s origin (file location or server URL).

