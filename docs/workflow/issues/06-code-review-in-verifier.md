---
id: PBI-WF-006
status: done
blocked_by: []
---

# PBI-WF-006: Code Review in the Verifier

## Directive
Add a two-axis code review (Standards and Spec) to the Verifier's pass, run by `reviewer` sub-agents the Verifier spawns, and route its findings through the Orchestrator's merge gate to the Developer.

**Scope:**
- **Skill:** `.claude/commands/code-review/SKILL.md` is added as provided, then made repo-aware: spec sources (PBI file, decision record, feature `spec.md` and `ux.md`) and standards sources (`CLAUDE.md`, `CONTEXT.md` files, game-rules conventions, ADRs, lint and analyzer settings) are passed explicitly by the caller; the tracker line is removed.
- **Reviewer agent:** new `.claude/agents/reviewer.md`, a read-only sonnet agent that does exactly the brief it is given.
- **Verifier:** `.claude/agents/verifier.md` gains the `Agent` tool and a "Code review" step that runs on every non-empty diff, against the full branch (`git diff master...HEAD`), and reports `### Code review` with stable finding IDs (`B1` blocking, `N1` non-blocking).
- **Orchestrator:** `.claude/commands/orchestrate.md` step 6 asks the human which IDs to send back, relays them, and re-reviews with a fresh Verifier handed the previous report.
- **Developer:** `.claude/agents/developer.md` reports each returned ID as fixed or disputed; disputed findings go back to the human, never silently dropped.
- **Out of scope:** renaming or moving the skill; the Explorer and Architect agents; CI, hooks, and the backlog tool; any product code.
- **Tests:** the change is prompt markdown only, so it adds no unit or E2E tests (CLAUDE.md exceptions for declarative-only configuration and internal-only changes).

## Dependencies
- Blocked by: None
- Must merge before: None

## Context
Read: `.claude/commands/code-review/SKILL.md`, `.claude/agents/verifier.md`, `.claude/agents/developer.md`, `.claude/commands/orchestrate.md`
- Claude Code docs (sub-agents): a subagent can spawn subagents by default (depth limit of three layers), but the `Agent(<type>)` allowlist in `tools` applies only to a main-thread agent, so the Verifier's restriction to `reviewer` is stated in prose.
- The skill is referenced by file path, never as `/code-review`, which collides with a built-in command name.

## Verification
- [x] `node tools/backlog/src/cli.ts --check` passes.
- [x] `node tools/ascii-check/src/cli.ts` passes.
- [x] Each changed file carries the Scope rules, confirmed by grep.
- [ ] A Verifier pass on a real diff shows `### Code review` with `#### Standards` and `#### Spec` and IDs. Deferred: see Follow-ups.

## Refinement Protocol
If the skill, `reviewer.md`, `verifier.md`, `developer.md`, or `orchestrate.md` changes how review findings are produced, identified, or routed, update all five together.

## Follow-ups
- Run the Verifier code review once on a real PBI diff (this PBI's own Verifier pass can serve) and check `### Code review`, the IDs, and the re-review flow end to end.
- `Agent(reviewer)` in the Verifier `tools` would be ignored for a subagent, so the `reviewer`-only limit is prose; add a `permissions.deny` rule for other agent types if stricter enforcement is wanted.
