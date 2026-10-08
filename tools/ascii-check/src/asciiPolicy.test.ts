import { describe, expect, it } from 'vitest'

import { isScanned } from './asciiPolicy.ts'

describe('isScanned', () => {
  it('scans source, tests, docs, specs, and CI files', () => {
    expect(isScanned('backend/src/CocAssistant.Api/Program.cs')).toBe(true)
    expect(isScanned('frontend/src/main.tsx')).toBe(true)
    expect(isScanned('e2e/tests/home.spec.ts')).toBe(true)
    expect(isScanned('docs/backlog.md')).toBe(true)
    expect(isScanned('specs/campaign-play/spec.md')).toBe(true)
    expect(isScanned('.github/workflows/ci.yml')).toBe(true)
    expect(isScanned('CLAUDE.md')).toBe(true)
  })

  it('skips game rules, agent steering, and lockfiles', () => {
    expect(isScanned('docs/game-rules/coc7_character_creation_and_development_rules.md')).toBe(false)
    expect(isScanned('.claude/agents/builder.md')).toBe(false)
    expect(isScanned('.github/agents/builder.agent.md')).toBe(false)
    expect(isScanned('.github/skills/tdd/SKILL.md')).toBe(false)
    expect(isScanned('.github/instructions/e2e.instructions.md')).toBe(false)
    expect(isScanned('.github/copilot-instructions.md')).toBe(false)
    expect(isScanned('frontend/package-lock.json')).toBe(false)
  })

  it('skips baselined files', () => {
    expect(isScanned('e2e/CLAUDE.md')).toBe(false)
    expect(isScanned('frontend/src/campaign-play/components/join-campaign/join-campaign.tsx')).toBe(false)
  })
})
