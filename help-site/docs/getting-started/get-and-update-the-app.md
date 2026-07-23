---
title: Get and Update the App
type: how-to
status: first-draft
source_questions: [Q-0242, Q-0243, Q-0244, Q-0245, Q-0246]
verified: 2026-07-22
app_version: 0.8.0
---
# Get and Update the App

The action at the bottom of the left navigation changes wording according to how the app is running.

## Get the app

**Get the app** appears when you are using a hosted or browser-playable copy. Choose it to open the HeroQuest Card Creator page on itch.io, where the downloadable version is available.

You do not need the download to use the hosted app. Choose it when you prefer a local copy that can be launched from your own computer.

## Check for updates

**Check for updates?** appears in a downloaded build or a copy opened directly from downloaded files. It takes you to itch.io so you can obtain the current download. It does not install an update automatically.

You can always compare the version in the footer with the latest published version. The footer version also links to its matching release page.

## Automatic update notices

Downloaded and npm-installed builds can check whether a newer version has been published. When one is confirmed, a notice appears in the header and names the available version.

- A downloaded build directs you to **Download on itch.io**.
- An npm build can also provide **View on npm**.
- The hosted itch.io build and unrecognized development copies do not perform this remote update check.

If the app is offline, it cannot perform a new check. A previously confirmed update notice can remain visible while offline.

## Update a downloaded copy safely

1. Choose **Export library** and keep the `.hqcc` backup somewhere safe.
2. Download and extract the new version into a new folder.
3. Launch it using your preferred method.
4. Check whether your library is visible.
5. If the new copy opens an empty library, import the backup.
6. Keep the previous folder until the new copy and library have been verified.

The application files and your library are separate. Replacing the program does not carry a library between browser storage locations, which is why the backup is important.

## Related guides

- [Use a Downloaded Copy](./use-a-downloaded-copy.md)
- [Understand Backups and Local Data](../settings-and-data/understand-backups-and-local-data.md)
- [Back Up and Restore Your Library](../settings-and-data/back-up-and-restore-your-library.md)
