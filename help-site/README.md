# HeroQuest Card Creator Help Site

This folder contains the standalone MkDocs help site for HeroQuest Card Creator.

## Content

- `help-site/docs/` is the canonical source for the public help site. It contains the authored pages with stable, URL-friendly paths.
- `help-site/site/` is generated HTML and is ignored by Git.

The public information architecture is documented in `content-architecture.md`. The historical disposition of the original reader articles is recorded in `content-migration.md`.

## Commands

- `npm run help:setup` creates the Python environment and installs the pinned MkDocs dependencies.
- `npm run help:validate` checks question coverage, FAQ answers, metadata, customer-facing terminology, and local links.
- `npm run help:build` validates the content and runs a strict MkDocs build into `help-site/site/`.
- `npm run help:preview` validates the content and serves a local preview at `http://127.0.0.1:8001`.

## Authoring

Edit publication pages directly under `help-site/docs/`. Keep each page focused on one reader need, retain its `source_questions` metadata, and use customer-facing app language rather than implementation detail.

The FAQ pages preserve the exact natural-language question wording so MkDocs search can lead readers to concise answers. Fuller explanations remain in the task, concept, screen, reference, and troubleshooting pages linked from each answer.

## Replacing images

The 115 reader-facing images are JPEG files under `help-site/docs/assets/placements/`.

1. Find the image used by the page.
2. Replace that `.jpg` file with the new JPEG, keeping the existing filename.
3. Run `npm run help:build`.

No Markdown changes are needed when the filename stays the same. Prefer a replacement with a similar aspect ratio; if the shape changes substantially, review the page layout afterwards.
