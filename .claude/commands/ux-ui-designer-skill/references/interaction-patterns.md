# Interaction pattern reference

Use these patterns as a decision aid, not a checklist. Choose the simplest pattern that supports the user's task.

## Forms and data entry

Prefer a short form over a large catch-all form. Group fields according to the user's mental model, not the database schema.

Choose:

- **Inline editing** when users make small, frequent changes and can immediately understand the result.
- **Dedicated edit view** when the entity has many fields, dependencies, validation rules, or a meaningful save/cancel boundary.
- **Staged flow** when the task is complex or decisions must be made in sequence.
- **Single-page form** when the task is short and users benefit from seeing the complete scope.

For every form define:

- initial/default values
- required vs optional inputs
- validation timing
- invalid state
- submit behavior
- server-side failure
- retry behavior
- preservation of entered values
- success feedback
- navigation after success
- cancellation and unsaved changes

## Search, filtering, and lists

Choose the interaction based on task intent:

- **Search-first** when users know approximately what they want.
- **Browse-first** when discovery is part of the task.
- **Filter-first** when the dataset is broad but users understand the available dimensions.
- Combine search and filters when users may use either strategy.

Keep active filters visible, make clearing them easy, and explain zero-result states.

For lists/tables specify:

- default sort
- column/field priority
- pagination or infinite loading
- row actions
- bulk actions
- selection behavior
- empty state
- loading state
- partial/failed data state
- responsive representation

## Async operations

For anything that takes time, answer three user questions:

1. Did my action start?
2. Is the system still working?
3. What was the result, and what can I do next?

For long-running operations, consider progress, background processing, cancellation, retry, and returning later.

Avoid blocking the whole interface with a spinner when the user could continue useful work.

## Empty states

Differentiate at least:

- first-use/no data yet
- no results for the current query/filter
- data unavailable because of permissions
- data failed to load

The message should explain the state and provide the most useful next action when one exists.

## Errors and recovery

Design errors as a recovery flow rather than a message.

For each error define:

- what happened
- what remains intact
- what the user can do next
- whether retry is safe
- whether the system should prevent repetition
- whether support/contact information is needed

Do not use generic error copy when a specific correction or recovery action is known.

## Confirmation and destructive actions

Do not add confirmation dialogs automatically. Use them when the action is destructive, difficult to reverse, high-impact, or likely to be accidental and the user benefits from a decision point.

Prefer undo for reversible actions when it is safer and faster.

Make the consequence explicit and label the destructive action with a specific verb.

## Dialogs and drawers

Use a dialog when the user must resolve a focused task before continuing the underlying context.

Use a drawer when preserving the surrounding page context materially helps the task.

Avoid nesting dialogs. Make keyboard focus behavior explicit.

## Navigation

Navigation should reflect user tasks and domain concepts, not internal services, APIs, or database structures.

Keep important destinations predictable and consistently ordered. Avoid hiding high-frequency actions behind hover-only affordances or deeply nested menus.

## Progressive disclosure

Hide complexity when it is not immediately needed, but do not hide information users need to make the current decision.

Good candidates:

- advanced filters
- optional configuration
- secondary metadata
- infrequent actions

Poor candidates:

- required information
- primary actions
- critical warnings
- validation feedback
- navigation users need to understand their location

## Content and microcopy

Prefer:

- concrete verbs: “Save changes”, “Upload file”, “Add account”
- specific feedback: “File must be smaller than 10 MB”
- concise headings that help scanning
- terminology that matches the user's domain

Avoid:

- vague actions such as “Submit” when a specific verb exists
- technical jargon
- playful language in error messages when clarity matters
- placeholder text as the only label
