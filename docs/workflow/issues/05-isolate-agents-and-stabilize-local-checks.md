---
id: PBI-WF-005
status: done
blocked_by: []
---

# PBI-WF-005: Isolate Agent Checkouts and Stabilize Local Checks

## Directive
Fix three environment problems found in the PBI-SP-008 retro: a CI format check that no local step ran, agents sharing the human's working copy, and E2E stalls from LocalDB memory starvation.

**Scope:**
- **CI-mirroring checks:** a `.githooks/pre-push` hook runs `dotnet format --verify-no-changes` against the pushed commit in a temporary worktree; EF1002 is a build error in `backend/.editorconfig`; `verifier.md` treats a non-zero exit from a CI-mirroring command as blocking, and `developer.md` step 4 names the format check.
- **Agent isolation:** the Developer and the Verifier each run in their own git worktree, never in the human's working tree.
- **LocalDB memory:** `e2e/globalSetup.ts` sets LocalDB `min server memory` when the target is LocalDB; a troubleshooting section documents it; the 20 s timeout workaround for it is removed; `developer.md` requires escalation before changing machine or database-server settings.
- **Out of scope:** retro items 4 to 6 (Architect gate size, the done-with-failing-tests rule, Orchestrator relay lines); commit trailers; any change to PBI-SP-008 or PR #32.

## Dependencies
- Blocked by: None
- Must merge before: None

## Context
Read: `.github/workflows/ci.yml`, `.claude/agents/developer.md`, `.claude/agents/verifier.md`, `.claude/commands/orchestrate.md`, `docs/e2e/authenticated-harness.md`
- CI stays the authoritative guard; the pre-push hook is opt-in per clone.

## Verification
- [x] The pre-push hook fails for a pushed commit with a format error and passes for a clean commit, regardless of uncommitted changes.
- [x] A local build fails on an injected EF1002 and passes without it.
- [x] `developer.md` and `verifier.md` carry the new rules and the isolation is configured.
- [x] The LocalDB helper has unit tests; global setup skips non-LocalDB targets and warns instead of failing. Deferred: the raise from a low value was not exercised, see Follow-ups.
- [x] The E2E spec whose timeout was removed (`scene-links.spec.ts`) passes with workers=1 and retries=0. The other two 20 s timeouts wait on query retry backoff and stay.
- [x] The ASCII and backlog checks pass.

## Refinement Protocol
If the hook, the isolation setting, or the global setup memory floor changes, update `CLAUDE.md`, the agent files, and `docs/e2e/authenticated-harness.md` together.

## Follow-ups
- The LocalDB memory raise was only run where `min server memory` was already 900 (a no-op); verify it on a LocalDB instance at the default value.
- Agent definitions set `isolation: worktree`, which branches from the default branch; check that the Verifier switches to the PBI branch in practice.
- `core.hooksPath` is an absolute path to the main checkout's `.githooks` on this machine, so linked worktrees run the main checkout's hooks; use the relative `.githooks` value to make each worktree run its own.
- The pre-push hook was verified only under Git Bash on Windows; run it once on Linux.
