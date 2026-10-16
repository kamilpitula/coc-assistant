---
id: PBI-WF-003
status: done
blocked_by: [PBI-WF-002]
pr: 18
---

# PBI-WF-003: Split the Builder into an Architect and a Developer

## Directive
Run design on Opus and implementation on Sonnet: an Architect agent designs complex tasks and hands a written decision record to a Developer agent, so implementation is cheaper without losing the rationale, and rejected options are not reintroduced.

**Scope:**
- **Architect** (`.claude/agents/architect.md`, new, Opus):
  - runs only when an architecture trigger applies; owns the trigger list, the UX/UI designer skill step, ADRs, and the decision record;
  - proposes 2-3 options scored +/0/- on six fixed metrics (Consistency, Modifiability, Testability, Simplicity, Reversibility, Security and correctness; Performance when relevant), applies a GoF pattern lens that requires a present force for each pattern, and recommends one option at the human plan gate;
  - after approval, creates the PBI branch and commits the decision record (`docs/<area>/issues/NN-<slug>.design.md`), any ADR, and any `ux.md`; revises the record with a `## Revisions` entry on escalation.
- **Developer** (`.claude/agents/developer.md`, renamed from `builder.md`, Sonnet): implements from the decision record and the Explorer report with red-green TDD; may make tactical choices listed as deviations; stops and escalates when a change would contradict the chosen option, reintroduce a rejected option, break an invariant, or hit a trigger; plans and gates trigger-free tasks itself; reports when stuck instead of switching models.
- **Orchestrator** (`.claude/commands/orchestrate.md`): routes to the Architect by the triggers (when unsure, to the Architect), relays escalations, and re-gates revisions that change a decision.
- **Verifier** (`.claude/agents/verifier.md`): checks the diff against the decision record; a reintroduced rejected option or an unapproved pattern is blocking.
- **Explorer** (`.claude/agents/explorer.md`): downstream agent names match the new roles.
- **Out of scope:** the Copilot mirror in `.github/agents/`; changing the backlog convention or tool.

## Dependencies
- Blocked by: PBI-WF-002 (the PBI duties this PBI redistributes between the Architect and the Developer)
- Must merge before: None

## Context
Read: `.claude/agents/builder.md` (as of PBI-WF-002), `.claude/commands/orchestrate.md`, `.claude/agents/verifier.md`, `docs/backlog.md`, `docs/adr/`
- Every PBI-WF-002 duty keeps exactly one owner after the split.

## Verification
- [x] `architect.md` defines the triggers, the six metrics and scoring, the GoF pattern lens, the decision record contents, and the post-approval commit of design artifacts.
- [x] `developer.md` replaces `builder.md`, runs on Sonnet, and defines tactical deviations, escalation, and the stuck report.
- [x] The Orchestrator, Verifier, and Explorer instructions describe the responsibilities above, and no `.claude/` file names the Builder.
- [x] `node tools/backlog/src/cli.ts --check` and `node tools/ascii-check/src/cli.ts` pass.
- [x] No unit or E2E tests: this PBI changes agent instructions only, which no code or user workflow executes.

## Refinement Protocol
Change the triggers, metrics, or decision record contents in `architect.md` first; the Orchestrator and Verifier reference that file rather than restating it.

## Follow-ups
- Mirror the Architect/Developer split into `.github/agents/` (`builder.agent.md`, `orchestrator.agent.md`, `exploration.agent.md`, `verifier.agent.md` still describe the Builder).
- Run `/orchestrate` on a trigger-hitting PBI and on a trigger-free one, and confirm the routing, the decision record handoff, and the Verifier's record checks.
