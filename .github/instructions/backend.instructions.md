---
applyTo: "backend/**/*.cs"
---

# Backend Conventions

- Target .NET 10 and nullable reference types.
- Organize production code by functionality under `backend/src/<Functionality>/`, with projects named `CocAssistant.<Functionality>.Domain`, `.Application`, `.Infrastructure`, and `.Controllers`.
- Treat Domain as the center of the hexagonal architecture: it must not reference any non-Domain project. Application references only its Domain project; Infrastructure implements Domain or Application ports; Controllers call Application services only.
- Keep `CocAssistant.Api` as the composition root. It may reference functionality-specific Controllers and Infrastructure projects, but contains only startup, dependency registration, and cross-cutting HTTP configuration.
- Permit Domain-to-Domain references only for genuine shared domain relationships. Keep other functionality boundaries independent through explicit application ports or events.
- Follow DDD principles. Use the vocabulary in the nearest applicable `CONTEXT.md`, with closer context files taking precedence. Domain entities enforce their invariants, domain services perform domain operations, application services run use cases, and controllers invoke application services.
- Use ASP.NET Core controllers for HTTP endpoints.
- Keep controllers focused on HTTP concerns; place business rules in testable domain or application services.
- Return explicit HTTP results and validate request models at the API boundary.
- Use async APIs for I/O and accept `CancellationToken` where appropriate.
- Prefer functional, side-effect-free LINQ transformations such as `Select`, `Where`, and `OrderBy`. Use method syntax by default; use query syntax only when it improves clarity.
- Add focused xUnit unit-test projects under `backend/tests/<Functionality>/<Functionality>.Tests` for domain and application behavior.
- Add integration tests in the shared `CocAssistant.Api.IntegrationTests` project, organized by functionality. Launch the assembled ASP.NET Core application and make HTTP calls through its configured pipeline; replace only external infrastructure at the composition boundary.
- Use framework-neutral BDD tests where practical, named `Given_<context>_When_<action>_Then_<outcome>`. Provide entity builders and use-case builders or helpers that use domain vocabulary.
- Do not place secrets or connection strings in source files.
- Do not place using directives at the top of the files; use global using directives in a separate file instead.
- Prefer testable code - avoid side effects unless absolutely necessary. It should be possible to test these services in isolation without relying on external infrastructure or side effects. It should reduce the neccessity for mocking.
- Follow the principle of dependency inversion: high-level modules should not depend on low-level modules; both should depend on abstractions.
