# Design: PBI-DEP-002: Run the API and SPA as separate origins behind Azure ingress, from a container, against a pausable database, without changing local development or E2E

## Triggers
- 3 (new cross-layer pattern): CORS, forwarded headers, and a health endpoint in the pipeline; a frontend-wide API URL convention.
- 5 (more than one bounded context): the DbContext registrations of Identity, CampaignPlay, and ScenarioPreparation, and the ScenarioPreparation transaction.
- 6 (open questions with competing answers): Explorer questions (a)-(h).
- 2 (shared interface): the three `Add<Context>Infrastructure` signatures gain a parameter (D1).
- 7 (UX) does not apply: no UI changes (PBI Context: "No UX design is needed"); no `ux.md`. UX gate skipped deliberately.

## Constraints
- `specs/deployment/spec.md`, Application changes (lines 49-55) and API configuration in `dev` (lines 43-48); Regression Guardrails (`/health` never touches the database; relative URLs exactly as before with `VITE_API_BASE_URL` unset).
- ADR 0031: separate origins; `VITE_API_BASE_URL` prefixes API and hub URLs; CORS allows the SPA origin; retry window >= 60 s; `/health` off the database; Staging; startup migrations stay Development-only.
- ADR 0009: hub at `/hubs/campaign`; Azure SignalR only when `Azure:SignalR:ConnectionString` is set; `liveConnection.ts` has no feature concepts. Its open consequence "Production hosting must allow cross-origin negotiate..." is settled here.
- ADR 0025: finish-then-start is the only explicit transaction (`EfSceneRepository.cs:99-114`); "Nothing retries a finish-then-start"; race outcomes map to 409 through `SceneSaveChanges.ExecuteAsync` (`SceneSaveChanges.cs:33-59`), with SQL Server and SQLite markers.
- ADR 0027: `src/shared/` imports no slice (`frontend/eslint.config.js:41-63`).
- Existing patterns: Api static `*Registration` classes with constants (`LiveTransportRegistration.cs:8-30`); pure `buildMsalConfig(env)` plus test (`buildMsalConfig.ts:39`); `CompositionRootTestFactory` boots the Testing environment with no database (`CompositionRootTestFactory.cs:9-22`); `SceneLifecycleSqlServerTests` runs the real Program on SQL Server.
- Cyclomatic complexity <= 10: no new ESLint baseline entries, no CA1502 suppressions (the Api has no `GlobalSuppressions`).
- `CONTEXT.md`: no new domain term; all new names are technical (`apiFetch`, `apiUrl`, `DatabaseRetryPolicy`).

## UX
- Not applicable: no UI changes; the existing E2E suite passes unchanged.

## Decisions

### D1: Where the retry policy lives (a)
| Metric | A: Composition root supplies it | B: Inline per registration | C: New shared infrastructure project |
| --- | --- | --- | --- |
| Consistency | + Hosting policy in the Api next to `LiveTransportRegistration` | + Matches today's per-context `UseSqlServer` | - New project kind for two numbers |
| Modifiability | + One edit changes the window | - Three copies drift | 0 One place, but a new reference from every context |
| Testability | + Window testable against one constant; each context checked for `RetriesOnFailure` | - Parameters only reachable through reflection | 0 Same as A |
| Simplicity | 0 One small class; one parameter on three methods | + Three lines | - New csproj, solution entry, references |
| Reversibility | + Easy | + Easy | - Removing a project later is costly |
| Security and correctness | + Required parameter, cannot be forgotten | 0 Copy slip possible | 0 |

- **Chosen:** A. `Add<Context>Infrastructure(services, configuration, Action<SqlServerDbContextOptionsBuilder> configureSqlServer)` (required) applies it inside its `UseSqlServer` after its own `MigrationsHistoryTable`. New `CocAssistant.Api/DatabaseRetryPolicy.cs`: `MaxRetryCount = 8`, `MaxRetryDelay = 15 s`, `Apply(SqlServerDbContextOptionsBuilder sql) => sql.EnableRetryOnFailure(MaxRetryCount, MaxRetryDelay, errorNumbersToAdd: null)`. Program passes `DatabaseRetryPolicy.Apply` to all three. With EF's backoff (0/1, 1/3, 3/7, 7/15, capped at 15 s) eight retries wait at least about 71 s (>= 60 s) and at most about 100 s, under the 240 s Container Apps ingress request timeout. The two callers in `HandoutFileStoreRegistrationTests` pass `_ => { }`. Deciding: modifiability, testability. Giving up: three public signatures change.
- **Rejected:** B - three copies of a policy that drift, with untestable parameters. C - speculative project. Also rejected: `services.ConfigureDbContext<T>` from the Api - its ordering and merge with `AddDbContext` is unverified. The Developer must not reintroduce these.

