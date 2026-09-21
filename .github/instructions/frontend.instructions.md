---
applyTo: "frontend/**/*"
---

# Frontend Conventions

## General

- Use React with TypeScript and npm.
- Use functional components only; class components are strictly forbidden.
- Keep components small, accessible, and focused on one responsibility.
- Type component props and API payloads explicitly; `any` is strictly forbidden. Enforce with the `@typescript-eslint/no-explicit-any` ESLint rule.
- Do not commit `.env` files containing secrets or generated `dist` output.

## Project structure

- Structure the app as vertical slices per functionality: `src/<slice-name>/{components,services,types}`, adding `hooks/`, `state/`, and `providers/` subfolders only when a slice has content for them.
- Put cross-cutting code shared by 2+ slices in `src/shared/`, mirroring the same substructure (`components/services/types`, plus `hooks/state/providers` as needed).
- Name slices after the matching `specs/*` folder where one exists (e.g. `campaign-play`, `scenario-preparation`).
- No forced barrel `index.ts` re-exports; import directly from the file that defines the symbol.
- Centralize routing under `src/routes/` using TanStack Router file-based routing; keep route files thin and delegate logic to slice components/hooks.
- each component should live in its own folder under the corresponding slice, folder and component file name should follow the kebab-case convention. Folder should colocate all related files (e.g., component, styles, tests, stories) within the same folder.

## Domain vocabulary

- Follow DDD principles and use the authoritative vocabulary from the root `CONTEXT.md` (and applicable nested context files) for component names, type names, props, and identifiers.
- If a concept has no term in `CONTEXT.md`, flag the gap and update `CONTEXT.md` rather than inventing new terminology.

## Data and state

- Use TanStack Query for server state; keep data-fetching and server state separate from presentational components.
- Define a `queryKeys` factory per slice in its `services/` folder instead of ad hoc query key arrays.
- Validate with zod at both boundaries: parse API responses in the `services/` layer, and validate form input against zod schemas, sharing schemas where shapes overlap.
- Extract a custom hook once a piece of logic is used 2 or more times.
- Use a reducer (e.g. `useReducer`) when a component's state management becomes complex (multiple related state transitions).
- Introduce a context provider once prop drilling would exceed 2 levels. Prefer several fine-grained, single-purpose providers over god providers.

## UI

- Use the shadcn/ui component library, built on Radix primitives, in preference to hand-rolled interactive elements.
- Components and their design must meet WCAG 2.1 AA. Enforce with the `eslint-plugin-jsx-a11y` recommended ruleset.
- Add a colocated Storybook story (`Component.stories.tsx`) for each component.

## Testing

- Use Vitest (Jest-compatible test API) for unit tests.
- Colocate test files as `*.test.ts`/`*.test.tsx` next to the source file they test.
- Add focused tests for user-visible behavior when frontend tests are introduced.
