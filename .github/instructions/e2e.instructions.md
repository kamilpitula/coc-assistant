---
applyTo: "E2E/**/*"
---

# E2E Conventions

- Use Playwright with TypeScript and npm.
- Prefer user-visible locators and stable accessibility roles over CSS implementation details.
- Keep tests independent and deterministic; avoid fixed sleeps.
- Configure the application origin through `BASE_URL`.
- Keep test data isolated and clean up resources created by a test.
