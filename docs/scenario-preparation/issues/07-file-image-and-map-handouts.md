---
id: PBI-SP-007
status: done
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
- [x] A Keeper can attach, replace, and delete Image, Document, and Map Handouts on a Prepared or Active Scene.
- [x] Files are stored durably and served only to the Keeper through Scenario Preparation.
- [x] Storage failures leave no orphaned Handout and show an error to the Keeper.
- [x] Unit, integration, and E2E tests cover upload, authorization, and failure handling.

## Refinement Protocol
Allowed media types, the maximum file size, and how a Reveal snapshots a file (a copied blob or an immutable version) are decided before implementation and recorded in the spec; the snapshot rule is coordinated with the PBI-SPL-001 design record.

## Follow-ups
- Interactive maps with tokens and fog of war.
- Terraform: provision the Handout storage account and the private `handout-files` container, and switch the API from the connection string to a managed identity (`Azure:Storage:ConnectionString` today).
- Orphaned-blob sweep: a failed compensation or post-commit delete leaves a logged blob without a Handout (PBI-SP-007 D5); add a periodic sweep that removes blobs no Handout row refers to.
- Image description field: Players will see images in PBI-SPL-002, so decide there whether a Handout needs a description for screen-reader users beside the title (deferred in ux.md section 49).
