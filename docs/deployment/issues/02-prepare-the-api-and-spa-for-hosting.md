---
id: PBI-DEP-002
status: todo
blocked_by: []
---

# PBI-DEP-002: Prepare the API and SPA for Hosting

## Directive
Make the API and the SPA run correctly as separate origins behind Azure ingress, from a container image, with a database that may be paused, without changing local development or E2E behavior.

**Scope:**
- **API:** anonymous `GET /health` that never opens a database connection; a CORS policy from `Cors:AllowedOrigins` with credentials for `/api/**` and the SignalR hub; forwarded headers from the ingress; `EnableRetryOnFailure` with at least a 60-second window on all three DbContexts; the transaction in `EfSceneRepository` run inside the execution strategy; `appsettings.Staging.json`.
- **Image:** `backend/Dockerfile`, multi-stage, repository root as build context, listening on port 8080.
- **SPA:** `VITE_API_BASE_URL` prefixes `/api` requests and the hub URL, relative when unset; `frontend/public/staticwebapp.config.json` with a navigation fallback.
- **Out of scope:** Azure resources and workflows.

## Dependencies
- Blocked by: None
- Must merge before: PBI-DEP-005 (deploys this image and SPA build)

## Context
Read: `specs/deployment/spec.md` (Application changes, API configuration in `dev`), ADR 0031, `backend/src/CocAssistant.Api/Program.cs`, `backend/src/CocAssistant.Api/LiveTransportRegistration.cs`, `frontend/src/shared/services/liveConnection.ts`, `frontend/src/shared/services/accountApi.ts`
- No UX design is needed: nothing in the UI changes. The E2E suite must pass unchanged with `VITE_API_BASE_URL` unset.
- Keep startup migrations and OpenAPI limited to `Development`.

## Verification
- [ ] Unit tests cover `/health` (200, no database access), the CORS policy (configured origin allowed, other origin refused, no origins configured), each DbContext's retry configuration, the scene transaction under the execution strategy, and the API base URL (set and unset) for API calls and the hub.
- [ ] `docker build -f backend/Dockerfile .` succeeds and the container answers `/health` on port 8080.
- [ ] The full E2E suite passes in CI.

## Refinement Protocol
Change `specs/deployment/spec.md` and ADR 0031 together with the code; ADR 0009 if the hub URL handling changes.

## Follow-ups
