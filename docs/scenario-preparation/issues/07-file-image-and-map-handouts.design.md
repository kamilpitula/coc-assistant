# Design: PBI-SP-007: Image, Document, and Map Handouts on a Scene, stored in Azure Blob Storage, Keeper-only

## Triggers
- 1 (new dependency): `Azure.Storage.Blobs`, and an Azurite service container in CI for the adapter contract tests. Today the only Azure packages are SignalR and Identity.Web (`backend/src/CocAssistant.Api/CocAssistant.Api.csproj:11-12`).
- 2 (data model): `Handouts` gains file columns, `Content` becomes nullable, and a check constraint is added. Today `Content` is required (`ScenarioPreparationDbContext.cs:118`) and `Handout` has no file fields (`Handout.cs:12-24`).
- 3 (cross-layer pattern): a storage port with Azure and local adapters, multipart upload, and a streamed download; none exists in the repo.
- 4 (ADR): ADR 0021, storage port, immutable blobs, and the Reveal snapshot rule.
- 6 (inherited open questions): how a kind change across the rich-text/file boundary is refused (PBI-SP-005 design record, Single-option "Kind change"), and the content Strategy rejected pending a real force (PBI-SP-005 design record, Patterns).
- 7 (UX): Option A selected at the UX gate.

## Constraints
- ADR 0020: one `Handouts` table; Handouts change only through the Scene; file kinds add columns to the same table; no `IHandoutRepository`; the Scene response carries summaries only.
- ADR 0019: status checked first in every child write; Scene removal cascades. ADR 0013: Keeper check first, 404 otherwise. ADR 0016: lookups filter Campaign, Scenario, and Scene. ADR 0014: order. ADR 0018: 400 keyed by camelCase path, server-owned messages. ADR 0008: cross-context reads through a consumer-owned port (Scene Play will read files this way). ADR 0009 and ADR 0012: SignalR, not used here (only the Keeper sees Handouts; PBI-SP-005 design record, "No SignalR").
- `specs/scenario-preparation/spec.md` (lines on `master` before this design's edits): l.25 (Handout API), l.35 (kinds; a Map is a static image shown prominently), l.38 (File storage), Constraints (edited while Prepared or Active; deleted only while Prepared; l.52 and the guardrail "Material that an Active or Finished Scene refers to is never deleted"; visibility l.68), Guardrails l.94-95 (no Player-visible API returns a Handout), Gherkin l.351-355.
- `specs/scene-play/spec.md`, Architecture (Domain relationships) and Constraints: a Reveal is a snapshot. The PBI-SPL-001 design record does not exist yet; `docs/scene-play/issues/01-start-and-finish-a-scene.md:13` says it decides how file snapshots are stored. This design fixes the rule SPL-001 and SPL-002 must honor (D6, ADR 0021).
- `CONTEXT.md`: Handout (l.113-115; says "either rich text or a file" while listing "file" under Avoid; resolved by R1 at the UX gate), Map (l.121-123; avoid "floor plan"), Reveal.
- Existing patterns relied on:
  - Config-gated Azure service with an in-process fallback (`backend/src/CocAssistant.Api/LiveTransportRegistration.cs:17-30`), config key naming `Azure:SignalR:ConnectionString` (`:11`).
  - Test host swap point (`backend/tests/CocAssistant.Api.IntegrationTests/IdentityApiFactory.cs:10-32`); environment-variable test server with a local fallback (`SqlServerTestConnection.cs:5-25`).
  - Check constraint precedent (`ScenarioPreparationDbContext.cs:91`); Handout cascade from Scene (`ScenarioPreparationDbContext.cs:100-103`).
  - Scene removal (`SceneService.cs:100-115`); Handout write flow (`HandoutService.cs:41-44`, `:110-119`); wire parsing (`HandoutsController.cs:137-149`).
  - `authHeaders` always sets a JSON Content-Type (`frontend/src/campaign-play/services/authHeaders.ts:2-7`).
  - E2E failure paths through route fulfilment (`e2e/tests/scene-handouts.spec.ts:101`, `e2e/tests/campaign-list.spec.ts:277-283`).
- Complexity 10 or below. Scenario Preparation has no `GlobalSuppressions.cs` and no ESLint exemption; no new suppressions. `HandoutService.ToWriteOutcome` (`HandoutService.cs:130-139`) and `HandoutsController.Failure` (`HandoutsController.cs:151-160`) are switch maps that would pass 10 if extended with the file outcomes.
- Game rules: none involved.
- `infrastructure/terraform/main.tf` holds only "Azure resources will be added after environments, SKUs, networking, and identity are defined."
- Background only: PBI-SP-005 design record.

## UX
- Selected option: A, one Add Handout form where the kind decides the content field; Replace lives inside Edit - `specs/scenario-preparation/ux.md` (updated): amendments to sections 40, 41, 43, 45, 46, 47 (SP-UX-66), and 49; new sections 50 to 58 with SP-UX-77 to SP-UX-89 and SP-A11Y-44 to SP-A11Y-50. Linked from `spec.md` (Architecture, UX specification).
- Terminology: R1 (no "file" in UI copy; CONTEXT.md clarification). Limits: Q3.

## Decisions

### D1: The storage abstraction
| Metric | A: Scenario Preparation port `IHandoutFileStore` in SP.Application, adapters in SP.Infrastructure | B: shared, context-neutral `IBlobStorage` for every future file |
| --- | --- | --- |
| Consistency | + consumer-owned application ports like `ISceneRepository` and `ICampaignKeepers` (`ISceneRepository.cs:7`, ADR 0008) | - first shared infrastructure project; the source-document flow (spec l.38) is unscheduled |
| Modifiability | + Handout key rules and container stay in one context; Scene Play reads through an SP port (ADR 0008) | 0 reusable, but every consumer couples to one shape |
| Testability | + small interface; fake in `ScenarioPreparationTestBuilder` | + same |
| Simplicity | + three methods | - speculative generic layer |
| Reversibility | + extracting a shared port later is mechanical | 0 |
| Security and correctness | + only Scenario Preparation code reaches Handout blobs | - any context could read any container |

- **Chosen:** A, because Simplicity and Consistency decide it - giving up reuse by the later extraction flow, which can lift this port when it arrives.
- **Rejected:** B - speculative (CLAUDE.md). The Developer must not add a shared storage project.
- Port: `SaveAsync(string key, Stream content, string mediaType, CancellationToken)`, `OpenReadAsync(string key, CancellationToken)` returning a `Stream`, `DeleteAsync(string key, CancellationToken)` (idempotent). Adapters wrap every storage failure, including a missing blob, in `HandoutFileStoreException`.

### D2: How a file is stored on a Handout
| Metric | A: flat nullable columns on `Handouts` (`FileKey`, `FileName`, `FileMediaType`, `FileSizeBytes`), `Content` nullable, one check constraint | B: EF owned type `HandoutFile` split into the same table | C: 1:1 `HandoutFiles` table |
| --- | --- | --- | --- |
| Consistency | + ADR 0020 ("file kinds add columns to the same table"); check constraint precedent `ScenarioPreparationDbContext.cs:91` | 0 same table, but no `OwnsOne` in the repo: a new EF pattern | - contradicts ADR 0020 |
| Modifiability | 0 four columns; Item Handouts (PBI-SP-008) unaffected | + groups the file fields | - second table and join |
| Testability | + SQLite fixture covers the constraint | 0 optional owned dependents behave subtly on SQLite and SQL Server | 0 |
| Simplicity | + plain properties with field access, as today | - optional owned dependents need care | - |
| Reversibility | + | 0 | - |
| Security and correctness | + the database refuses a rich-text Handout with a file or a file Handout without one | 0 domain only | 0 |

- **Chosen:** A, because Consistency with ADR 0020 and database-level integrity decide it - giving up a grouped value type in persistence. The domain still takes a `HandoutFile(Key, Name, MediaType, SizeBytes)` record as input and exposes `Handout.File` as a computed `HandoutFile?`.
- **Rejected:** B - a new EF pattern for no gain; C - contradicts ADR 0020. The Developer must not use `OwnsOne`, `ComplexProperty`, or a new table for this.
- Check constraint `CK_Handouts_Content`: (`Kind IN ('ReadAloud','Text')` and `Content IS NOT NULL` and all four file columns NULL) or (`Kind IN ('Image','Document','Map')` and `Content IS NULL` and all four file columns NOT NULL).

### D3: Upload API shape
| Metric | A: same routes; `POST .../handouts` and `PUT .../handouts/{handoutId}` accept `multipart/form-data` for file kinds, selected by `[Consumes]`, in a new `HandoutFilesController` | B: staged upload (`POST .../handout-uploads` returns an upload id; JSON create or edit names it) | C: base64 inside the existing JSON |
| --- | --- | --- | --- |
| Consistency | + one Handout resource and URL set (spec l.25); a separate controller keeps `HandoutsController.Failure` small (PBI-SP-004 D9 precedent) | - new resource and lifecycle | + one request shape |
| Modifiability | + rich text and files evolve apart | 0 ready for direct-to-blob uploads | - |
| Testability | + one request per behavior | - two-step flows and expiry | 0 |
| Simplicity | + no staging state | - staging state plus a sweeper | - |
| Reversibility | + | 0 | 0 |
| Security and correctness | + add and replace are each one request: no Handout without its file (D5) | - abandoned uploads leave blobs | 0 |
| Performance | + streamed multipart; ASP.NET buffers bodies over 64 KB to disk | 0 | - +33% on the wire and the whole body in memory |

- **Chosen:** A, because Correctness ("no orphaned Handout") and Simplicity decide it - giving up a later direct-to-blob path.
- **Rejected:** B - staging state and abandoned blobs; C - size and memory. The Developer must not add an upload-staging endpoint or base64 content.
- Multipart fields: `kind`, `visibility`, `title`, `file` (required on create; optional on edit, where absent keeps the current file). Only the multipart actions carry `[Consumes("multipart/form-data")]`; the JSON actions carry no `[Consumes]` and answer every other content type, so a missing or other Content-Type gets 415 from the JSON actions (Revisions, 2026-10-23). The multipart actions also carry `DisableFormValueProviderAttribute` and read the form themselves, so an over-limit body answers 413, not 400. Cross-controller action selection is verified by integration tests.

### D4: Keeper-only download under bearer-token auth
| Metric | A: `GET .../handouts/{handoutId}/file` streams through the API after the Keeper check; the client fetches with the bearer header into a Blob and uses an object URL | B: the API returns a short-lived SAS URL; the browser reads Blob Storage directly | C: cookie-authenticated file endpoint |
| --- | --- | --- | --- |
| Consistency | + same auth and 404 rule as every endpoint (ADR 0013) | - second authorization path; the local adapter has no SAS equivalent | - a new auth mechanism beside Entra bearer tokens (CLAUDE.md) |
| Modifiability | + Scene Play can serve Player snapshots the same way | 0 | - |
| Testability | + integration tests assert the 404s and the bytes | - needs Azurite in every test | - |
| Simplicity | + one endpoint, one hook | - SAS signing, CORS, public network access | - |
| Reversibility | + | 0 | - |
| Security and correctness | + authorization stays server-side for every byte; stored, sniffed media type with `nosniff` | - a leaked URL works until expiry | 0 |
| Performance | 0 up to 20 MB passes through the API (Keeper-only, one at a time; accepted) | + offloaded | 0 |

- **Chosen:** A, because Security, Consistency, and one path for local and Azure decide it - giving up offloaded traffic.
- **Rejected:** B, C. The Developer must not add SAS generation, public containers, or cookie auth.
- Response: 200 with `Content-Type` = the stored media type, `Content-Disposition: attachment` with an RFC 6266 `filename*` (through `ContentDispositionHeaderValue`), `X-Content-Type-Options: nosniff`, `Cache-Control: private, no-store`. 404 as for the Handout, and for a rich-text Handout. 503 when the store throws.
- Frontend: add `bearerHeaders(accessToken)` (Authorization only) to `authHeaders.ts` and have `authHeaders` spread it; multipart requests use `bearerHeaders` so the browser sets the boundary.

### D5: Write order across SQL and blob storage, and orphans
| Metric | A: validate in the domain first, upload under a new never-reused key, commit SQL; if the commit throws, delete the new blob (best effort, logged) | B: commit SQL with a pending flag, upload, then clear it | C: transactional outbox or background reconciler |
| --- | --- | --- | --- |
| Consistency | + same Keeper -> Scene -> aggregate flow as `HandoutService.cs:41-44`, `:110-119` | - a pending state the domain does not have | - new infrastructure pattern |
| Modifiability | 0 | - every read skips pending rows | - |
| Testability | + a failing fake store covers each step | 0 | - |
| Simplicity | + no new state | - | - |
| Reversibility | + | 0 | - |
| Security and correctness | + a Handout row never exists without its blob; the worst case is an orphaned blob, never an orphaned Handout (PBI Verification) | - a crash leaves pending Handouts | + |

- **Chosen:** A, because Correctness against the PBI and Simplicity decide it - giving up guaranteed blob cleanup: a failed compensation or post-commit delete leaves a logged orphaned blob (PBI Follow-up: a sweep).
- **Rejected:** B, C. The Developer must not add a pending status or a background service.
- Create: Keeper check, load Scene, sniff the media type, `scene.AddFileHandout(...)` (a refusal returns before any upload), `SaveAsync(newKey)` (failure: nothing saved, `StorageFailed`), `SaveChangesAsync` (throws: `DeleteAsync(newKey)` best effort, then rethrow).
- Replace: the same with a new key; after the commit, delete the old key only if the Scene is Prepared (D6). An edit without a new file touches no storage.
- Delete Handout (Prepared only, `Scene.RemoveHandout`): commit, then `DeleteAsync(key)` best effort.
- Remove a Prepared Scene: `SceneService.RemoveAsync` collects the file keys of the loaded Scene's Handouts, removes, commits (database cascade), then deletes each key best effort.
- Failure contract: a storage failure on create or edit answers 503 with the problem title "The image or PDF couldn't be stored. Try again."; the client shows its generic failure (ux.md sections 42 and 43), so no new client error class. Post-commit delete failures are logged at Warning with the key; the response is unchanged.

### D6: How a Reveal snapshots a file (Refinement Protocol)
| Metric | A: immutable blobs: a key is written once and never overwritten; a blob that could have been revealed is never deleted by Scenario Preparation; a Reveal records the key and file details and reads through an SP port | B: copy on Reveal into a Scene Play container |
| --- | --- | --- |
| Consistency | + reads cross the boundary through a port (ADR 0008); Scene Play owns no storage | - Scene Play needs storage writes and its own container |
| Modifiability | + PBI-SPL-002 adds a read port and stores a key | - copy, cleanup, and failure handling in Scene Play |
| Testability | + the rule is one domain check (is the Scene Prepared?) | 0 |
| Simplicity | + no copy | - second storage write path |
| Reversibility | 0 moving to copies later needs a one-off copy of revealed keys | + |
| Security and correctness | + a Reveal needs an Active Scene and a Scene never returns to Prepared (spec Architecture, Scene status), so a Prepared Scene's blobs were never revealed and are safe to delete, with no cross-context reference check | + fully decoupled lifetimes |
| Performance | 0 replaced files of Active Scenes are kept (bounded, small) | 0 one copy per Reveal |

- **Chosen:** A, because Simplicity and the "Prepared means never revealed" argument decide it - giving up storage for files replaced on Active Scenes, kept even if never revealed.
- **Rejected:** B - reconsider only if Scene Play must outlive deleted Handouts, which the spec does not allow.
- Recorded in ADR 0021, `specs/scenario-preparation/spec.md`, and `specs/scene-play/spec.md`. PBI-SPL-001 and PBI-SPL-002 must honor:
  1. A Reveal of an Image, Document, or Map Handout snapshots `{key, name, mediaType, sizeBytes}` as they were when revealed; it never copies the bytes.
  2. Scene Play reads a snapshotted file only through a Scenario Preparation read port (ADR 0008) and never deletes or overwrites it.
  3. PBI-SPL-001 must make a Scene status transition conflict with a concurrent Handout write on the same Scene (for example a Scene concurrency token); otherwise a replace that loaded a Prepared Scene could delete the old blob after a racing start and Reveal. The race needs one Keeper in two tabs; it is flagged here, not fixed.

### D7: Local, test, and E2E runs without Azure
| Metric | A: config-gated: Azure when `Azure:Storage:ConnectionString` is set; otherwise a filesystem adapter at `HandoutFiles:LocalDirectory`; neither fails on first use with a message naming both keys | B: always the Azure SDK, with Azurite required locally, in CI, and in E2E | C: in-memory fallback, like SignalR |
| --- | --- | --- | --- |
| Consistency | + mirrors `LiveTransportRegistration.cs:17-30` and the `Azure:...:ConnectionString` naming | 0 | + closest to the SignalR precedent |
| Modifiability | + swappable adapters | 0 | 0 |
| Testability | + API integration tests and E2E use a temp directory; one contract test class runs against both adapters (Azure against Azurite) | 0 every run needs an emulator | - restarts lose files while rows remain |
| Simplicity | 0 two adapters | + one adapter | + |
| Reversibility | + | 0 | + |
| Security and correctness | + durable in development; Production without configuration fails loudly instead of writing to the app server's disk | + | - Handouts lose their files in development |

- **Chosen:** A, because durability and Azure-free local, test, and E2E runs decide it - giving up a single adapter.
- **Rejected:** B - makes an emulator mandatory to run the app; C - lost files. The Developer must not fall back to a directory silently when neither key is set.
- Fails on first resolution, not at registration, so EF design-time tooling (which builds the host without these settings) keeps working; this holds in every environment, including Production (G3).
- `appsettings.Development.json`: `HandoutFiles:LocalDirectory = "App_Data/handout-files"`; `.gitignore` gains `backend/src/CocAssistant.Api/App_Data/`. `IdentityApiFactory` sets a per-factory temp directory. `e2e/playwright.config.ts` api env sets `HandoutFiles__LocalDirectory` to a temp directory.
- Azurite only for the Azure adapter contract tests: `COC_AZURITE_CONNECTION` with fallback `UseDevelopmentStorage=true` (the `SqlServerTestConnection.cs` shape); the CI `backend-integration` job gains an `mcr.microsoft.com/azure-storage/azurite` service on port 10000. Running the integration suite locally now needs Azurite (`npx azurite-blob` or Docker), as it needs LocalDB; the README's local test section says so.

### D8: Kind change across families, and the content Strategy question
| Metric | A: domain lookup table `HandoutKinds` (kind -> family and allowed media types); families RichText {ReadAloud, Text}, Picture {Image, Map}, Document {Document}; new outcome `KindChangeNotAllowed` (400 keyed `kind`) | B: Strategy per kind (`IHandoutContentRule` classes) | C: 409 for a family change |
| --- | --- | --- | --- |
| Consistency | + lookup-table precedent (PBI-SP-005 Patterns, Used) and ADR 0018 400s | - Strategy rejected in PBI-SP-005; still only two content shapes | - 409 means a state conflict, not invalid input |
| Modifiability | + a new kind is one table entry | 0 | 0 |
| Testability | + table-driven tests | 0 | 0 |
| Simplicity | + no class per kind; validation splits once (rich text or file) | - five classes for two behaviors | 0 |
| Reversibility | + | 0 | 0 |
| Security and correctness | + every family change refused server-side | + | 0 |

- **Chosen:** A, because Simplicity and Consistency decide it: there are two content shapes (Lexical JSON or a file), so the variation is data, not behavior - giving up nothing material.
- **Rejected:** B, C. The Developer must not add per-kind classes or answer 409 for a kind change.
- Image and Map may change into each other; a Document stays a Document.

### Single-option decisions
- **Kinds and wire values:** `HandoutKind` gains `Image`, `Document`, `Map`; wire values "Image", "Document", "Map"; `ParseKind` (`HandoutsController.cs:137-142`) gains them. A JSON request naming a file kind gets `InvalidKind` ("Choose Read-aloud or Text.", unchanged); a multipart request naming a rich-text kind gets `InvalidKind` with "Choose Image, Document, or Map.".
- **Validation order:** create: status, title, kind (missing or wrong for the request type), visibility, file. Edit: status, Handout found, title, kind, family change (`KindChangeNotAllowed`), visibility, content or file.
- **Media types (Q3):** detected from the leading bytes, never from the client Content-Type or extension: PNG `89 50 4E 47 0D 0A 1A 0A`, JPEG `FF D8 FF`, GIF `GIF87a` or `GIF89a`, WebP `RIFF` + 4 bytes + `WEBP`, PDF `%PDF-`. Allowed: Image and Map image/png, image/jpeg, image/webp, image/gif; Document application/pdf. SVG is never accepted. Detection is a pure domain function `HandoutMediaTypes.Detect` with a lookup table.
- **Size:** `Handout.FileMaxBytes = 20 * 1024 * 1024` (20,971,520). Zero bytes is `MissingFile`. The multipart actions carry `[RequestSizeLimit(22_020_096)]` and `[RequestFormLimits(MultipartBodyLengthLimit = 22_020_096)]` (20 MiB plus 1 MiB of multipart overhead), lowering Kestrel's 30,000,000-byte default for these actions only; nothing global is configured and `Program.cs` is untouched. A body over the limit answers 413, which the client maps to the too-large message.
- **File name:** `Path.GetFileName`, control characters stripped, trimmed, at most 255 characters; empty becomes "image" or "document". Stored in `FileName nvarchar(255)`; used only for display and `Content-Disposition`.
- **Key:** `Guid.NewGuid().ToString("N")`, new per upload, in the private container `handout-files`. The Azure adapter calls `CreateIfNotExistsAsync` once, lazily. The filesystem adapter writes `{directory}/{key}` and rejects any key that is not 32 hexadecimal characters (no path traversal).
- **Columns:** `FileKey nvarchar(32)`, `FileName nvarchar(255)`, `FileMediaType nvarchar(50)`, `FileSizeBytes bigint`, all nullable; `Content` becomes nullable. Migration `AddHandoutFiles`.
- **Responses:** `HandoutResponse(Id, Kind, Visibility, Title, Content?, File?)` with `File` = `{name, mediaType, sizeBytes}`; exactly one of `content` and `file` is non-null. The Scene response and `HandoutSummaryResponse` are unchanged except for the new kind values; `SceneApiTests.cs:139-141` stays valid.
- **400 keys and messages** (ADR 0018), in a new `HandoutFileProblemMessages`: `kind` (multipart) "Choose Image, Document, or Map."; `kind` (family change, both endpoints) "A Handout's kind can change only between Read-aloud and Text, or between Image and Map."; `file`, by family (Image or Map / Document): missing "Choose an image." / "Choose a PDF."; unsupported "Choose a PNG, JPEG, WebP, or GIF image." / "This isn't a PDF. Choose a PDF."; too large "The image is larger than 20 MB. Choose a smaller one." / "The PDF is larger than 20 MB. Choose a smaller one.". The kind is validated before the file, so the family is always known.
- **Services:** new `HandoutFileService` (CreateAsync, EditAsync, OpenAsync) and `HandoutFilesController` (route template as `HandoutsController`, plus `GET {handoutId:guid}/file`). `HandoutService.RemoveAsync` and `SceneService.RemoveAsync` take `IHandoutFileStore` and an `ILogger` for post-commit deletes. `HandoutService.GetAsync` and `HandoutView` carry the file details.
- **Complexity:** `HandoutService.ToWriteOutcome` becomes a static readonly dictionary lookup; `HandoutFilesController` maps 400 outcomes through a dictionary in `HandoutFileProblemMessages` and keeps only 404, 409, and 503 as conditionals; the JSON `Failure` gains one arm (`KindChangeNotAllowed`).
- **No SignalR:** as PBI-SP-005.
- **Terraform:** no resources in this PBI. `main.tf` has none, and adding only storage before environments, SKUs, networking, and identity are defined contradicts its stated plan. PBI Follow-up: provision the Handout storage account and private `handout-files` container with managed identity.
- **Azure authentication:** connection string, consistent with `Azure:SignalR:ConnectionString` (`LiveTransportRegistration.cs:11`); managed identity is in the same Follow-up.
- **Frontend data:** `HandoutKind` gains `'Image' | 'Document' | 'Map'` and labels; `Handout` becomes a union (content or file); `HandoutInput` a union (rich-text `{content}` or file `{file: File | null}`); `handoutSchema` a strict union; `handoutApi.ts` gains `createFileHandout`, `editFileHandout` (FormData, `bearerHeaders`), and `getHandoutFile` (Blob; 404 throws `HandoutNotFoundError`); `handoutQueryKeys.file(...)`; a successful edit invalidates the file query. New `useObjectUrl(blob | File | null)` creates the URL in an effect and revokes it on change or unmount; the preview and the Handout page use it.

## Patterns
- **Used:** lookup tables `HandoutKinds` (kind -> family and media types) and `HandoutMediaTypes` (signatures) in SP.Domain - force: switching on kind in validation that this PBI introduces. Frontend `Record<HandoutKind, Component>` in `handout-content`, replacing the conditional at `handout-content.tsx:16-18` - force: five kinds. Dictionary maps for outcome-to-HTTP mapping - force: complexity 10.
- **Used:** Adapter at `AzureBlobHandoutFileStore` and `FileSystemHandoutFileStore` behind `IHandoutFileStore` - force: incompatible SDK and file-system interfaces at an infrastructure boundary (existing port pattern, ADR 0008, ADR 0012).
- **Rejected:** Strategy per kind (D8) - the variation is data. State for Scene status - still single-line guards; "delete the old blob only if Prepared" is one check. Decorator for retry or logging around the store - no requirement. Command or outbox for compensation (D5). Observer or SignalR - no second viewer. Abstract Factory for adapter choice - one conditional in registration, as `LiveTransportRegistration.cs:21-25`. Template Method sharing JSON and multipart controller code - they differ in input and outcome maps.

## Invariants
- A Handout row is either rich text (`Content` set, no file columns) or a file kind (all four file columns set, `Content` null), enforced in the domain and by `CK_Handouts_Content`.
- Every Handout operation, including the file GET, runs the Keeper check before any Scene or blob read; a Player, another Keeper, or a foreign id gets the same 404. No Player-visible endpoint is added.
- A blob key is written once and never overwritten. No Handout row is committed unless its blob is already stored. A domain refusal uploads nothing.
- Scenario Preparation deletes a blob only when the owning Scene is Prepared at the time of the write (Handout delete, replace, Scene removal). Blobs of Active or Finished Scenes are never deleted.
- The media type is decided by byte signature; only the allowed types are stored, never SVG. Size is at most 20,971,520 bytes; the request limit is per action.
- PBI-SP-005 status rules are unchanged: Finished refuses every write; delete only while Prepared; Position written only by add and reorder.
- No `content` or file in the Scene response; no Handout list endpoint; `ISceneRepository` unchanged.
- Cyclomatic complexity 10 or below, with no new suppressions or ESLint exemptions.
- `backend/src/CocAssistant.Api/Program.cs` has an unrelated uncommitted change; it must not be modified or staged.
- If an invariant cannot hold, escalate; do not redesign.

## Implementation plan
1. Domain: `HandoutKind` members; new `HandoutKinds`, `HandoutMediaTypes.Detect`, `HandoutFile` record; `Handout` file fields, computed `File`, `FileMaxBytes`, `CreateFile`, `ReplaceFile`, and `Validate` split into rich-text and file paths through `HandoutKinds`; `HandoutOutcome` gains `KindChangeNotAllowed`, `MissingFile`, `UnsupportedFileType`, `FileTooLarge`; `Scene.AddFileHandout`, `Scene.EditFileHandout` (returns the replaced key only when the Scene is Prepared); `Scene.EditHandout` refuses a family change.
2. Persistence: mapping and check constraint, migration `AddHandoutFiles`, SQLite persistence tests.
3. Application: `IHandoutFileStore`, `HandoutFileStoreException`, `HandoutFileService`, post-commit deletes in `HandoutService` and `SceneService`, view and result changes, dictionary lookup in `ToWriteOutcome`.
4. Infrastructure: `Azure.Storage.Blobs` in SP.Infrastructure; `AzureBlobHandoutFileStore`, `FileSystemHandoutFileStore`; registration inside `AddScenarioPreparationInfrastructure` (fail on first resolution; `Program.cs` unchanged); `appsettings.Development.json` key; `.gitignore` entry.
5. Controllers: `HandoutFilesController` (multipart POST and PUT, file GET), `HandoutFileProblemMessages`, `[Consumes("multipart/form-data")]` and `DisableFormValueProviderAttribute` on the multipart actions only (Revisions, 2026-10-23), `HandoutResponse` changes.
6. Backend tests (see TDD units): `IdentityApiFactory` temp directory; a failing-store factory variant; adapter contract tests for both adapters; CI Azurite service and `COC_AZURITE_CONNECTION`; README local test note.
7. Frontend data: `bearerHeaders`, types, schemas, API, hooks, `useObjectUrl`, `handoutFile.ts` (accepted types, `HANDOUT_FILE_MAX_BYTES`, size formatting, client validation).
8. Frontend UI (ux.md sections 50 to 58): `handout-content-field`, `handout-file-field`, `handout-image`, `handout-document`; changes to `handout-form`, `handout-content`, `handout-page`, `handout-badges`; stories and tests; update tests for "Choose a kind." (ux.md section 45).
9. E2E: fixtures and spec; `HandoutFiles__LocalDirectory` in `playwright.config.ts`.
10. Backlog: PBI Follow-ups: Terraform storage with managed identity; orphaned-blob sweep; image description field (flag for PBI-SPL-002).

## Reuse
- Using: `LiveTransportRegistration` shape for config gating; `SqlServerTestConnection` shape for an `AzuriteTestConnection`; `IdentityApiFactory` swap point; `ScenarioPreparationTestBuilder` (add a recording and a failing `FakeHandoutFileStore`); `validationProblem.ts`; `HandoutNotFoundError` and `SceneFinishedError` mapping; `useUnsavedChangesPrompt`; `delete-handout-dialog`; `Input`, `Label`, `Button`, `Alert`, `Skeleton`, `Badge`; the E2E route-fulfil precedent.
- Not using: Testcontainers - a new dependency where a CI service container is the existing pattern (ADR 0004); a drop-zone library - native input (UX decision); binary fixtures in the repo - tests build PNG and PDF bytes from base64 constants, keeping the repo ASCII.

## TDD units
- Domain: signature detection for each allowed type; SVG, empty, and unknown bytes refused. `HandoutKinds` families. `AddFileHandout` in validation order: Finished, title, kind, visibility, missing, unsupported, too large (exactly 20,971,520 accepted, one more refused); wrong media type per kind. `EditFileHandout`: keeps the file without a new one; a replace returns the old key only when Prepared; Image -> Map allowed; Document -> Image and Text -> Image refused with `KindChangeNotAllowed`. `EditHandout` refuses a file Handout -> rich-text kind.
- Persistence (SQLite): file columns round-trip; the check constraint refuses both mixed shapes.
- Application (fake store): refused create uploads nothing; a throwing store saves nothing and gives `StorageFailed`; a throwing commit deletes the new key; replace on Prepared deletes the old key after commit, on Active does not; delete removes the blob after commit; Scene removal deletes every file key after commit; post-commit delete failures are logged and do not change the outcome; a non-Keeper causes no store call.
- Adapter contract (filesystem always; Azure against Azurite): save then read returns the same bytes; delete is idempotent; reading a missing key throws `HandoutFileStoreException`; the filesystem adapter rejects a non-hex key.
- Integration (API): multipart create 201 with `file`; GET file returns the same bytes, content type, `nosniff`, and attachment disposition; replace keeps Position; each 400 message; 413 over the limit; 409 on Finished (create, edit) and on a non-Prepared delete; Player, other Keeper, and foreign id get 404 on create, edit, and file GET; a rich-text Handout's file GET is 404; a JSON request with a file kind is 400; with a failing store, 503 and no Handout on the Scene; removing a Prepared Scene deletes its blobs; the Scene response property set is unchanged.
- Frontend unit: `handoutFile.ts` type, size, and formatting ("850 KB", "1.2 MB"); `validateHandoutForm` union (no kind gives only the kind error; a file kind without a file gives the file error); `handoutApi` sends FormData without a JSON Content-Type and maps 413, 400, 404; `useObjectUrl` revokes; `handout-content-field` keeps values across kind switches; `handout-file-field` hint, error, preview; `handout-image` and `handout-document` loading, error, retry. Each maps to SP-UX-77 to SP-UX-89 and SP-A11Y-44 to SP-A11Y-50.

## E2E coverage
New `e2e/tests/scene-file-handouts.spec.ts`; `e2e/fixtures/scene-handouts.ts` gains `fileField`, `chooseHandoutImage`, `chooseHandoutPdf` (`setInputFiles({name, mimeType, buffer})`).
- Gherkin "Keeper attaches a file Handout" (spec.md) -> add a Map with a PNG; listed with "Map" and "Player-facing"; its page shows the image after a reload (SP-UX-77, SP-UX-78, SP-UX-81).
- Image upload, view, and download -> "Download" produces a download with the original name (`waitForEvent('download')`) (SP-UX-82).
- Document upload -> name, "PDF, {size}", "Open", "Download" (SP-UX-83).
- Client refusal -> a 21 MB buffer and a GIF chosen as a Document each show their message and send nothing (SP-UX-79).
- Replace on a Prepared Scene -> Edit, choose a new image, Save; "Handout saved." and the new size (SP-UX-84, SP-UX-85).
- Kind on edit -> only Image and Map for an Image; "Document. A Document Handout stays a Document." for a Document (SP-UX-86).
- Delete a file Handout through the dialog (SP-UX-89 with SP-UX-71).
- Storage failure -> `page.route` fulfils the multipart POST with 503; "We couldn't add the Handout. Try again.", input kept, no Handout on the Scene page (SP-UX-80). The real server-side failure is proven by the failing-store integration test.
- Authorization -> a joined Player opening the Handout URL sees "We couldn't find that Scene" (SP-UX-74); an API probe with the Player's bearer token to `.../handouts/{handoutId}/file` gets 404. Another Campaign's Keeper is covered at integration level, as in PBI-SP-005.
- Image load failure -> the file GET fulfilled with 503 shows "We couldn't load the image." and "Try again" (SP-UX-88).
- Exception (as PBI-SP-005 and the spec header): Active and Finished journeys are unreachable in E2E until PBI-SPL-001; covered by component and integration tests.

## ADR
- ADR 0021: Handout files are immutable blobs behind a Scenario Preparation storage port (`docs/adr/0021-handout-files-are-immutable-blobs-behind-a-storage-port.md`).

## Phases
- Phase 1: backend (domain, persistence, application, infrastructure, controllers, unit, integration, and contract tests, CI Azurite); checkpoint: `feat(backend): store Image, Document, and Map Handouts (PBI-SP-007)`.
- Phase 2: frontend (data, components, stories, tests); checkpoint: `feat(frontend): add, view, and replace file Handouts (PBI-SP-007)`.
- Phase 3: E2E; checkpoint: `test(e2e): cover file Handouts (PBI-SP-007)`.
- Phase 4: backlog Follow-ups; checkpoint: `docs(backlog): close PBI-SP-007 with its follow-ups`.
- The spec, scene-play spec, and CONTEXT.md text is committed with this design (G1); no docs phase remains.

## Human decisions
- 2026-10-22, UX gate: Q1 "A: one form" (Option A). Q2 "R1: clarify": no "file" in UI copy (image, PDF, document); CONTEXT.md states that an Image, Document, or Map Handout holds one file and "file" names the stored content, never the Handout; the spec may keep "file Handout" in that sense. Q3 "Proposed, 20 MB": Image and Map PNG, JPEG, WebP, GIF (no SVG); Document PDF only; 20 MB maximum for every kind. No stated assumption was corrected; defaults kept: image description deferred, no thumbnails, no drag-and-drop, no progress bar, cross-family kind change refused.
- 2026-10-22, plan gate: "Approve as written". G1 "Yes, in design commit": the spec.md contract text, the scene-play spec note, and the CONTEXT.md Handout clarification are committed with this design. G2 "Immutable blobs": D6-A kept. G3 "Fail on first use": D7-A kept in every environment, including Production.

## Revisions
- 2026-10-23, clarification (tactical deviations found in verification; D3's chosen option A, the rejected options, and every invariant are unchanged):
  - **`[Consumes]` only on the multipart actions.** D3 asked for `[Consumes("application/json")]` on the JSON Handout actions. With it, a request with no Content-Type matched both `HandoutsController` and `HandoutFilesController` and threw `AmbiguousMatchException` (500, before authentication, so an unauthenticated request got 500 instead of 401); `IsOptional = true` did not help. The JSON actions therefore carry no `[Consumes]`, and only the multipart actions carry `[Consumes("multipart/form-data")]` (`HandoutFilesController.cs:27`, `:64`); the JSON actions take every other content type and answer 415 for a missing or unsupported one.
  - **`DisableFormValueProviderAttribute` on the multipart actions** (`HandoutFilesController.cs:28`, `:65`; `DisableFormValueProviderAttribute.cs`): the actions read the form themselves, so a body over the request limit answers 413 as D3 specifies, not 400 from model binding.
  - Covered by `HandoutFileApiTests` (commit ae4608b): an authenticated POST or PUT with no Content-Type answers 415 and stores no blob; an unauthenticated multipart POST, multipart PUT, and file GET each answer 401 with nothing stored or read; `text/plain` answers 415.
  - Procedure: D3 said to escalate if action selection was ambiguous. The Developer resolved it tactically and reported it afterwards; the Verifier judged it tactical. D3 and Implementation plan step 5 now describe what was built.
