---
id: PBI-WF-001
status: done
blocked_by: []
---

# PBI-WF-001: Track PBI Status in Frontmatter and Backfill Existing PBIs

## Directive
Make PBI status, dependencies, and follow-ups machine-readable in each PBI file, add a `backlog` tool that reports them against git, and backfill every existing PBI so the backlog shows what is done, in progress, and ready.

**Scope:**
- **Convention** in `docs/backlog.md`, with a project PBI template in `docs/pbi-template.md` and one line in `CLAUDE.md` pointing to `docs/backlog.md`:
  - YAML frontmatter on every `docs/<area>/issues/NN-*.md`: `id`, `status` (`todo | done | dropped`), `blocked_by` (list of ids), optional `pr`.
  - `in-progress` is never stored; it is derived from an unmerged branch named `<type>/<area>-<nnn>-<slug>` (for example `feature/cp-013-campaign-list` for `PBI-CP-013`).
  - The prose Dependencies section explains why a dependency exists; `blocked_by` is authoritative.
  - In a `done` PBI, each Verification item is ticked or unticked with `Deferred: see Follow-ups.`
  - `## Follow-ups` lists work discovered during the PBI; a promoted entry links its PBI with `-> PBI-...`.
  - Only a human sets `dropped`.
- **Tool** in `tools/backlog/` (Node, `yaml` package, Vitest), exposed as a `/backlog` command:
  - Default output: each PBI's status (with derived `in-progress`), ready PBIs (`todo`, all `blocked_by` done, no unmerged branch), unpromoted follow-ups, and git mismatch warnings (for example a merged branch whose PBI is not `done`).
  - `--check`: exits non-zero on invalid frontmatter, duplicate ids, unknown `blocked_by` ids, or a `done` PBI with an unticked item lacking a `Deferred:` note. Git mismatches never fail `--check`.
- **Backfill** all existing PBIs in `docs/*/issues/`, including this one and PBI-WF-002: an agent proposes `status`, `blocked_by`, `pr`, and evidence-backed ticks per PBI from the codebase, specs, and git history; a human confirms before files are written. Tick checkboxes only where evidence is found.
- **Out of scope:** CI integration, agent rule changes, and the `to-tickets` skill change (PBI-WF-002); GitHub Issues or Projects; per-run agent logs; resuming interrupted agent sessions.

## Dependencies
- Blocked by: None
- Must merge before: PBI-WF-002 (CI `--check` needs every PBI to carry valid frontmatter)

## Context
- No product spec; this PBI is workflow tooling. The convention it records in `docs/backlog.md` becomes the source of truth for PBI tracking.
- Existing PBIs: `docs/campaign-play/issues/`, `docs/continuous-integration/issues/`, `docs/e2e/issues/`, `docs/scenario-preparation/issues/`.
- Merged branches are not deleted; derive in-progress with `git branch -a --no-merged master`.

## Verification
- [x] `docs/backlog.md` and `docs/pbi-template.md` describe the convention above, and `CLAUDE.md` links to `docs/backlog.md`.
- [x] Every PBI file has valid frontmatter, with statuses confirmed by a human.
- [x] `/backlog` lists status, ready PBIs, unpromoted follow-ups, and git mismatch warnings.
- [x] `--check` passes on the backfilled repository and fails on each listed error case.
- [x] Vitest unit tests cover frontmatter parsing, status derivation, readiness, follow-up detection, and every `--check` rule.

## Refinement Protocol
If the frontmatter schema or status vocabulary changes, update `docs/backlog.md`, `docs/pbi-template.md`, the tool, and its tests together.

## Follow-ups
