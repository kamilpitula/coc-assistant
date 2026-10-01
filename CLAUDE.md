# Project Instructions

- Use the repository's existing structure and keep changes narrowly scoped.
- Prefer clear, explicit names over abbreviations and avoid speculative abstractions.
- Preserve public behavior unless the task explicitly changes it.
- Authentication uses Microsoft Entra ID, with Microsoft and Google SSO federated through Entra. Apply this consistently across frontend and backend code, with authorization enforced server-side.
- Use SignalR for user-visible real-time updates.
- Follow DDD principles and use the authoritative vocabulary from the root `CONTEXT.md` and applicable nested context files. The nearest context file takes precedence for its subtree; surface terminology conflicts instead of silently ignoring them.
- Add unit tests for all new behavior and logic. Exceptions are limited to generated code, declarative-only configuration, migrations, and trivial dependency wiring.
- Add E2E coverage for every user-visible functionality change. Use specification files as the source of truth and Gherkin scenarios as guidance for Playwright tests, with clear traceability between them. Document exceptions for internal-only changes that cannot affect external workflows.
- Follow SOLID and DRY by default. Document deliberate exceptions when strict application would reduce clarity or correctness.
- Keep cyclomatic complexity between 1 and 10 for new and modified methods when possible. Simplify higher-complexity code or provide a written justification.
- Add or update focused tests for behavior changes.
- Do not commit secrets, generated build output, local environment files, or dependency caches.
- Use ASCII by default and keep comments short and purposeful.