### D2: The Scene transaction inside the execution strategy (b)
A retrying strategy throws on a `BeginTransactionAsync` outside `strategy.ExecuteAsync`. A full retry is unsafe: the first `SaveChangesAsync` accepts its changes and `startScene()` mutates the aggregate in memory, so a replay skips the finish or re-invokes `startScene()` on an already Active Scene.

| Metric | A: Retry the whole transaction (EF docs pattern) | B: Inside the strategy, single attempt | C: Per-call `SqlServerRetryingExecutionStrategy(ctx, 0)` |
| --- | --- | --- | --- |
| Consistency | - Breaks ADR 0025 "Nothing retries a finish-then-start" | + Keeps ADR 0025; works with any configured strategy (SQLite or SQL Server) | - Provider-specific type in a repository tested on SQLite |
| Modifiability | 0 | + One small helper | 0 |
| Testability | 0 | + A fake `IExecutionStrategy` proves the second call is refused; SQL Server tests prove it runs | - Relies on unverified EF internals (`ExecutionStrategy.Current`) |
| Simplicity | + Fewest lines | 0 One helper of about 15 lines | 0 |
| Reversibility | + | + | + |
| Security and correctness | - Replay can write a start without the finish, or throw from `startScene` | + First attempt's outcome stands; no partial replay | 0 Likely correct but unverified |

- **Chosen:** B. `internal static class SingleAttemptExecution` in `CocAssistant.ScenarioPreparation.Infrastructure` with `ExecuteOnceAsync(IExecutionStrategy strategy, Func<Task> operation)`: runs `operation` via `strategy.ExecuteAsync`; if the strategy invokes it a second time, throws `InvalidOperationException("A finish-then-start is not retried (ADR 0025).", firstAttemptException)` (captured in a try/catch that rethrows). Order: `SceneSaveChanges.ExecuteAsync(_dbContext, () => SingleAttemptExecution.ExecuteOnceAsync(_dbContext.Database.CreateExecutionStrategy(), <existing transaction body>))`. Non-transient `DbUpdateException` and `DbUpdateConcurrencyException` pass through the strategy unchanged, so the 409 mapping is preserved. A transient failure inside the transaction becomes an unmapped `InvalidOperationException` (500), as any unrecoverable database failure does today. Add `<InternalsVisibleTo Include="CocAssistant.ScenarioPreparation.Tests" />` to the Infrastructure csproj, as the Domain csproj does (`CocAssistant.ScenarioPreparation.Domain.csproj:10`). Deciding: correctness, consistency with ADR 0025. Giving up: automatic retry of a transient failure in the middle of this one transaction; the database is already awake there (the Scenes were just loaded in the same request), and the Keeper can retry the start, which re-reads state.
- **Rejected:** A - unsafe replay, contradicts ADR 0025. C - unverified internals and a SQL Server type in SQLite-tested code. The Developer must not reintroduce either.

### D3: CORS (c)
| Metric | A: Named policy on endpoints (`RequireCors` on controllers and hub) | B: Global `UseCors(policy)` |
| --- | --- | --- |
| Consistency | + Matches the spec "for `/api/**` and the SignalR hub" | 0 Also covers `/health` and OpenAPI |
| Modifiability | + New endpoint groups opt in explicitly | 0 |
| Testability | + Preflights against `/api/...` and `/hubs/campaign/negotiate` | + |
| Simplicity | 0 Two `.RequireCors(...)` calls | + One line |
| Reversibility | + | + |
| Security and correctness | + Cross-origin only where intended | 0 Broader than needed |

