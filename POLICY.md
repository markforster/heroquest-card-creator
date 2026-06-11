# Policy Index

This is the top-level policy entrypoint for work in this repo.

Start every new task with this reading order:

1. Read this file.
2. Read [`docs/policy/index.md`](docs/policy/index.md).
3. Read [`docs/AGENTS.md`](docs/AGENTS.md).
4. Read every task-relevant policy document before making changes.

## Structure

- Canonical implementation policies live under `docs/policy/`.
- Root-level or legacy policy files outside `docs/policy/` may exist as compatibility pointers.
- When a pointer document and a canonical policy overlap, follow the canonical policy in `docs/policy/`.

## Canonical Policy Set

- [`docs/policy/routing-and-pages.md`](docs/policy/routing-and-pages.md)
  - Required for route changes, new pages, shell decisions, route-owned state, or page-level refactors.

- [`docs/policy/code-placement.md`](docs/policy/code-placement.md)
  - Required when deciding whether code belongs in an existing file, a sibling file, or a shared area.

- [`docs/policy/testing.md`](docs/policy/testing.md)
  - Required for test additions, test structure changes, and production changes that affect verification expectations.

## Working Rule

If more than one policy applies, read all of them before implementation and follow the narrowest task-specific policy first.

## Maintenance Rule

When adding a new repo-wide implementation policy:

1. Add the canonical document under `docs/policy/`.
2. Add it to `docs/policy/index.md`.
3. Update `AGENTS.md` if the document should be part of required startup reading.
