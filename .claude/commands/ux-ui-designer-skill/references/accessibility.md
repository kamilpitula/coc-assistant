# Accessibility reference

Use this reference when designing or reviewing UI. Treat WCAG 2.2 Level AA as the default web baseline unless the product has stricter requirements.

## Structure and semantics

- Prefer semantic HTML over custom interactive elements.
- Maintain a logical heading hierarchy.
- Give every form control an accessible name; explicitly associate labels with controls.
- Group related controls semantically where appropriate.
- Ensure custom controls expose the correct role, name, value, state, and relationships.
- Do not use ARIA to compensate for avoidable semantic HTML problems.

## Keyboard and focus

- Every interactive function must be usable with a keyboard.
- Provide a visible focus indicator.
- Preserve a logical focus order.
- Ensure sticky headers/footers, dialogs, drawers, and overlays do not completely hide focused controls.
- When opening a modal dialog, move focus predictably into the dialog; when closing it, restore focus to the triggering control unless there is a stronger task-specific reason.
- Keep focus management explicit for dynamically inserted or removed content.

Relevant WCAG 2.2 criteria commonly involved: 2.1.1 Keyboard, 2.4.3 Focus Order, 2.4.6 Headings and Labels, 2.4.7 Focus Visible, 2.4.11 Focus Not Obscured (Minimum).

## Contrast and visual meaning

For normal text, use at least 4.5:1 contrast against its background. Large text has a 3:1 minimum under WCAG 2.2 SC 1.4.3.

Use a non-color cue in addition to color for errors, status, selected state, required state, or other critical distinctions.

Check contrast for interactive component boundaries and focus indicators where applicable.

## Pointer targets

WCAG 2.2 SC 2.5.8 Target Size (Minimum) specifies at least 24 × 24 CSS pixels for pointer targets, with defined exceptions. Prefer larger targets when practical, especially for primary actions and touch interfaces.

Do not create dense icon-only controls solely to save space when that compromises usability or discoverability.

## Forms

- Label every control.
- Explain expected format when it is not obvious.
- Identify required/optional inputs clearly.
- Avoid asking for information that is not needed for the task.
- Preserve entered values after validation errors whenever possible.
- Identify the field with an error using text, not color alone.
- Give a known correction suggestion when one exists.
- For multi-error forms, provide a clear summary and links to the affected fields when appropriate.

Important criteria include 1.3.1 Info and Relationships, 3.3.1 Error Identification, 3.3.2 Labels or Instructions, and 3.3.3 Error Suggestion.

## Dynamic content and status

When content changes without navigation, determine whether users need to be informed. For example:

- save completed
- upload finished
- search results updated
- background job started or completed
- validation failed

Use appropriate semantic/status mechanisms rather than relying only on visual animation or changing text.

## Responsive and zoom behavior

Design for reflow, zoom, and different input methods. Avoid information or actions that require horizontal scrolling at common zoom levels unless the content itself genuinely needs a two-dimensional presentation.

Do not make essential actions available only on hover. Touch, keyboard, voice, and assistive-technology users must have an equivalent path.

## Motion

Avoid unnecessary animation. For meaningful motion, consider reduced-motion preferences and make sure the task remains usable without animation.

## Accessibility verification matrix

For the final design, record:

| Area | Design decision | How to verify |
|---|---|---|
| Keyboard | All actions reachable and ordered | Keyboard-only walkthrough |
| Focus | Visible and not obscured | Tab/Shift+Tab review at relevant viewport sizes |
| Forms | Labels, instructions, errors | Screen-reader + DOM/semantics review |
| Contrast | Text and relevant UI indicators meet required contrast | Automated contrast check |
| Targets | Interactive targets meet minimums or exceptions | CSS/layout inspection |
| Dynamic state | Important updates communicated | Screen-reader behavior / accessibility tree |
| Responsive | No loss of content/actions at zoom and narrow widths | Reflow + zoom test |
| Motion | Non-essential motion respects user preference | Reduced-motion test |
