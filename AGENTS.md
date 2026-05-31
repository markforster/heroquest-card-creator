# AGENT NOTES – HeroQuest Card Maker

This repo also has detailed agent notes in `docs/AGENTS.md` (project overview, structure, conventions).

Testing working practices live in `TESTING.md` (test layout, naming, runner usage, and coverage conventions).

## i18n / String Audit Workflow

- For requests to scan for hardcoded user-facing strings or add i18n support, use:
  - `artefacts/reports/decks-i18n-remediation-sub-agent-instructions.md`
- This sub-agent workflow defines:
  - How to process findings line-by-line from the Decks i18n report.
  - How to apply `useI18n` / `t("key")` patterns consistently.
  - When to run `npm run i18n:audit`.
  - How to handle sweep requests and whether to update:
    - `artefacts/reports/decks-i18n-manual-audit-report-2026-05-20.md`

## Fallow Workflow (Opt-In Only)

- Running `fallow` is a user-invoked action only.
- Agents must not run `fallow` automatically during normal implementation or review unless the user explicitly requests it.
- Treat `fallow` output as recommendations, not mandatory edits.
- Before applying deletions, export removals, or structural refactors based on `fallow`, agents must present a short plan and get user approval.
- Preferred flow when requested: run analysis -> summarize high-signal findings by risk/impact -> propose small change batches -> implement approved batches with tests.
