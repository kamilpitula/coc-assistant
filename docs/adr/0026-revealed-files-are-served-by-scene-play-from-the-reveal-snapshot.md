# Revealed files are served by Scene Play from the Reveal snapshot to its recipients

Status: Accepted; amends [ADR 0021](0021-handout-files-are-immutable-blobs-behind-a-storage-port.md)

## Context

A Reveal of an Image, Document, or Map Handout snapshots the stored file's key, name, media type, and size. The snapshot is taken as the file was when revealed, and it never copies the bytes ([ADR 0021](0021-handout-files-are-immutable-blobs-behind-a-storage-port.md), [ADR 0024](0024-scene-play-runs-the-scene-aggregate-through-a-provider-command-service.md)).

The Players whose Investigators a Reveal reached must be able to read that file. No other Player may read it ([specs/scene-play/spec.md](../../specs/scene-play/spec.md), Regression Guardrails).

Until now, a file reached only the Keeper. It went through Scenario Preparation's Keeper-checked endpoint, keyed by the Handout id, which serves the Handout's current file. A file replaced on an Active Scene keeps its old blob but gets a new key, so that endpoint would no longer serve what was revealed.

The design is recorded in the [PBI-SPL-002 design record](../scene-play/issues/02-reveal-to-investigators-and-clues.design.md), D3.

## Decision

- **Endpoint:** Scene Play serves `GET /api/campaigns/{campaignId}/reveals/{revealId}/file`. It streams the blob under the Reveal's snapshotted key, never under the Handout's current key.
- **Authorization:** Scene Play checks the caller first.
  - The Keeper of the Campaign may read any Reveal's file.
  - A Player may read a Reveal's file only when their Approved Investigator is among its recipients.
  - Every other caller gets 404: a non-member, a non-recipient, a Player without an Approved Investigator, an unknown Reveal, a Reveal of another Campaign, or a Reveal without a file.
- **Storage access:**
  - Scene Play reads the bytes through its own consumer-owned port, `IRevealedFiles`.
  - That port is adapted onto Scenario Preparation's `IHandoutFileStore.OpenReadAsync`.
  - Scene Play never writes, copies, or deletes a blob.
- **Delivery:** the response uses the same headers as the Keeper download:
  - an attachment with the stored media type;
  - `X-Content-Type-Options: nosniff`;
  - `Cache-Control: private, no-store`.
- **No signed URLs:** there are no SAS URLs and no public containers, as ADR 0021 requires.
- **Scenario Preparation stays Keeper-only:** its endpoints never gain Player access.

## Considered Options

- **Letting recipients use Scenario Preparation's Handout file endpoint.** Rejected for two reasons:
  - It is keyed by the Handout, so it serves the current file and breaks the snapshot guardrail after a replace.
  - It would put Reveal recipients and Player roles into Scenario Preparation's Keeper-only authorization.
- **Short-lived signed URLs.** Rejected: ADR 0021 forbids them, and a leaked URL bypasses authorization.
- **A Scene Play endpoint keyed by Reveal, reading through a port (chosen).**

## Consequences

- **ADR 0021's delivery rule changes:** files reach the Keeper and the Players whose Investigators a Reveal reached. Players are served only through this endpoint.
- **Reuse:** PBI-SPL-003 (Item Handouts revealed or given) and PBI-SPL-004 (Scene History) reuse this endpoint.
- **Given up:** a second, small download helper in ScenePlay.Controllers that repeats the three header lines. The Scenario Preparation helper is internal to its Controllers project ([ADR 0013](0013-scenario-preparation-functionality-with-campaign-ownership-port.md)).
