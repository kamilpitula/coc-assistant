# Backlog Convention

This document is the source of truth for how PBIs (product backlog items) are tracked. Every PBI lives in `docs/<area>/issues/NN-<slug>.md` and follows [pbi-template.md](pbi-template.md). Architect decision records next to it (`NN-<slug>.design.md`) are not PBIs, and the tool skips them. The `backlog` tool in `tools/backlog/` reads these files and git, and reports on them.

## Frontmatter

Every PBI file starts with YAML frontmatter:

```yaml
---
id: PBI-CP-013
status: done
blocked_by: [PBI-CP-012]
pr: 8
---
```

| Key | Required | Meaning |
| --- | --- | --- |
| `id` | yes | `PBI-<AREA>-<NNN>`: an uppercase area code (letters and digits, e.g. `CP`, `E2E`) and a three-digit number matching the file's `NN`. |
| `status` | yes | `todo`, `done`, or `dropped`. |
| `blocked_by` | yes | List of PBI ids that must be `done` first; `[]` when none. |
| `pr` | no | Number of the pull request that delivered the PBI. |

No other keys are allowed.

- **`in-progress` is never stored.** A PBI is in progress while an unmerged branch carries its id (see Branch naming).
- **`blocked_by` is authoritative.** The prose `## Dependencies` section stays and explains why each dependency exists; when the two disagree, `blocked_by` wins and the prose is corrected.
- **Only a human sets `dropped`.** Agents never drop a PBI.

## Branch naming

A PBI's branch is named `<type>/<area>-<nnn>-<slug>`, for example `feature/cp-013-campaign-list` for `PBI-CP-013`. The area and number match the id case-insensitively. Branches without an id, such as `fix/auth-header-and-display-name`, match no PBI.

## Done PBIs, Deferred items, and Follow-ups

- In a `done` PBI, each `## Verification` item is either ticked (`- [x]`) or left unticked with `Deferred: see Follow-ups.` on the same line.
- `## Follow-ups` lists work discovered during the PBI, one `- ` item per entry. Each deferred Verification item has a Follow-ups entry.
- When a follow-up becomes its own PBI, its entry links it with `-> PBI-<AREA>-<NNN>`. Entries without a link are unpromoted.

## Readiness

A PBI is ready when its status is `todo`, every id in `blocked_by` is `done`, and no unmerged branch carries its id.

## The backlog tool

Run from the repository root (Node 24, see `.nvmrc`), or use the `/backlog` command:

```sh
npm ci --prefix tools/backlog          # once
node tools/backlog/src/cli.ts          # report
node tools/backlog/src/cli.ts --check  # validate
```

The report lists each PBI's status (with derived `in-progress`), ready PBIs, unpromoted follow-ups, and git mismatch warnings:

- a branch merged into `master` whose PBI is not `done`;
- an unmerged branch whose PBI is already `done` or `dropped`;
- a branch naming an id that no PBI file has.

`--check` exits non-zero on invalid frontmatter, duplicate ids, unknown `blocked_by` ids, or a `done` PBI with an unticked Verification item lacking a `Deferred:` note. It does not read git, so git mismatches never fail it.

## Changing this convention

If the frontmatter schema or status vocabulary changes, update this document, [pbi-template.md](pbi-template.md), the tool, and its tests together.
