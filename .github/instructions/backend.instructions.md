---
applyTo: "backend/**/*.cs"
---

# Backend Conventions

- Target .NET 10 and nullable reference types.
- Use ASP.NET Core controllers for HTTP endpoints.
- Keep controllers focused on HTTP concerns; place business rules in testable application services.
- Return explicit HTTP results and validate request models at the API boundary.
- Use async APIs for I/O and accept `CancellationToken` where appropriate.
- Add xUnit tests for endpoint and application behavior.
- Do not place secrets or connection strings in source files.
