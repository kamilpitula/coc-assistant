---
id: PBI-WF-002
status: todo
blocked_by: [PBI-WF-001]
---

# PBI-WF-002: Enforce PBI Tracking in CI and the Agent Workflow

## Directive
Make PBI tracking part of the process: CI rejects inconsistent PBI files, agents maintain status as they work, and new PBIs are created in the project format.

**Scope:**
- **CI:** add a step to `.github/workflows/ci.yml` that installs `tools/backlog/` dependencies and runs `--check`, included in the `ci-success` aggregation.
- **Builder** (`.claude/agents/builder.md`):
  - names its branch `<type>/<area>-<nnn>-<slug>` from the PBI id;
  - in its final commit on the branch, sets `status: done`, ticks met Verification items, marks the rest `Deferred: see Follow-ups.`, and records discovered work under `## Follow-ups`.
- **Verifier** (`.claude/agents/verifier.md`): confirms each ticked item is actually met and each deferral has a follow-up, and reports mismatches without editing.
- **Orchestrator** (`.claude/commands/orchestrate.md`): runs `/backlog` before starting a PBI; when the PBI is not ready (a blocker not `done`, already `done` or `dropped`, or an unmerged branch exists), warns and asks the human whether to proceed.
- **`to-tickets` skill** (user-level, `~/.claude/skills/to-tickets/SKILL.md`): uses the project template when `docs/pbi-template.md` exists, otherwise its built-in template.
- **Out of scope:** changing the convention or tool behavior from PBI-WF-001; hard-blocking the Orchestrator; failing CI on git mismatches.

## Dependencies
- Blocked by: PBI-WF-001 (convention, tool, and backfilled frontmatter must exist first)
- Must merge before: None

## Context
Read: `docs/backlog.md` (created by PBI-WF-001)
- Frontmatter schema, branch naming rule, Deferred and Follow-ups conventions, readiness definition.

## Verification
- [ ] CI fails when a PBI file violates a `--check` rule and passes on the current repository.
- [ ] The Builder, Verifier, and Orchestrator instructions describe the responsibilities above.
- [ ] `to-tickets` writes new PBIs from `docs/pbi-template.md` in this repository and from its built-in template elsewhere.
- [ ] A dry run of `/orchestrate` on a PBI with an unfinished blocker produces the readiness warning and asks before proceeding.

## Refinement Protocol
If an agent rule conflicts with the convention in `docs/backlog.md`, change the convention there first (through PBI-WF-001's Refinement Protocol), then align the agent instructions.

## Follow-ups
