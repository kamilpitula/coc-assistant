# Lightweight UX research playbook for engineering teams

Use this when there is no dedicated UX researcher or designer. The goal is not to imitate a full research department; it is to reduce the risk of building the wrong interaction.

## 1. Inspect the existing product

Before looking for external inspiration, inspect:

- neighboring screens
- existing components and design tokens
- wording and terminology
- existing success/error/loading patterns
- navigation conventions
- analytics or telemetry if available
- reported customer/support pain points
- related tickets or acceptance criteria

Look for patterns worth reusing and inconsistencies worth correcting.

## 2. Build an assumption log

Record assumptions explicitly:

| Assumption | Evidence | Confidence | How to validate |
|---|---|---|---|
| Users know X | Existing workflow | Medium | Observe task |
| Users prefer Y | Research source | High | Prototype test |
| Constraint Z is real | Requirement | High | Confirm with owner |

Treat low-confidence, high-impact assumptions as the highest research priority.

## 3. Use secondary research selectively

Search for authoritative evidence when a decision is unfamiliar or risky:

- accessibility requirements and techniques
- platform conventions
- established design-system patterns
- HCI/usability research
- domain-specific workflows

Avoid searching merely to justify a preferred design.

## 4. Do a heuristic walkthrough

Walk the proposed journey and ask:

- Does the interface reflect the user's language?
- Does each action produce understandable feedback?
- Is the current state/location obvious?
- Can the user undo or recover from mistakes?
- Are important choices visible without relying on memory?
- Is the interface consistent with nearby product behavior?
- Does every screen earn its complexity?

Treat heuristic findings as design guidance, not proof of user preference.

## 5. Prototype the riskiest interaction

Do not prototype every pixel. Prototype the part most likely to be wrong:

- a complex form
- a new navigation model
- an unusual data manipulation pattern
- a multi-step workflow
- a critical confirmation/error flow

A low-fidelity prototype can be enough to validate task flow.

## 6. Run lightweight usability checks

When real users are available, use task-based evaluation:

1. Give the participant a realistic goal without explaining the UI.
2. Ask what they expect to happen before key actions.
3. Observe where they hesitate, misinterpret, or backtrack.
4. Do not teach the interface during the test.
5. Record behavior separately from interpretation.
6. Turn observed friction into design changes.

Even a small number of sessions can uncover severe flow problems, but do not generalize a tiny sample into statistical claims.

## 7. Research competitors carefully

Use competitor or adjacent-product research to identify interaction patterns and terminology, not to copy visual design.

Ask:

- What user problem is this pattern solving?
- What assumptions does it make?
- Does it fit our product's workflow?
- Can our existing components support it?
- What accessibility or responsive trade-offs does it introduce?

## 8. Make a decision record

For the final proposal, record:

- decision
- alternatives considered
- strongest evidence
- important assumptions
- risks
- what would cause the team to revisit the decision

This creates institutional memory for an engineering-led team and prevents repeated design debates.

## Recommended source hierarchy

1. W3C/WAI and applicable standards
2. The team's own product data and user evidence
3. The team's design system/platform guidance
4. Established public design systems and service manuals
5. Credible HCI/usability research
6. Relevant product examples
7. Opinion pieces, social posts, or design trend content

Prefer primary and authoritative sources. Cite sources used for substantive claims.
