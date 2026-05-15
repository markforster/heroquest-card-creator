# AGENT NOTES – HeroQuest Card Maker

This repo also has detailed agent notes in `docs/AGENTS.md` (project overview, structure, conventions).

Testing working practices live in `TESTING.md` (test layout, naming, runner usage, and coverage conventions).

## Fallow Workflow (Opt-In Only)

- Running `fallow` is a user-invoked action only.
- Agents must not run `fallow` automatically during normal implementation or review unless the user explicitly requests it.
- Treat `fallow` output as recommendations, not mandatory edits.
- Before applying deletions, export removals, or structural refactors based on `fallow`, agents must present a short plan and get user approval.
- Preferred flow when requested: run analysis -> summarize high-signal findings by risk/impact -> propose small change batches -> implement approved batches with tests.
