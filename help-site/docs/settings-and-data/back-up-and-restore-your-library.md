---
title: Back Up and Restore Your Library
type: how-to
status: first-draft
source_questions: [Q-0003, Q-0055, Q-0056, Q-0057, Q-0166, Q-0178, Q-0179, Q-0180, Q-0181, Q-0182, Q-0183, Q-0184, Q-0185, Q-0186, Q-0188]
verified: 2026-07-22
app_version: 0.8.0
---
# Back Up and Restore Your Library

HeroQuest Card Creator stores cards, assets, collections, decks, pairings, and related library settings locally in the current browser profile or installed app copy. A `.hqcc` export is the portable safety copy.

The backup includes library-related settings such as export profiles, custom stat labels, copyright defaults, and saved border colours. It does not carry every personal preference, such as language or theme. Import restores the backup as one complete library; it is not a settings-only import.

## Create a backup

<!-- help-visual:p098:start -->
<figure class="hqcc-help-figure hqcc-help-figure--compact" markdown="span">
  ![Export Data window offering the current HQCC format and a compatibility format.](../assets/placements/p098--settings-and-data-back-up-and-restore-your-library--create-a-backup.jpg)
  <figcaption>Export data creates a restorable library backup in the selected HQCC format.</figcaption>
</figure>
<!-- help-visual:p098:end -->


1. Choose **Export library** in the left navigation.
2. Leave **New HQCC format (recommended)** selected for current versions.
3. Choose **Export**.
4. Wait for **Preparing**, **Exporting data**, and **Finalizing** to finish.
5. Keep the downloaded `.hqcc` file somewhere safe and outside the app.

Use **HQCC 0.5.5 compatibility format** only when you may need to return to app version 0.5.5. The current compact format is intended for 0.5.6 and newer and produces a smaller optimized backup.

## Restore or import a library

<!-- help-visual:p099:start -->
<figure class="hqcc-help-figure hqcc-help-figure--compact" markdown="span">
  ![Import Data warning stating that existing cards, assets, and related data will be replaced.](../assets/placements/p099--settings-and-data-back-up-and-restore-your-library--restore-or-import-a-library.jpg)
  <figcaption>Import replaces the current browser library, so the app asks for confirmation before continuing.</figcaption>
</figure>
<!-- help-visual:p099:end -->


1. Export the current library first if anything in it must be preserved.
2. Choose **Import library**.
3. Read the replacement warning and choose **Import**.
4. Select one `.hqcc` backup file.
5. Wait for validation and restoration to finish before closing the app.
6. When **Import complete** appears, review the reported card, asset, collection, and deck totals.
7. Open the main workspaces and confirm that the expected library is present.

The same process can move a library to another browser profile, computer, or installed app copy: export in the source location, transfer the `.hqcc` file, and import it in the destination.

## Important warning

Import replaces all existing cards, assets, and related data in the current browser profile. It is not a merge operation. Exporting first gives you a recovery point if the imported library is incomplete or is the wrong file.

Older backup imports remain supported, but the recommended export format is the current compact `.hqcc` format.

If an import reports an error after processing has begun, treat the current library as incomplete and restore the safety backup you made before starting. See [Fix Backup and Restore Problems](../troubleshooting/fix-backup-and-restore-problems.md).

## When to back up

- Before importing another library.
- Before clearing browser data or changing browser profiles.
- Before a major app upgrade if the library is important.
- After a substantial card, asset, or deck-building session.
- Before testing deletion or large reorganization workflows.

## What a backup does not replace

A backup is not the same as a PNG, ZIP, or PDF card export. It also does not replace keeping the downloaded `.hqcc` file somewhere safe: a backup left only in the same browser or device is not useful if that local data is cleared or the device fails.

See [Understand Backups and Local Data](./understand-backups-and-local-data.md) for the complete contents and the preferences that remain local to each app location.

See [Use a Downloaded Copy](../getting-started/use-a-downloaded-copy.md) when moving between the hosted app, a directly opened download, and a locally served copy.