- **Chosen:** A. New `CocAssistant.Api/CrossOriginRegistration.cs`: `PolicyName = "Spa"`, `AllowedOriginsKey = "Cors:AllowedOrigins"`; `ReadAllowedOrigins(IConfiguration)` reads a string array, trims whitespace and one trailing `/`, drops empties, and returns an empty list when unset; `AddCrossOrigin(services, configuration)` registers `WithOrigins(origins).AllowAnyHeader().AllowAnyMethod().AllowCredentials().SetPreflightMaxAge(10 min)`. Program: `app.UseCors()` (no default policy), then `MapControllers().RequireCors(PolicyName)` and `MapCampaignHub().RequireCors(PolicyName)` (`MapCampaignHub` returns `HubEndpointConventionBuilder`, `CampaignLiveUpdatesExtensions.cs:14`). No origins configured means a policy with no origins, so no cross-origin request is allowed - identical to today locally and in E2E. Credentials only with explicit origins; a `*` entry fails at startup because ASP.NET refuses `AllowCredentials` with any origin. `/health` is not covered: probes are same-origin and send no `Origin`. The preflight max age halves requests to a cold, scale-to-zero API, since every bearer request is preflighted.
- **Single option, configuration shape:** `Cors:AllowedOrigins` is an array bound with `GetSection(...).Get<string[]>()`; in Azure the variable is `Cors__AllowedOrigins__0`. A scalar `Cors__AllowedOrigins` would not bind to an array, so `spec.md` line 48 changes (see ADR section).
- **Rejected:** B - broader than the spec. A comma-separated scalar - a second configuration idiom where arrays already work.

### D4: Forwarded headers (d)
| Metric | A: Always on, trust any proxy | B: Config-gated, on in Staging | C: Framework `ASPNETCORE_FORWARDEDHEADERS_ENABLED` set by Terraform |
| --- | --- | --- | --- |
| Consistency | + Explicit Api registration like the others | 0 New flag | - App correctness depends on infrastructure PBIs |
| Testability | + Options checked in `CompositionRootTestFactory` | + Both states | - Outside app tests |
| Simplicity | + No branch | 0 One conditional | + No code |
| Reversibility | + | + | + |
| Security and correctness | 0 Spoofable if the API were directly reachable; in Container Apps the ingress is the only path, and no code reads `RemoteIpAddress` or `Scheme` (grep of `backend/src`: none) | + | 0 |

- **Chosen:** A. New `CocAssistant.Api/ForwardedHeadersRegistration.cs`: `AddIngressForwardedHeaders(services)` configures `ForwardedHeadersOptions` with `ForwardedHeaders = XForwardedFor | XForwardedProto` and clears `KnownIPNetworks` and `KnownProxies` (net10 renamed `KnownNetworks`; use the non-obsolete name). `app.UseForwardedHeaders()` is the first middleware in Program, before the Development block and `UseHttpsRedirection`. Locally and in E2E no proxy sends X-Forwarded headers (the Vite proxy does not set `xfwd`), so behavior is unchanged.
- **Single option, HTTPS redirection:** `UseHttpsRedirection` stays. In the container Kestrel listens on HTTP 8080 with no HTTPS port, so it never redirects; ingress requests carry `X-Forwarded-Proto: https` and count as HTTPS. E2E keeps https://localhost:5059.
- **Rejected:** B - a flag with no environment that needs it off. C - moves an app behavior into Terraform.

### D5: The `/health` endpoint (e)
| Metric | A: `AddHealthChecks()` with no checks + `MapHealthChecks("/health").AllowAnonymous()` | B: `MapGet("/health", ...)` |
| --- | --- | --- |
| Consistency | + Framework idiom for probes | 0 Hand-rolled |
| Simplicity | + Two lines | + One line |
| Security and correctness | 0 Invites a later `AddDbContextCheck`; invariant and test guard it | + Nothing to misconfigure |

- **Chosen:** A - the standard probe shape (200 "Healthy", 503 if a check is ever registered); `.AllowAnonymous()` keeps it public if a fallback policy is added later. Giving up: an open door to a database check, closed by the invariant and the test.
- **Rejected:** B - marginally simpler only.

### D6: Frontend API base URL (f)
| Metric | A: `apiFetch(path, init)` everywhere, ESLint-enforced | B: Wrap each URL builder or literal in `apiUrl(...)` | C: Patch `window.fetch` globally at startup |
| --- | --- | --- | --- |
| Consistency | + One shared helper in `shared/services/` like `buildMsalConfig` | + One helper too | - Hidden global side effect |
| Modifiability | + Every request passes one point | - A new URL builder can forget the wrap | - |
| Testability | + Existing tests stubbing `fetch` still see `/api/...` when unset; `apiFetch` gets set/unset tests | + Same | - Hard to test |
| Simplicity | 0 68 mechanical call-site renames plus imports in 20 service files | 0 About 45 sites, each needing judgment | + Near-zero churn |
| Reversibility | + | + | 0 |
| Security and correctness | + `no-restricted-globals` makes a missed site a lint error | - A miss is silent | - Rewrites any `/api` fetch, including third-party |

