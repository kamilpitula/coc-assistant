import { ESLint } from 'eslint'
import { beforeAll, describe, expect, it } from 'vitest'

// Vitest runs from frontend/, so ESLint resolves eslint.config.js from the working directory.
const eslint = new ESLint()

// The first lint loads eslint.config.js and its plugins, which takes tens of seconds on a cold or busy run.
const configLoadTimeoutMs = 120_000

beforeAll(async () => {
  await eslint.lintText('', { filePath: 'src/fixture.tsx' })
}, configLoadTimeoutMs)

async function ruleIdsFor(code: string, filePath = 'src/fixture.tsx'): Promise<(string | null)[]> {
  const [result] = await eslint.lintText(code, { filePath })
  return result.messages.map((message) => message.ruleId)
}

function functionWithBranches(branchCount: number): string {
  const branches = Array.from({ length: branchCount }, (_, index) => `  if (x === ${index}) return ${index}\n`).join('')
  return `export function pick(x: number): number {\n${branches}  return -1\n}\n`
}

describe('complexity rule', () => {
  it('accepts a function with complexity 10', async () => {
    expect(await ruleIdsFor(functionWithBranches(9))).not.toContain('complexity')
  })

  it('flags a function with complexity 11', async () => {
    expect(await ruleIdsFor(functionWithBranches(10))).toContain('complexity')
  })

  it('skips files in the baseline', async () => {
    const ruleIds = await ruleIdsFor(functionWithBranches(10), 'src/campaign-play/services/skillTableEntries.ts')
    expect(ruleIds).not.toContain('complexity')
  })
})

describe('import placement rules', () => {  it('flags an import placed after code', async () => {
    const code = "import { a } from 'pkg-a'\nexport const b = a\nimport { c } from 'pkg-c'\nexport const d = c\n"
    expect(await ruleIdsFor(code)).toContain('no-restricted-syntax')
  })

  it('flags a package import placed after a local import', async () => {
    const code = "import { a } from '@/a'\nimport { b } from 'pkg-b'\nexport const c = [a, b]\n"
    expect(await ruleIdsFor(code)).toContain('no-restricted-syntax')
  })

  it('flags a package import placed after a relative import', async () => {
    const code = "import { a } from './a'\nimport { b } from 'pkg-b'\nexport const c = [a, b]\n"
    expect(await ruleIdsFor(code)).toContain('no-restricted-syntax')
  })

  it('accepts packages first, then local imports, after a directive', async () => {
    const code = "'use client'\nimport { a } from 'pkg-a'\nimport { b } from '@/b'\nimport { c } from './c'\nexport const d = [a, b, c]\n"
    expect(await ruleIdsFor(code)).not.toContain('no-restricted-syntax')
  })
})

describe('ADR-0028 slice direction', () => {
  it('flags a scene-play import from scenario-preparation', async () => {
    const code = "import { HandoutPanel } from '@/scene-play/components/handout-panel/handout-panel'\nexport const panel = HandoutPanel\n"
    expect(await ruleIdsFor(code, 'src/scenario-preparation/components/scene-panel/scene-panel.tsx')).toContain('no-restricted-imports')
  })

  it('accepts a scene-play import from scene-play', async () => {
    const code = "import { HandoutPanel } from '@/scene-play/components/handout-panel/handout-panel'\nexport const panel = HandoutPanel\n"
    expect(await ruleIdsFor(code, 'src/scene-play/components/active-scene-panel/active-scene-panel.tsx')).not.toContain('no-restricted-imports')
  })
})

describe('bare fetch ban', () => {
  it('flags a bare fetch call in a service', async () => {
    const code = "export async function me(token: string): Promise<unknown> {\n  return fetch('/api/account/me', { headers: { Authorization: `Bearer ${token}` } })\n}\n"
    expect(await ruleIdsFor(code, 'src/shared/services/accountApi.ts')).toContain('no-restricted-globals')
  })

  it('accepts the fetch call inside apiFetch', async () => {
    const code = "export function apiFetch(input: string, init?: RequestInit): Promise<Response> {\n  return fetch(input, init)\n}\n"
    expect(await ruleIdsFor(code, 'src/shared/services/apiFetch.ts')).not.toContain('no-restricted-globals')
  })
})
