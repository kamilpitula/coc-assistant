# Handout files are immutable blobs behind a Scenario Preparation storage port

Status: Accepted; amended for Items by [ADR 0022](0022-items-are-guarded-by-play-usage-read-through-ports.md)

Image, Document, and Map Handouts hold one file, stored durably in Azure Blob Storage and served only to the Keeper ([specs/scenario-preparation/spec.md](../../specs/scenario-preparation/spec.md), Architecture and Constraints). Local development, integration tests, and E2E must run without Azure. A Reveal in Scene Play snapshots a Handout's Player-facing content ([specs/scene-play/spec.md](../../specs/scene-play/spec.md)), and the PBI-SPL-001 design record does not exist yet, so the file snapshot rule is fixed here. SQL Server and Blob Storage share no transaction. The design is recorded in the [PBI-SP-007 design record](../scenario-preparation/issues/07-file-image-and-map-handouts.design.md).

## Decision
- **Port:** Scenario Preparation owns `IHandoutFileStore` (save, open for reading, idempotent delete) in its Application layer, with adapters in its Infrastructure layer ([ADR 0008](0008-cross-functionality-reads-through-a-consumer-owned-port.md) style). Azure Blob Storage (`Azure.Storage.Blobs`, private container `handout-files`) is used when `Azure:Storage:ConnectionString` is set; otherwise a filesystem adapter at `HandoutFiles:LocalDirectory`. With neither set, the store fails on first use in every environment; there is no silent fallback.
- **Immutable keys:** every upload is stored under a new random key and never overwritten. The file's key, name, media type, and size are columns of the `Handouts` table ([ADR 0020](0020-handouts-are-child-entities-of-their-owner-in-one-table.md)).
- **Write order:** the Scene aggregate validates first, then the blob is stored, then SQL is committed. A failed commit deletes the new blob on a best-effort basis. A Handout row therefore never exists without its blob; the worst case is a logged orphaned blob.
- **Deletion:** Scenario Preparation deletes a blob only when its Scene is Prepared at the time of the write: deleting a Handout, replacing its file, or removing the Scene. A Reveal needs an Active Scene and a Scene never returns to Prepared, so such a blob was never revealed. Blobs of Active and Finished Scenes are never deleted.
- **Delivery:** files reach the Keeper only through a Keeper-checked API endpoint that streams the stored bytes with the stored, signature-detected media type and `X-Content-Type-Options: nosniff`. No SAS URLs and no public containers.
- **Scene Play (PBI-SPL-001, PBI-SPL-002) must honor:**
  1. A Reveal of a file Handout snapshots its key, name, media type, and size as they were when revealed; it never copies the bytes.
  2. Scene Play reads a snapshotted file only through a Scenario Preparation read port and never deletes or overwrites it.
  3. A Scene status transition must conflict with a concurrent Handout write on the same Scene, so a replace that loaded a Prepared Scene cannot delete a blob revealed by a racing start.

## Considered Options
- A shared, context-neutral blob storage abstraction. Rejected: speculative until the Scenario source document flow exists.
- Copying the blob into a Scene Play container on each Reveal. Rejected: a second storage write path in Scene Play, when the Prepared-only deletion rule already keeps revealed files.
- Short-lived SAS URLs for downloads. Rejected: a second authorization path with no local equivalent.
- Committing SQL first with a pending state, or an outbox. Rejected: pending Handouts and new infrastructure.
- An in-memory fallback like SignalR's. Rejected: files would vanish on restart while their rows remain.
- Port, immutable keys, store-then-commit, Prepared-only deletion, streamed delivery (chosen).

## Consequences
- Files replaced on an Active Scene are kept even if never revealed.
- A failed compensation or post-commit delete leaves an orphaned blob, logged with its key; a cleanup sweep is a follow-up.
- Up to 20 MB per file passes through the API on upload and download.
- Running the integration suite locally needs Azurite for the Azure adapter's contract tests; CI runs an Azurite service container.
- Provisioning the storage account in Terraform, and managed identity instead of a connection string, are deferred until the environments are defined.
