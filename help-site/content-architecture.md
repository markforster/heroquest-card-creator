# Help Site Content Architecture

## Purpose

This document defines the first public information architecture for the HeroQuest Card Creator help site. It is independent of the experimental navigation previously used to prove that MkDocs was suitable.

The canonical publication source lives under `help-site/docs/`. Each page retains its question metadata so content coverage remains measurable without a separate research vault.

## Reader journeys

The site supports four common ways of looking for help:

1. **I am new:** begin with Getting started and create a first card.
2. **I want to achieve something:** use the task sections for cards, the library, decks, export, settings, or data.
3. **I need to understand a term:** use Concepts.
4. **I have a question or problem:** search the FAQ or use Troubleshooting.

The structure deliberately keeps concepts, screen orientation, capabilities, goal-focused instructions, and troubleshooting distinct while linking between them.

## Public sections

| Section | Reader need | Typical content |
| --- | --- | --- |
| Home | Find the right starting point | Short orientation and links into the main journeys |
| Getting started | Install or open the app and make a first card | First-card walkthrough, navigation, downloads, updates |
| Making cards | Create and edit individual card faces | Templates, editor, artwork, text, saving, pairing, specialist controls |
| Managing your library | Find and organise saved cards and reusable images | Cards workspace, Recent, assets, collections, recovery |
| Building decks | Organise paired faces into printable projects | Deck workspace, groups, sets, entries, quantities, recovery |
| Exporting and printing | Produce images and print-ready documents | PNG, PDF, profiles, duplex preparation |
| Settings and data | Change preferences and protect work | Settings, language, appearance, local data, backup and restore |
| Concepts | Understand the app's vocabulary and relationships | Cards, templates, drafts, assets, collections, pairing, decks |
| Reference | Look up supplied controls quickly | Keyboard shortcuts |
| FAQ | Search using the way a user would ask a question | All canonical questions with concise answers and links to fuller help |
| Troubleshooting | Recover from a problem or unexpected result | Symptoms, checks, warnings, and safe recovery |

## Authoring rules

- Use lowercase, hyphenated filenames and stable URLs.
- Give every section an `index.md` landing page that explains what belongs there.
- Lead with the user's goal or visible app wording, not implementation detail.
- Retain `source_questions` metadata so every public page remains traceable to verified product knowledge.
- Use visible question wording in FAQ pages so MkDocs search can find natural-language queries.
- Link to a fuller guide rather than repeating long procedures in several places.
- Preserve qualified answers, known limitations, and warnings rather than smoothing them into confident instructions.
- Keep Help and About content outside this architecture because those app areas are expected to move.

## Completion controls

The first public draft is complete only when:

- every source reader article is mapped to one public destination or deliberately replaced by a section landing page;
- all 351 canonical question IDs occur in public-page metadata;
- all canonical question wordings and concise answers appear in the FAQ (350 distinct wordings across 351 IDs);
- no public page contains unresolved Obsidian links;
- every Markdown link resolves;
- MkDocs builds successfully in strict mode;
- the strict MkDocs build succeeds from the canonical public content alone.
