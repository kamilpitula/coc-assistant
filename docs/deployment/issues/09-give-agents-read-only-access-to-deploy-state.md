---
id: PBI-DEP-009
status: todo
blocked_by: [PBI-DEP-005]
---

# PBI-DEP-009: Give Agents Read-Only Access to Deploy State

## Directive
Let agents read GitHub Actions runs and live `dev` Azure resources themselves, and require them to check workflow `az` queries against real output, so deploy failures stop depending on the owner pasting logs and on query paths written from memory.

**Scope:**
- **Permissions:** `.claude/settings.json` allows read-only commands without a prompt: `gh run list`, `gh run view` (including `--log-failed`), `gh api` GETs under `repos/<owner>/<repo>/actions/`, and `az` `show`/`list` verbs. Mutating verbs (`az ... create|update|delete|set`, `gh run rerun`, `gh variable set`, `terraform apply`) stay prompted.
- **Runbook:** a "Debugging a failed deploy" section in `docs/infrastructure/dev-environment-setup.md`: find the run, read the failed job log, read the live resource, and only then ask the owner. Pointer to it from the orchestrator and Developer agent definitions.
- **Reviewer rule:** a `.github/instructions/workflows.instructions.md` (`applyTo: .github/workflows/**`) with judgement-call rules: every `az --query` path and every compared state value is checked against a read-only live call or the CLI's `--help`/SDK model, and the check is cited; every `vars.*` a workflow reads is listed in the setup doc; cleanup steps are conditioned on the outcome of the step that created the resource.
- **Standards wiring:** the code-review skill's standards sources (`.claude/commands/code-review/SKILL.md`, step 3) include `.github/instructions/*.md`.
- **Out of scope:** write access to Azure or GitHub settings; Azure credentials for CI agents; static checks for workflow syntax (PBI-DEP-008).

## Dependencies
- Blocked by: PBI-DEP-005 (the deploy workflow and setup doc this extends)
- Must merge before: None

## Context
Read: `.claude/settings.json`, `.claude/commands/code-review/SKILL.md`, `.claude/agents/`, `.github/instructions/infrastructure.instructions.md`, `docs/infrastructure/dev-environment-setup.md`, `.github/workflows/deploy-dev.yml`
- Motivating failure: the rollout verify step queried `latestRevisionName` (correct: `properties.latestRevisionName`) and waited for a `Succeeded` revision state that does not exist (valid: Provisioning, Provisioned, Failed, Deprovisioning, Deprovisioned). One read-only `az containerapp show` against `ca-cocassistant-api-dev` would have shown both; it surfaced only on a live run (PR #67).
- During PBI-DEP-005 the owner pasted GitHub run errors by hand at least four times; `gh run view --log-failed` returns the same text.
- Agents already ran read-only `az` successfully against `dev`, so this widens the no-prompt list, not the credentials.
- `.claude/settings.json` mixes the legacy `allowedTools` key with `permissions.ask`; put new entries under `permissions.allow`.

## Verification
- [ ] In a fresh session, `gh run view <id> --log-failed` and `az containerapp show -g rg-cocassistant-dev -n ca-cocassistant-api-dev` run without a permission prompt; `az containerapp update` and `gh run rerun` still prompt.
- [ ] `dev-environment-setup.md` has the debugging section, and the orchestrator and Developer agent definitions point to it.
- [ ] `workflows.instructions.md` exists with the three rules, and the code-review skill lists `.github/instructions/*.md` as a standards source.
- [ ] A review of a diff that adds an uncited `az --query` path to a workflow reports it as a finding (dry run of the code-review skill).
- [ ] E2E exception: agent tooling and docs only, no user-visible change; no new logic to unit test.

## Refinement Protocol
Change `.claude/settings.json`, `docs/infrastructure/dev-environment-setup.md`, `.github/instructions/workflows.instructions.md`, the code-review skill and the agent definitions together.

## Follow-ups
