---
id: PBI-SP-005
status: done
blocked_by: [PBI-SP-002]
---

# PBI-SP-005: Rich-Text Scene Handouts

## Directive
Build the end-to-end ability for a Keeper to add ordered rich-text Handouts of kind Read-aloud and Text to a Scene, each with an explicit Player-facing or Keeper-facing visibility. Establish the Handout model that file Handouts (PBI-SP-007) and Item Handouts (PBI-SP-008) extend.

**Scope:**
- **Domain and persistence:** Handout with kind, visibility, title, Lexical content, and position on its Scene; reorder per [ADR 0014](../../adr/0014-order-preparation-records-by-stored-position-with-tie-break.md); read-only on a Finished Scene; a Handout on an Active or Finished Scene cannot be deleted.
- **API and UI:** create, edit, reorder, and delete Handouts on the Scene page, with Read-aloud styled as read-aloud text, designed through the UX designer skill first.
- **Tests:** unit, integration, and E2E coverage, including Player exclusion.
- **Out of scope:** file Handouts and Azure Blob Storage (PBI-SP-007), revealing Handouts (PBI-SPL-002), source-document extraction.

## Dependencies
- Blocked by: PBI-SP-002 (Scenes and the Lexical validator).
- Must merge before: PBI-SP-006, PBI-SP-007, PBI-SP-008; PBI-SPL-002 (Reveals of Handouts).

## Context
Read: `specs/scenario-preparation/spec.md`
- Blueprint: Rich text, Handout kinds.
- Constraints: Handout visibility (the replacement of the deprecated Handout constraint), allowed Lexical nodes, deletion of material referred to by an Active or Finished Scene.
- Regression Guardrails: Keeper-facing material is not exposed to Players by default.
Read: `docs/adr/0015-store-rich-text-as-validated-lexical-json.md`, `CONTEXT.md` (Handout, Read-aloud Handout).

## Verification
- [x] A Keeper can create, edit, reorder, and delete Read-aloud and Text Handouts on a Prepared or Active Scene.
- [x] Each Handout has an explicit Player-facing or Keeper-facing visibility.
- [x] No Player-visible API returns a Handout; changes on a Finished Scene are refused.
- [x] Unit, integration, and E2E tests cover ordering, validation, and authorization.

## Refinement Protocol
If visibility requirements change, update the Contract and Regression Guardrails together. Never weaken the rule that Handouts reach Players only through a Reveal.

## Follow-ups
- PBI-SPL-001 adds the end-to-end coverage that needs Active and Finished Scenes: the Handout controls on an Active Scene (SP-UX-72), the read-only Finished Scene (SP-UX-73), and "A Handout on an Active Scene cannot be deleted"; today they are covered by seeded integration tests (`HandoutApiTests`) and component tests.
- PBI-SPL-002 snapshots a Handout's content into a Reveal and must not let a Reveal block deleting a Handout of a Prepared Scene or the cascade when a Prepared Scene is removed.
- PBI-SP-007 decides how a kind change is refused across the rich-text and file boundary (H2 allows Read-aloud and Text to switch) and whether file kinds introduce a content Strategy.
- PBI-SP-008 adds the nullable `ItemId`, makes `SceneId` nullable, and adds the one-owner check constraint on `Handouts` (ADR 0020).
- Move `read-aloud-text` from Scenario Preparation to `src/shared/` when the Player view of a Reveal needs it (PBI-SPL-002).
- Loading a Scene reads every Handout's content from the database although the response omits it (design record D2, accepted); revisit if Scenes grow many large Handouts.
- The sentence "This Scene has been finished, so it can't be changed. Copy anything you need, then select Cancel." now exists in three places (`scene-page.tsx`, `nonPlayerEntityLinkForm.ts`, `handoutForm.ts`); extract one shared constant.
- Run the Storybook accessibility checks on the new Handout stories (320px reflow, SP-A11Y-43, and the read-aloud panel contrast, SP-A11Y-38): the stories were written and type-checked but Storybook was not run in this pass.
