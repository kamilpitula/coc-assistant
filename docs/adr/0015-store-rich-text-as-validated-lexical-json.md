# Store rich text as validated Lexical JSON

Status: Accepted

Scene Keeper notes, rich-text Handouts (Read-aloud and Text), Item descriptions, and the Player-facing descriptions of Non-Player Entities in a Scene are rich text ([specs/scenario-preparation/spec.md](../../specs/scenario-preparation/spec.md)). The Keeper writes it and Players receive it through Reveals ([specs/scene-play/spec.md](../../specs/scene-play/spec.md)), so stored content must never become a script injection path to Players.

The frontend edits rich text with Lexical and stores Lexical's serialized editor state (JSON) unchanged. The server validates every document before saving: only the node types and formats listed in the Scenario Preparation Constraints, links with `http` or `https` only, and at most 200 KB of serialized JSON; anything else is refused with 400. Players see it through a read-only Lexical renderer that registers the same nodes, so nothing outside the allowed list can render.

## Considered Options
- Markdown rendered client-side with raw HTML disabled. Rejected: the project owner chose an established editor library and its native format.
- HTML sanitized server-side. Rejected: sanitizer configuration becomes the security boundary, and stored HTML ties content to presentation.
- Another structured editor format (TipTap/ProseMirror JSON). Not chosen; Lexical was the project owner's choice, and the validation approach is the same.
- Lexical JSON with server-side node allow-list validation (chosen).

## Consequences
- The allowed node list is one definition shared by the editor, the renderer, and the server validator; changing it changes all three and the spec Constraint together.
- Reveal snapshots copy the Lexical JSON as it was revealed.
- Lexical's serialization format carries a version; a Lexical upgrade that changes it needs a migration of stored documents.
- Plain-text search or previews need text extracted from the JSON.
