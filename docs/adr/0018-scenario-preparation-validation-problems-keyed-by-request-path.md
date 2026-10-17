# Scenario Preparation reports validation problems keyed by request path

Status: Accepted

An NPC Profile (PBI-SP-003) and later a Monster Profile (PBI-SP-009) have nested sections and repeating rows, and nearly every rule that blocks a save is the server's ([project_ruleset.md section 5.8](../game-rules/project_ruleset.md#58-profile-validation)). The profile editor must map each refused value to its field and list it in an error summary ([specs/scenario-preparation/ux.md](../../specs/scenario-preparation/ux.md) sections 25.2 and 25.4). Scenario Preparation already answers 400 with `ValidationProblemDetails` holding one flat key per field and leaves the copy to the client (`ScenesController`, `frontend/src/scenario-preparation/services/validationProblem.ts`). Campaign Play answers a refused Character Sheet with 422 and a `validationErrors` list of codes, fields, and messages.

Scenario Preparation answers a refused write with 400 `ValidationProblemDetails`. Each key is the camelCase JSON path of the refused value in the request body, with zero-based indexes for rows (`name`, `details.goal`, `characteristics.STR`, `skills[2].value`, `combat.weapons[0].damage`), or the path of a list for a list-level problem (`skills`). Each value holds the user-facing messages, owned by the server: the domain reports a path and a problem kind, and the controller maps the kind to its message. The client matches keys case-insensitively and shows the messages without its own copy of the rules. The existing flat keys of Scenarios and Scenes are already paths of this form and do not change.

## Considered Options
- Campaign Play's 422 `validationErrors` list. Rejected: the spec and UX specify 400 for Scenario Preparation, and the list shape would be a second error contract in one functionality.
- Path keys with codes, and the client mapping codes to its own messages. Rejected: every new server rule would need copy on both sides, against the rule that only Name and Age are checked on the client (ux.md section 25.2).
- Path keys with server-owned messages (chosen).

## Consequences
- New profile rules need no client change; their messages are specified in ux.md beside the field design and asserted by integration tests.
- The client gets no machine-readable codes; a later need for them adds an extension member to the problem, not a new shape.
- A problem whose path matches no field is still listed in the error summary, without a link.
- PBI-SP-009 (Monster Profile), Items, and Handouts follow the same scheme.
