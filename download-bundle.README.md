# HeroQuest Card Creator {version} – Downloaded Bundle

Thanks for downloading the HeroQuest Card Creator {version} bundle.

This folder contains a **fully static build** of the app. You can use it in two main ways:

If you prefer a printable version of this guide, open `README.pdf` in this folder.

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

### Bundled server (miniserve)

This bundle includes prebuilt `miniserve-hqcc-*` binaries (based on the open source miniserve project) so you can run a lightweight local server without installing anything else. The binaries live in the `miniserve/` folder.

To launch the server:

- macOS: double-click `start-server.command`
- macOS / Linux (Terminal): run `./start-server.sh`
- Windows: run `start-server.bat`

For more details and usage options, see:

https://github.com/svenstaro/miniserve

The launcher scripts start miniserve in SPA mode so any route will load `index.html`.

On macOS, you may need to right-click `start-server.command` and choose **Open** the first time.

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

---

## Missing cards? (Simple guide)

If your cards seem to have disappeared, don’t panic. They are usually still on your computer — you just opened the app in a **different way** than before.

Your data is saved **inside your browser** and is tied to *how* you opened the app. For example:

- Opening `index.html` directly is one “place”.
- Running a local server (like the bundled start‑server) is another “place”.
- Running your own server on a different address or port is another “place”.

### Step 1 — Check how you opened it before

Try to remember which of these you used previously:

1. **Double‑clicked `index.html`** (opened as a file).
2. **Used the start‑server script** (served in your browser at a `http://...` address).
3. **Used your own server** (e.g., nginx, Apache, or another tool).

### Step 2 — Open it the same way

Open the app again using the **same method** you used before.

That should bring your cards back.

### Step 3 — Export your data

Once you can see your cards again, **export** your library from inside the app.

### Step 4 — Choose your preferred way to run it

Now you can open the app the **new way you want**, then **import** your data.

If you ever switch how you open the app again, you may need to repeat this.
