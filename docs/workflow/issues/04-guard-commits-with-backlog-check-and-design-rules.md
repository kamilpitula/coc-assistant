---
id: PBI-WF-004
status: done
blocked_by: []
---

# PBI-WF-004: Guard Commits with the Backlog Check and Design-Record Rules

## Directive
Catch backlog and ASCII failures before a commit instead of in CI, and make Architect decision records cite the behavior they rely on.

**Scope:**
- **Architect** (`.claude/agents/architect.md`): the commit step also runs `node tools/backlog/src/cli.ts --check`; a new hard constraint requires `file:line` citations for relied-on existing behavior and checks E2E assertions against existing UX acceptance criteria.
- **Pre-commit hook:** `.githooks/pre-commit` runs the ASCII check and the backlog check; enabled per clone with `git config core.hooksPath .githooks`, documented in `CLAUDE.md`.
- **Out of scope:** `tools/backlog` changes; `.github/agents` mirrors; other PBI-CP-006 retro findings.

## Dependencies
- Blocked by: None
- Must merge before: None

Depends on PR #19 (`feature/cp-006-live-campaign-updates`) merging first: its `*.design.md` skip fix is what lets `--check` pass. This branch is based on that branch; rebase onto master if PR #19 is squash-merged.

## Context
Read: `docs/backlog.md`, `.claude/agents/architect.md`, `.github/workflows/ci.yml`
- CI stays the authoritative guard; the hook is opt-in per clone.

## Verification
- [x] `architect.md` runs the backlog check before committing and contains the citation rule.
- [x] The hook blocks a commit with a non-ASCII file and a commit with an inconsistent PBI file, and allows a clean commit.

## Refinement Protocol
If the hook's checks change, update `.githooks/pre-commit`, `CLAUDE.md`, and the Architect commit step together.

## Follow-ups
- Hook behavior was verified only under Git Bash on Windows; run it once on Linux.
- Hooks are opt-in per clone; CI remains the only enforced guard.
