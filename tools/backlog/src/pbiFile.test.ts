import { describe, expect, it } from 'vitest'

import { parsePbiFile } from './pbiFile.ts'

const path = 'docs/area/issues/01-example.md'

function pbiText(frontmatter: string, body = '# PBI-AR-001: Example\n'): string {
  return `---\n${frontmatter}\n---\n\n${body}`
}

describe('parsePbiFile frontmatter', () => {
  it('reads id, status, blocked_by and pr from valid frontmatter', () => {
    const result = parsePbiFile(
      path,
      pbiText('id: PBI-AR-002\nstatus: done\nblocked_by: [PBI-AR-001, PBI-E2E-001]\npr: 7'),
    )

    expect(result).toMatchObject({
      ok: true,
      pbi: { path, id: 'PBI-AR-002', status: 'done', blockedBy: ['PBI-AR-001', 'PBI-E2E-001'], pr: 7 },
    })
  })
})

describe('parsePbiFile invalid frontmatter', () => {
  it.each([
    ['no frontmatter block', '# PBI-AR-001: Example\n', 'missing frontmatter'],
    ['unparseable YAML', pbiText('id: [PBI-AR-001\nstatus: todo'), 'frontmatter is not valid YAML'],
    ['a frontmatter that is not a mapping', pbiText('- PBI-AR-001'), 'frontmatter must be a mapping'],
    ['a missing id', pbiText('status: todo\nblocked_by: []'), 'id must look like PBI-<AREA>-<NNN>'],
    ['a malformed id', pbiText('id: CP-1\nstatus: todo\nblocked_by: []'), 'id must look like PBI-<AREA>-<NNN>'],
    ['a stored in-progress status', pbiText('id: PBI-AR-001\nstatus: in-progress\nblocked_by: []'), 'status must be one of todo, done, dropped'],
    ['a missing blocked_by', pbiText('id: PBI-AR-001\nstatus: todo'), 'blocked_by must be a list of PBI ids'],
    ['a scalar blocked_by', pbiText('id: PBI-AR-001\nstatus: todo\nblocked_by: PBI-AR-002'), 'blocked_by must be a list of PBI ids'],
    ['a malformed blocked_by id', pbiText('id: PBI-AR-001\nstatus: todo\nblocked_by: [AR-2]'), 'blocked_by must be a list of PBI ids'],
    ['a non-integer pr', pbiText('id: PBI-AR-001\nstatus: done\nblocked_by: []\npr: "#7"'), 'pr must be a positive integer'],
    ['a zero pr', pbiText('id: PBI-AR-001\nstatus: done\nblocked_by: []\npr: 0'), 'pr must be a positive integer'],
    ['an unknown key', pbiText('id: PBI-AR-001\nstatus: todo\nblocked-by: []\nblocked_by: []'), 'unknown frontmatter key: blocked-by'],
  ])('rejects %s', (_case, text, expectedError) => {
    const result = parsePbiFile(path, text)

    expect(result.ok).toBe(false)
    expect(result.ok ? [] : result.errors).toContain(expectedError)
  })

  it('omits pr when it is not present', () => {
    const result = parsePbiFile(path, pbiText('id: PBI-AR-001\nstatus: todo\nblocked_by: []'))

    expect(result.ok && result.pbi).toEqual(expect.objectContaining({ id: 'PBI-AR-001', blockedBy: [] }))
    expect(result.ok && 'pr' in result.pbi).toBe(false)
  })
})

describe('parsePbiFile sections', () => {
  const body = [
    '# PBI-AR-001: Example',
    '',
    '## Verification',
    '- [x] First item is met.',
    '- [ ] Second item. Deferred: see Follow-ups.',
    '- [X] Third item is met.',
    '',
    '## Refinement Protocol',
    '- [ ] Not a verification item.',
    '',
    '## Follow-ups',
    '- Add paging to the list -> PBI-AR-004',
    '- Investigate flaky hub reconnect',
    '',
  ].join('\n')
  const frontmatter = 'id: PBI-AR-001\nstatus: done\nblocked_by: []'

  it('reads Verification items with their ticked state, only from the Verification section', () => {
    const result = parsePbiFile(path, pbiText(frontmatter, body))

    expect(result.ok && result.pbi.verification).toEqual([
      { ticked: true, text: 'First item is met.' },
      { ticked: false, text: 'Second item. Deferred: see Follow-ups.' },
      { ticked: true, text: 'Third item is met.' },
    ])
  })

  it('reads Follow-ups and marks entries promoted with -> PBI-...', () => {
    const result = parsePbiFile(path, pbiText(frontmatter, body))

    expect(result.ok && result.pbi.followUps).toEqual([
      { text: 'Add paging to the list -> PBI-AR-004', promotedTo: 'PBI-AR-004' },
      { text: 'Investigate flaky hub reconnect', promotedTo: null },
    ])
  })

  it('parses CRLF files the same as LF files', () => {
    const lf = pbiText(frontmatter, body)
    const crlf = lf.replace(/\n/g, '\r\n')

    expect(parsePbiFile(path, crlf)).toEqual(parsePbiFile(path, lf))
    expect(parsePbiFile(path, crlf).ok).toBe(true)
  })

  it('returns empty lists when the sections are absent', () => {
    const result = parsePbiFile(path, pbiText(frontmatter))

    expect(result.ok && result.pbi).toMatchObject({ verification: [], followUps: [] })
  })
})
