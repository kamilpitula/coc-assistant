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

## Amendment (2026-10-17, PBI-SP-002)
The first rich-text field, Scene Keeper notes, settles what this decision left open ([design record](../scenario-preparation/issues/02-manage-ordered-scenes.design.md)).

- **Allowed nodes:** the list gains `linebreak` (Shift+Enter and pasted text produce it) and headings are limited to two levels, `h3` and `h4`, so notes nest below a page's `h2`. The spec Constraint changes with this amendment.
- **Size:** 200 KB means 204,800 bytes of UTF-8 in the document's JSON text as received; that text is stored unchanged.
- **Shape:** a document is a JSON object whose `root` node has type `root`. Allowed children: root holds paragraph, heading, quote, and list; paragraph, heading, and quote hold text, link, and linebreak; list holds listitem; listitem holds text, link, linebreak, and list; link holds text and linebreak; text and linebreak hold nothing. "No document" is `null`, not an empty document.
- **Validated properties:** node `type`; heading `tag` (`h3`, `h4`); list `listType` (`bullet`, `number`); text `format` (only the bold, italic, strikethrough, and underline bits) and an empty `style`; link `url` (absolute `http` or `https`), `target` (`_blank`), and `rel` (`noopener noreferrer`). Other properties, such as `version`, `direction`, `indent`, or alignment, are not validated and are stored as received, so a Lexical release that adds a property does not break saving.
- **Editor normalization:** the editor maps pasted headings to the two levels, clears other formats and styles, sets link `target` and `rel`, unwraps links with other schemes, and turns check lists and tabs into allowed content, so the server's refusals are reached only by clients other than the editor.
- **One definition:** the frontend (`frontend/src/shared/`) and the backend (`CocAssistant.ScenarioPreparation.Domain`) each define the list in code, and `specs/scenario-preparation/rich-text-fixtures.json` is the shared definition both test suites must satisfy. The frontend also checks that its editor serializes every allowed node exactly as the fixture does.
- **Version:** every `lexical` and `@lexical/*` package is pinned to one exact version. An upgrade must pass the parity fixture; if it changes the serialization of stored documents, it needs a migration.
- **Given up:** a literal single file shared by both stacks, and leniency toward non-editor clients that send other formatting.
