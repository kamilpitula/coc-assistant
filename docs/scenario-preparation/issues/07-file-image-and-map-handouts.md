---
id: PBI-SP-007
status: todo
blocked_by: [PBI-SP-005]
---

# PBI-SP-007: File, Image, and Map Handouts

## Directive
Build the end-to-end ability for a Keeper to attach Image, Document, and Map Handouts to a Scene, stored durably in Azure Blob Storage, with the same visibility and ordering as rich-text Handouts.

**Scope:**
- **Storage:** Azure Blob Storage integration for Handout files, with local and test configuration that runs without Azure.
- **Domain, API, UI:** upload, replace, download for the Keeper, and delete on the Scene page, designed through the UX designer skill first.
- **Tests:** unit, integration, and E2E coverage, including storage failure handling and Player exclusion.
- **Out of scope:** interactive maps (tokens, fog of war), revealing files to Players (PBI-SPL-002), uploaded Scenario source documents.

## Dependencies
- Blocked by: PBI-SP-005 (the Handout model).
- Must merge before: PBI-SP-006.

## Context
Read: `specs/scenario-preparation/spec.md`
- Blueprint: Handout kinds, File storage.
- Constraints: Handout visibility; deletion of material referred to by an Active or Finished Scene.
Read: `CONTEXT.md` (Handout, Map).

## Verification
- [ ] A Keeper can attach, replace, and delete Image, Document, and Map Handouts on a Prepared or Active Scene.
- [ ] Files are stored durably and served only to the Keeper through Scenario Preparation.
- [ ] Storage failures leave no orphaned Handout and show an error to the Keeper.
- [ ] Unit, integration, and E2E tests cover upload, authorization, and failure handling.

## Refinement Protocol
Allowed media types, the maximum file size, and how a Reveal snapshots a file (a copied blob or an immutable version) are decided before implementation and recorded in the spec; the snapshot rule is coordinated with the PBI-SPL-001 design record.

## Follow-ups
- Interactive maps with tokens and fog of war.
