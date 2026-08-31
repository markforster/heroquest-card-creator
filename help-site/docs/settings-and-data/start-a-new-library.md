---
title: Start a New Library
type: how-to
status: first-draft
verified: 2026-08-27
app_version: 0.8.1
---
# Start a New Library

Use **Start new library** when you want the current app location to become empty again. It removes your local working library, so export first if there is anything you may need later.

This is different from importing a backup. Import replaces the current library with the contents of a `.hqcc` file. Start new library leaves the app with no saved library content.

## What gets removed

Starting a new library removes the saved work that belongs to the current local library:

- saved and recently deleted cards
- uploaded image assets
- saved custom back logos
- card pairings
- collections and collection membership
- decks, groups, sets, entries, and quantities
- card thumbnails and related saved card details

After the reset, the Cards, Assets, and Decks workspaces should behave like a fresh app location.

## What stays

Starting a new library keeps app preferences that are not the library itself, including:

- language and theme
- export settings and saved export profiles
- stat-label and copyright defaults
- appearance and text-fitting preferences
- preview and Stockpile view preferences
- selected template and similar app preferences

Review Settings afterwards if you want to change those preferences for the new library.

## Start again safely

1. Open **Settings**.
2. Choose **Library**.
3. Check the cards, decks, and assets summary.
4. Choose **Export** if you need a backup before removing the current library.
5. Choose **New**.
6. Read the warning in the confirmation window.
7. Use **Export library** in the confirmation window if you still need a backup.
8. Tick the acknowledgement checkbox.
9. Choose **Start new library**.
10. Wait for the completion message, then choose **Continue**.

The final button is unavailable until you tick the acknowledgement checkbox. Cancel leaves the current library unchanged.

## When not to use it

Do not use Start new library to merge two libraries or switch to another backup. Use [Back Up and Restore Your Library](./back-up-and-restore-your-library.md) when you want to import a `.hqcc` file.

Do not use it as an undo command. Once the new-library action completes, restore from a backup if you need the removed cards, assets, collections, or decks again.
