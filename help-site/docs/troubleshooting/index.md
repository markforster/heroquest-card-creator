---
title: Troubleshooting Index
type: troubleshooting-index
status: first-draft
source_questions: [Q-0001, Q-0009, Q-0054, Q-0068, Q-0111, Q-0144, Q-0184, Q-0185, Q-0199, Q-0232, Q-0239, Q-0251, Q-0280, Q-0293, Q-0328, Q-0332, Q-0337, Q-0338, Q-0340, Q-0341, Q-0344, Q-0346]
verified: 2026-07-22
app_version: 0.8.0
---
# Troubleshooting Index

Start with what you can see or what you were trying to do. The links below take you to the shortest relevant checks and recovery steps.

## Before changing anything

- Read the full warning before confirming a delete, replacement, unpair, or import.
- If the current card says **Modified**, save it or deliberately discard it before troubleshooting elsewhere.
- If your library is still available and a recovery step could replace data, create a library backup first.
- Note the exact message, current screen, selected card or asset, and action that was unavailable. Similar-looking controls can have different prerequisites.

## I cannot save, duplicate, or recover a card

Use [Fix Card Saving and Duplication Problems](./fix-card-saving-and-duplication-problems.md) when:

- **Save** or **Duplicate** is unavailable.
- Changes disappeared after leaving the Card Editor.
- Saving did not continue to the screen you selected.
- A duplicate is missing from a deck or lost its pairing.
- You deleted a card and want to restore it.

For draft, saved, and Modified states, see [Understand Card States and Saving](../making-cards/understand-card-states-and-saving.md).

## A saved card is missing or a Cards action is unavailable

Use [Fix Cards Workspace Problems](./fix-cards-workspace-problems.md) when:

- Cards says **No cards found**.
- Collection counts change unexpectedly.
- **Select all**, **Load**, **Add to collection**, or **Restore** is unavailable.
- Selection seems confusing after switching between Grid and Table.
- A card is missing from a named collection or normal results.
- You cannot see the Collections panel or Recently deleted.

Check All cards, clear search and filters, and inspect Recently deleted before assuming that a card was permanently removed.

## A card field, option, or colour is missing or unexpected

Use [Fix Template Control Problems](./fix-template-control-problems.md) when:

- A Properties field is missing for the current template.
- A wildcard stat, Monster icon, card colour, copyright choice, or back logo behaves differently than expected.
- **Default** and **Revert** produce different results.

If the missing option is **Scale to fit**, use [Fix Clipped or Overflowing Card Text](./fix-clipped-or-overflowing-card-text.md).

## Text is clipped, too small, or will not fit

Use [Fix Clipped or Overflowing Card Text](./fix-clipped-or-overflowing-card-text.md) when:

- The card shows **Text clipped**.
- The warning remains after enabling **Scale to fit**.
- Fitted text is too small to read comfortably.
- **Scale to fit** is missing.
- The body-text field will not accept more wording.

The warning itself is not exported, but clipped wording remains missing from the card. Resolve it before exporting or printing.

## Artwork is missing or an asset action is unavailable

Use [Fix Missing Artwork](./fix-missing-artwork.md) when a card has lost its image, the app identifies affected cards, or an export reports missing artwork.

Use [Fix Asset Upload Problems](./fix-asset-upload-problems.md) when upload review reports duplicates or renames, a file is skipped, classification is still running, Recently uploaded is unexpected, or Cancel leaves the progress window open.

For normal asset actions, see [Replace, Convert, and Delete Assets](../managing-your-library/assets/replace-convert-and-delete-assets.md). **Replace** requires exactly one selected asset. Deleting an in-use asset can clear that image from affected cards, so review the warning first.

## Pairing looks disabled or removing it affects a deck

Use [Fix Pairing Problems](./fix-pairing-problems.md) when:

- Pairing controls are unavailable because the card is still a draft.
- Selectable cards look disabled in the pairing chooser.
- The app warns that decks or other cards will be affected.
- Changing a card's face or duplicating it removes a pairing.

Do not confirm an unpair action until you have reviewed the affected decks and understand which entries will be removed.

## A deck card will not drop, disappeared, or needs recovering

Use [Fix Deck Editing Problems](./fix-deck-editing-problems.md) when:

- A front, back, set, or entry will not drop where expected.
- Entries appear to disappear after another selection.
- A removed paired front needs to be recovered.
- Moving or deleting a set removes an empty group.
- Deck duplication, group naming, group ordering, or changing a set's back cannot be found.

For the structure of groups, sets, backs, and entries, see [Understand the Decks Workspace](../building-decks/understand-the-decks-workspace.md).

## A setting is disabled, missing, or did not persist

Use [Fix Settings Problems](./fix-settings-problems.md) when:

- A change disappeared after switching category.
- **Save**, export options, **Set default**, or **Delete** is unavailable.
- Automatic asset classification cannot be enabled.
- The current language is absent from the language menu.
- Settings do not appear in another browser or app copy.

Some settings apply immediately, while Export Settings and Stat Label Overrides require **Save**.

## A backup will not export, import, or restore correctly

Use [Fix Backup and Restore Problems](./fix-backup-and-restore-problems.md) when:

- The app rejects or cannot read a backup file.
- Import stops or reports an error.
- The imported library appears incomplete.
- Backup export does not produce a download.

An import replaces the current library; it does not merge two libraries. Always protect the current library with a separate backup before importing when possible.

If the library is empty only in another browser, profile, address, or downloaded copy, see [Understand Backups and Local Data](../settings-and-data/understand-backups-and-local-data.md).

## Navigation, updates, or a downloaded copy is not working

Use [Fix Navigation Download and Screen Problems](./fix-navigation-download-and-screen-problems.md) when:

- The left navigation will not expand.
- **Check for updates** or an expected update notice is missing.
- A downloaded copy opens with an empty library.
- The downloaded app will not launch.
- The app displays a **Desktop optimized** notice.

Use [Fix Keyboard Shortcut Problems](./fix-keyboard-shortcut-problems.md) when a letter does nothing because you are typing, an app window is open, the wrong screen is active, or a contextual action is unavailable. It also explains macOS and Windows naming, deck Export prerequisites, and visible alternatives when another program handles a key combination.

## An export or print does not contain what I expected

Start with [Fix Export and Print Problems](./fix-export-and-print-problems.md) for disabled actions, skipped faces, progress, cancellation, downloads, PDF layout errors, card size, duplex orientation, or alignment.

For the normal procedures and related recovery:

- [Export Cards as PNG Images](../exporting-and-printing/export-cards-as-png-images.md) explains current-card, selection, collection, pairing, and deck image exports.
- [Export a Deck as PDF](../exporting-and-printing/export-a-deck-as-pdf.md) explains fronts, backs, quantities, duplex choices, and alignment checks.
- [Fix Missing Artwork](./fix-missing-artwork.md) covers missing-image reports and card repair.
- [Fix Clipped or Overflowing Card Text](./fix-clipped-or-overflowing-card-text.md) covers wording missing because it extends beyond the card.

If a bulk image export completes with skipped cards, check the downloaded ZIP for an issues report. Keep the affected cards unchanged until you have identified whether artwork, pairing, or card rendering caused the omission.

## I cannot find the problem here

Record the app version shown in the lower navigation, the screen and card template involved, the exact warning or disabled action, and whether the issue also occurs after reopening the same saved item. Preserve the current library with a backup before attempting replacement, import, or permanent deletion as a workaround.
