# Game Rules

This folder is the single source of truth for Call of Cthulhu 7th Edition game
rules in this project. Every other artifact (CONTEXT.md, specs, tickets, ADRs,
agent and skill instructions, code, and tests) references these documents
instead of restating rules.

## Documents

| Document | Covers |
| --- | --- |
| [coc7_character_creation_and_development_rules.md](coc7_character_creation_and_development_rules.md) | Investigator data model, characteristics, age, derived attributes, skills, occupations, combat and weapon fields, finances, backstory, conditions, creation algorithm, validation, and development |
| [project_ruleset.md](project_ruleset.md) | Supported Eras and Creation Methods, disabled optional rules, and project house rules |
| [catalogs/occupations.1920s.json](catalogs/occupations.1920s.json) | 1920s Occupation catalog (section 7 data), with provenance per section 20. Verified 2026-10-02; page references still to be added |
| [catalogs/skills.1920s.json](catalogs/skills.1920s.json) | 1920s skill bases (section 6.1 data), with provenance per section 20. Moved unchanged from section 6.1 and verified 2026-10-02; page references still to be added |
| [catalogs/skill-specializations.json](catalogs/skill-specializations.json) | Fighting and Firearms specialization bases (section 6.2 data) and the specialized skill families, with provenance per section 20. Moved unchanged from section 6.2 on 2026-10-07; awaiting project owner verification; page references still to be added |
| [catalogs/wealth.1920s.json](catalogs/wealth.1920s.json) | 1920s wealth table (section 11 data), with provenance per section 20. Moved unchanged from section 11 on 2026-10-07; awaiting project owner verification; page references still to be added |
| [catalogs/age-rules.json](catalogs/age-rules.json) | Creation age brackets (section 3.1 data), with provenance per section 20. Moved unchanged from section 3.1 on 2026-10-02; awaiting project owner verification; page references still to be added |
| [catalogs/characteristics-rules.json](catalogs/characteristics-rules.json) | Damage Bonus and Build table (section 5.8 data), with provenance per section 20. Moved unchanged from section 5.8 on 2026-10-02; awaiting project owner verification; page references still to be added |

Not yet covered: Non-Player Entities (Human NPC and Mythos Creature profiles),
Sanity loss and Sanity rolls during play, skill rolls and difficulty levels
during play, combat resolution, and the Cthulhu Mythos tome and spell rules.
Add a document here before specifying or implementing behavior that depends
on one of these.

## Referencing rules

- Link to the document and the section heading anchor, for example
  [Hit Points](coc7_character_creation_and_development_rules.md#54-hit-points).
  In plain text, write the path and section number:
  `docs/game-rules/coc7_character_creation_and_development_rules.md` section 5.4.
- Do not copy formulas, tables, value ranges, or rule wording into other
  artifacts. A one-line summary next to a link is acceptable only when the
  link alone would be unreadable; the linked section remains authoritative.
- Specs and tickets state which rule sections a behavior depends on; they do
  not redefine the rule.
- Code that implements a rule carries a short comment pointing to the section.
  Tests that verify a rule name the section in the test name or a comment, so
  a rule change can be traced to every test it affects.
- Rule data that code needs at runtime (catalogs, tables) is loaded from
  data-driven catalogs as described in section 20 of the character rules
  document, not hard-coded in multiple places.

## Changing rules

- When behavior needs a rule that is missing, ambiguous, or contradicts
  another artifact, stop and flag it. Update the document here first, then
  the artifacts that reference it.
- House rules or optional rules are recorded here and marked as such; they are
  never introduced only in a spec, ticket, or code.
- If a section is renamed or renumbered, update every reference to it
  (search the repository for the old anchor and section number).
