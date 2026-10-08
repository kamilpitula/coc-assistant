# Project Instructions

- Use the repository's existing structure and keep changes narrowly scoped.
- Prefer clear, explicit names over abbreviations and avoid speculative abstractions.
- Preserve public behavior unless the task explicitly changes it.
- Authentication uses Microsoft Entra ID, with Microsoft and Google SSO federated through Entra. Apply this consistently across frontend and backend code, with authorization enforced server-side.
- Use SignalR for user-visible real-time updates.
- Follow DDD principles and use the authoritative vocabulary from the root `CONTEXT.md` and applicable nested context files. The nearest context file takes precedence for its subtree; surface terminology conflicts instead of silently ignoring them.
- Call of Cthulhu 7th Edition game rules live only in `docs/game-rules/`, which is the source of truth for them. Reference the relevant document section instead of restating rules anywhere else, and follow the conventions in `docs/game-rules/README.md`. Flag missing or conflicting rules instead of inventing them.
- Add unit tests for all new behavior and logic. Exceptions are limited to generated code, declarative-only configuration, migrations, and trivial dependency wiring.
- Design user-facing UI before building it. When a change introduces new functionality with a UI, a new or changed user journey, or a new screen or component, follow the UX/UI designer skill (`.claude/commands/ux-ui-designer-skill/SKILL.md`) first: present 2-3 options, let a human select one, then record the implementation-ready UX specification in `specs/<feature>/ux.md`, linked from that feature's `spec.md`. Implementation, unit tests, and E2E tests follow that UX specification. Skip this only for changes with no user-visible UI or changes that restore already-specified behavior, and say so explicitly.
- Add E2E coverage for every user-visible functionality change. Use specification files as the source of truth and Gherkin scenarios as guidance for Playwright tests, with clear traceability between them. Document exceptions for internal-only changes that cannot affect external workflows.
- Follow SOLID and DRY by default. Document deliberate exceptions when strict application would reduce clarity or correctness.
- Keep cyclomatic complexity at 10 or below; ESLint `complexity` and CA1502 enforce it. Simplify rather than extend the baselines in `frontend/eslint.config.js` and the backend `GlobalSuppressions.cs` files, and justify any new suppression in writing.
- Add or update focused tests for behavior changes.
- Do not commit secrets, generated build output, local environment files, or dependency caches.
- Use ASCII (`tools/ascii-check` enforces it and lists its exclusions) and keep comments short and purposeful.
- Track PBIs as described in `docs/backlog.md`: frontmatter status and dependencies, derived in-progress branches, Deferred items, and Follow-ups. Run `/backlog` to see the backlog.