- **Chosen:** A. Deciding: an enforced rule over call-site discipline. Giving up: a rename across 68 calls (the Explorer said about 73; 68 global `fetch(` calls were counted, all in `*/services/*.ts`).
  - `src/shared/services/apiUrl.ts`: pure `buildApiUrl(baseUrl: string | undefined, path: string): string` - trims the base; undefined or empty returns `path` unchanged; otherwise strips trailing `/` from the base and returns `base + path`. `apiUrl(path)` reads `import.meta.env.VITE_API_BASE_URL` at call time, so `vi.stubEnv` works.
  - `src/shared/services/apiFetch.ts`: `apiFetch(path: string, init?: RequestInit) => fetch(apiUrl(path), init)`.
  - Hub: `campaign-live-connection.tsx:45` passes `url: apiUrl(CAMPAIGN_HUB_URL)`. `liveConnection.ts` is unchanged (ADR 0009 reuse).
  - ESLint: `no-restricted-globals` on `fetch` for `src/**/*.{ts,tsx}`, excluding `src/shared/services/apiFetch.ts`, `**/*.test.{ts,tsx}`, `**/*.stories.tsx`, and `src/shared/test-support/**`; add a case to `frontend/eslint.config.test.ts` if it covers rules.
  - `vite-env.d.ts`: `readonly VITE_API_BASE_URL?: string`. `.env.example`: `VITE_API_BASE_URL=` with "empty locally; the Vite proxy serves /api and /hubs".
- **Rejected:** B - a missed builder is silent. C - hidden global behavior. A class-based `ApiClient` that also adds auth headers - speculative, out of scope.

