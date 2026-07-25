---
title: Use a Downloaded Copy
type: how-to
status: first-draft
source_questions: [Q-0247, Q-0248, Q-0249, Q-0250]
verified: 2026-07-22
app_version: 0.8.0
---
# Use a Downloaded Copy

The downloaded bundle lets you run HeroQuest Card Creator locally. Extract the ZIP before launching it; do not try to run the files from inside the compressed folder.

## Choose how to launch it

The bundle supports two main approaches.

### Open the app directly

Double-click **index.html**, or use your browser's **Open With** action. This is the simplest option and can work offline, although some browsers place restrictions on pages opened directly from files.

### Use the bundled local server

This is the more reliable option and opens the app at a local web address:

- On macOS, double-click **start-server.command**. The first time, you may need to right-click it and choose **Open**.
- On Windows, run **start-server.bat**.
- On macOS or Linux from a terminal, run **./start-server.sh**.

The bundle also includes **README.pdf** and **README.md** with launch instructions for that version.

## Why the launch method matters

Your library is stored by the browser in the app location you opened. These can therefore have separate libraries:

- The hosted web app.
- A directly opened **index.html** file.
- The bundled local server.
- The same local server using a different address or port.
- Another browser or browser profile.

An empty library in another copy does not normally mean the original cards were deleted. Reopen the same browser, launch method, address, and port used previously.

## Move your library to the preferred copy

1. Open the app location where the cards are still visible.
2. Choose **Export library** and create a `.hqcc` backup.
3. Open the destination copy using the method you intend to keep using.
4. Choose **Import library** and select the backup.
5. Check the reported totals and the Cards, Assets, Collections, and Decks workspaces.

Import replaces the destination library rather than merging it. Protect any destination work before continuing.

## Related guides

- [Get and Update the App](./get-and-update-the-app.md)
- [Understand Backups and Local Data](../settings-and-data/understand-backups-and-local-data.md)
- [Back Up and Restore Your Library](../settings-and-data/back-up-and-restore-your-library.md)
