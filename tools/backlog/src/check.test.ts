import { describe, expect, it } from 'vitest'

import { checkBacklog } from './check.ts'
import type { ParseResult, Pbi } from './pbiFile.ts'

function valid(overrides: Partial<Pbi> & Pick<Pbi, 'id'>): ParseResult {
  return {
    ok: true,
    pbi: { path: `${overrides.id}.md`, status: 'todo', blockedBy: [], verification: [], followUps: [], ...overrides },
  }
}

describe('checkBacklog', () => {
  it('passes a consistent backlog', () => {
    const results = [
      valid({ id: 'PBI-AR-001', status: 'done', verification: [{ ticked: true, text: 'Met.' }] }),
      valid({ id: 'PBI-AR-002', blockedBy: ['PBI-AR-001'], verification: [{ ticked: false, text: 'Not yet.' }] }),
    ]

    expect(checkBacklog(results)).toEqual([])
  })

  it('reports every invalid frontmatter error with its file path', () => {
    const results: ParseResult[] = [
      { ok: false, path: 'docs/ar/issues/01-a.md', errors: ['missing frontmatter'] },
      { ok: false, path: 'docs/ar/issues/02-b.md', errors: ['status must be one of todo, done, dropped', 'pr must be a positive integer'] },
    ]

    expect(checkBacklog(results)).toEqual([
      'docs/ar/issues/01-a.md: missing frontmatter',
      'docs/ar/issues/02-b.md: status must be one of todo, done, dropped',
      'docs/ar/issues/02-b.md: pr must be a positive integer',
    ])
  })

  it('reports an id used by more than one file', () => {
    const results = [
      valid({ id: 'PBI-AR-001', path: 'docs/ar/issues/01-a.md' }),
      valid({ id: 'PBI-AR-001', path: 'docs/ar/issues/02-b.md' }),
    ]

    expect(checkBacklog(results)).toEqual([
      'docs/ar/issues/02-b.md: duplicate id PBI-AR-001 (also in docs/ar/issues/01-a.md)',
    ])
  })

  it('reports a blocked_by id that no PBI file has', () => {
    const results = [
      valid({ id: 'PBI-AR-001' }),
      valid({ id: 'PBI-AR-002', path: 'docs/ar/issues/02-b.md', blockedBy: ['PBI-AR-001', 'PBI-AR-009'] }),
    ]

    expect(checkBacklog(results)).toEqual(['docs/ar/issues/02-b.md: blocked_by names unknown id PBI-AR-009'])
  })

  it('reports an unticked Verification item without a Deferred: note in a done PBI', () => {
    const results = [
      valid({
        id: 'PBI-AR-001',
        path: 'docs/ar/issues/01-a.md',
        status: 'done',
        verification: [
          { ticked: true, text: 'Met.' },
          { ticked: false, text: 'Paging works. Deferred: see Follow-ups.' },
          { ticked: false, text: 'Sorting works.' },
        ],
      }),
    ]

    expect(checkBacklog(results)).toEqual([
      'docs/ar/issues/01-a.md: done but Verification item is unticked without a Deferred: note: Sorting works.',
    ])
  })
})