### Single-option decisions
- Staging settings (g): `appsettings.Staging.json` holds only `Logging.LogLevel` (`Default: Information`, `Microsoft.AspNetCore: Warning`, `Microsoft.EntityFrameworkCore: Warning`), keeping volume under the 0.15 GB/day Log Analytics cap. All environment values come from Container App variables (spec Constraints: no environment-specific configuration in the image).
- Dockerfile (h): `backend/Dockerfile`, repository root as context. Stage `build` from `mcr.microsoft.com/dotnet/sdk:10.0`: copy `global.json` (10.0.103 with `latestFeature` accepts the image SDK), `backend/Directory.Build.props`, `backend/CodeMetricsConfig.txt`, `backend/.editorconfig`, and the `src` csproj files; restore; copy `backend/src` and `docs/game-rules/catalogs` (embedded resources, `CocAssistant.CampaignPlay.Infrastructure.csproj:19-34`); `dotnet publish backend/src/CocAssistant.Api/CocAssistant.Api.csproj -c Release -o /app --no-restore`. Stage `final` from `mcr.microsoft.com/dotnet/aspnet:10.0`: `WORKDIR /app`, `COPY --from=build`, `ENV ASPNETCORE_HTTP_PORTS=8080`, `EXPOSE 8080`, `USER $APP_UID` (the image's non-root user), `ENTRYPOINT ["dotnet", "CocAssistant.Api.dll"]`. No `HEALTHCHECK` (no curl in the image; Container Apps probes `/health`). Floating `10.0` tags so patches arrive on rebuild; digest pinning rejected (manual bumps, no Dependabot docker configuration).
- `.dockerignore` (h): at the repository root, allowlist: `*`, then `!global.json`, `!backend/`, `!docs/game-rules/catalogs/`, then exclude `**/bin/`, `**/obj/`, `backend/tests/`, `backend/src/CocAssistant.Api/App_Data/`. A `backend/Dockerfile.dockerignore` is rejected: only BuildKit reads it.
- SPA fallback: `frontend/public/staticwebapp.config.json` with `{"navigationFallback": {"rewrite": "/index.html", "exclude": ["/assets/*", "/*.svg"]}}`; Vite copies it to the `dist` root. Declarative configuration, no unit test.

## Patterns
- **Used:** Strategy (EF's `IExecutionStrategy`) configured through `DatabaseRetryPolicy` - force: retry behavior varies by provider and host (SQLite non-retrying in tests, SQL Server retrying in Azure). Reuses EF's pattern; nothing new.
- **Used:** Decorator as a function wrapper - `SingleAttemptExecution.ExecuteOnceAsync` around the transaction body (force: a cross-cutting "refuse replay" rule around one operation) and `apiFetch` around `fetch` (force: a cross-cutting URL prefix on every request).
- **Rejected:** Chain of Responsibility for the pipeline - ASP.NET middleware already is one. Adapter or Facade as an `ApiClient` class - speculative. Template Method for the three registrations - one parameter suffices.

## Invariants
- `/health` is anonymous, returns 200, and never resolves a DbContext or opens a connection; no database-touching `IHealthCheck` is registered.
- With no `Cors:AllowedOrigins`, no response carries `Access-Control-Allow-Origin`. Credentials only with explicit origins. CORS applies only to controllers and the Campaign hub (including negotiate).
- All three DbContexts retry with a minimum total delay of at least 60 s; EF design-time (`dotnet ef database update` in E2E `globalSetup`) and the Development `MigrateAsync` keep working.
- The finish-then-start transaction runs inside the context's execution strategy and is never replayed; `SceneSaveChanges` mapping stays outermost and unchanged, keeping both SQL Server and SQLite markers. It remains the only `BeginTransactionAsync` (ADR 0025).
- With `VITE_API_BASE_URL` unset or empty, every request URL and the hub URL are exactly today's relative strings.
- OpenAPI and startup migrations stay inside `IsDevelopment()`. The image holds no secrets or environment values.
- Complexity <= 10 with no new baselines or suppressions.

## Implementation plan
1. `CocAssistant.Api/DatabaseRetryPolicy.cs`; add the `configureSqlServer` parameter to `IdentityInfrastructureServiceCollectionExtensions.cs:5-8`, `CampaignPlayInfrastructureServiceCollectionExtensions.cs:5-14`, `ScenarioPreparationInfrastructureServiceCollectionExtensions.cs:5-10`; Program passes `DatabaseRetryPolicy.Apply`; update `HandoutFileStoreRegistrationTests.cs` (lines 16, 55). Enabling retry first turns `SceneLifecycleSqlServerTests` red for step 2.
2. `SingleAttemptExecution.cs` and `EfSceneRepository.SaveFinishThenStartAsync` (D2); `InternalsVisibleTo` in the csproj.
3. `CrossOriginRegistration.cs`, `ForwardedHeadersRegistration.cs`, health checks; Program order: `UseForwardedHeaders` -> Development block -> `UseHttpsRedirection` -> `UseCors` -> `UseAuthentication` -> `UseAuthorization` -> `MapHealthChecks(...).AllowAnonymous()`, `MapControllers().RequireCors(...)`, `MapCampaignHub().RequireCors(...)`.
4. `appsettings.Staging.json`.
5. `backend/Dockerfile`, root `.dockerignore`; verify manually: `docker build -f backend/Dockerfile .`, run with `-p 8080:8080`, `curl localhost:8080/health` returns 200.
6. Frontend: `apiUrl.ts`, `apiFetch.ts` with tests, the 68 call-site renames, hub URL, `vite-env.d.ts`, `.env.example`, ESLint rule, `staticwebapp.config.json`.
7. Docs (Refinement Protocol): the `spec.md` edits listed under ADR.

## Reuse
- Using: `CompositionRootTestFactory` for `/health`, CORS, forwarded-header, and retry tests (add a subclass or constructor taking extra in-memory settings); `SceneLifecycleSqlServerTests` / `IdentityApiFactory` as the SQL Server proof of the transaction under a retrying strategy; the `buildMsalConfig` pure-function-plus-test shape for `buildApiUrl`; EF's `SqlServerRetryingExecutionStrategy`.
- Not using: the Vite proxy in production (ADR 0031); a new shared backend project (D1).

## TDD units
- Api.Tests:
  - `GET /health` without auth returns 200.
  - `GET /health` with every DbContext registration replaced by a throwing factory still returns 200 (no context resolved).
  - Preflight `OPTIONS /api/account/me` from a configured origin (with `Access-Control-Request-Method: GET` and `Access-Control-Request-Headers: authorization`) returns ACAO for that origin and `Access-Control-Allow-Credentials: true`.
  - The same preflight to `/hubs/campaign/negotiate` (POST) is allowed.
  - Another origin: no ACAO. No origins configured: no ACAO.
  - `ReadAllowedOrigins` trims whitespace and a trailing slash and drops empties.
  - `ForwardedHeadersOptions` has XForwardedFor|XForwardedProto with empty known networks and proxies.
  - Each of the 3 DbContexts: `Database.CreateExecutionStrategy()` is a `SqlServerRetryingExecutionStrategy` with `RetriesOnFailure` true.
  - The sum of `GetNextDelay` over `DatabaseRetryPolicy` is >= 60 s, using a test subclass of `SqlServerRetryingExecutionStrategy` that fills `ExceptionsEncountered`. If that protected surface is unreachable, escalate; do not use reflection.
- ScenarioPreparation.Tests:
  - `ExecuteOnceAsync` runs the operation once.
  - A fake strategy invoking it twice gets `InvalidOperationException` whose inner exception is the first attempt's.
  - A non-transient exception propagates unchanged.
  - Existing SQLite `SceneLifecycleServiceTests` stay green, including conflict mappings.
- IntegrationTests: existing `SceneLifecycleSqlServerTests` pass with retry enabled (the "scene transaction under the execution strategy" verification).
- Vitest:
  - `buildApiUrl`: undefined, empty, and whitespace bases return the path unchanged; `https://api.example` and `https://api.example/` both give `https://api.example/api/x`.
  - `apiFetch` calls `fetch` with the relative URL when unset and the prefixed URL when set (`vi.stubEnv`).
  - The Campaign live connection is created with `/hubs/campaign` when unset and `<base>/hubs/campaign` when set.
  - Existing service tests stay green without edits.

## E2E coverage
- Stated exception: no user-visible change. The existing suite runs unchanged with `VITE_API_BASE_URL` unset; with the Vitest unit it covers the spec scenario "Local development keeps relative URLs".
- Spec scenarios "The SPA calls the API across origins" and "The API refuses an unknown origin" are covered by the Api.Tests CORS units; their deployed form is verified in PBI-DEP-005/006 (Playwright has no cross-origin harness).
- No UX acceptance criteria are touched (no `ux.md`).

## ADR
- None new: these are host configuration choices that ADR 0031 already decides.
- ADR 0031 amended (Amendments section, PBI-DEP-002): how the API URL, CORS, forwarded headers, and retry are applied, and that the finish-then-start transaction runs as a single attempt.
- ADR 0009 amended: the cross-origin hosting consequence is resolved by ADR 0031; the hub URL is prefixed through `apiUrl` with `liveConnection.ts` unchanged.
- Spec edits (Developer, with the code, per the Refinement Protocol): `spec.md:48` `Cors__AllowedOrigins` -> `Cors__AllowedOrigins__0` (array); `spec.md:53` add "as a single attempt, never replayed (ADR 0025)".

## Phases
- Phase 1: DbContext retry and the single-attempt Scene transaction; checkpoint: `feat(api): retry transient SQL failures on all DbContexts (PBI-DEP-002)`
- Phase 2: health, CORS, forwarded headers, Staging settings; checkpoint: `feat(api): health, CORS, and forwarded headers for hosting (PBI-DEP-002)`
- Phase 3: Dockerfile and `.dockerignore`; checkpoint: `build(api): container image on port 8080 (PBI-DEP-002)`
- Phase 4: frontend `apiUrl`/`apiFetch`, hub URL, ESLint rule, `staticwebapp.config.json`; checkpoint: `feat(frontend): API base URL for cross-origin hosting (PBI-DEP-002)`
- Phase 5: `spec.md` edits; checkpoint: `docs(deployment): record hosting details (PBI-DEP-002)`

## Human decisions
- 2026-11-09: the decision record was approved as written, with no changes ("approve").
- 2026-11-09: branch base - "branch from master it's already up to date". The branch was created from `origin/master` (4bcdce6), which contains the PBI file, `specs/deployment/spec.md`, and ADR 0031; the local `master` ref was stale.
- 2026-11-09: the CORS variable name `Cors__AllowedOrigins__0` (array shape, D3) is confirmed by approving the record that contains it.

## Revisions
