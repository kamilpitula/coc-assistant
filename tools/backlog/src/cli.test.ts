import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { runBacklog } from './cli.ts'

let repoRoot: string

function writePbi(area: string, fileName: string, frontmatter: string, body = ''): void {
  const directory = join(repoRoot, 'docs', area, 'issues')
  mkdirSync(directory, { recursive: true })
  writeFileSync(join(directory, fileName), `---\r\n${frontmatter.replace(/\n/g, '\r\n')}\r\n---\r\n\r\n${body}`)
}

beforeEach(() => {
  repoRoot = mkdtempSync(join(tmpdir(), 'backlog-'))
  writePbi('area', '01-first.md', 'id: PBI-AR-001\nstatus: done\nblocked_by: []', '## Verification\n- [x] Met.\n\n## Follow-ups\n- Cache the list\n')
  writePbi('area', '02-second.md', 'id: PBI-AR-002\nstatus: todo\nblocked_by: [PBI-AR-001]')
  writePbi('area', '03-third.md', 'id: PBI-AR-003\nstatus: todo\nblocked_by: [PBI-AR-002]')
  writePbi('other', '01-other.md', 'id: PBI-OT-001\nstatus: todo\nblocked_by: []')
  writeFileSync(join(repoRoot, 'docs', 'area', 'notes.txt'), 'not a PBI')
})

afterEach(() => {
  rmSync(repoRoot, { recursive: true, force: true })
})

describe('runBacklog default report', () => {
  it('prints statuses with derived in-progress, ready PBIs, unpromoted follow-ups and git warnings, and exits 0', () => {
    const result = runBacklog({
      repoRoot,
      check: false,
      readBranches: () => ({ unmergedIds: ['PBI-OT-001'], mergedIds: ['PBI-AR-003'] }),
    })

    expect(result.exitCode).toBe(0)
    expect(result.output).toBe(
      [
        'Status',
        '  done         PBI-AR-001  docs/area/issues/01-first.md',
        '  todo         PBI-AR-002  docs/area/issues/02-second.md  blocked by PBI-AR-001',
        '  todo         PBI-AR-003  docs/area/issues/03-third.md  blocked by PBI-AR-002',
        '  in-progress  PBI-OT-001  docs/other/issues/01-other.md',
        '',
        'Ready',
        '  PBI-AR-002',
        '',
        'Unpromoted follow-ups',
        '  PBI-AR-001: Cache the list',
        '',
        'Git mismatch warnings',
        '  PBI-AR-003: a branch is merged into master but status is todo',
        '',
      ].join('\n'),
    )
  })

  it('still reports valid PBIs when a file is invalid, lists the invalid file and exits 0', () => {
    writePbi('area', '04-broken.md', 'id: PBI-AR-004\nstatus: in-progress\nblocked_by: []')

    const result = runBacklog({ repoRoot, check: false, readBranches: () => ({ unmergedIds: [], mergedIds: [] }) })

    expect(result.exitCode).toBe(0)
    expect(result.output).toContain('  todo         PBI-OT-001  docs/other/issues/01-other.md\n')
    expect(result.output).toContain(
      'Invalid PBI files (excluded above; run --check)\n  docs/area/issues/04-broken.md: status must be one of todo, done, dropped\n',
    )
  })
})

describe('runBacklog --check', () => {
  it('passes a consistent backlog without reading git, even when git disagrees', () => {
    const readBranches = vi.fn(() => ({ unmergedIds: [], mergedIds: ['PBI-AR-003'] }))

    const result = runBacklog({ repoRoot, check: true, readBranches })

    expect(result).toEqual({ output: 'backlog check passed (4 PBI files)\n', exitCode: 0 })
    expect(readBranches).not.toHaveBeenCalled()
  })

  it('fails with exit code 1 and lists every error', () => {
    writePbi('area', '04-duplicate.md', 'id: PBI-AR-001\nstatus: todo\nblocked_by: [PBI-ZZ-001]')
    writePbi('area', '05-done.md', 'id: PBI-AR-005\nstatus: done\nblocked_by: []', '## Verification\n- [ ] Not met.\n')
    writePbi('area', '06-no-frontmatter.md', 'id: PBI-AR-006')
    writeFileSync(join(repoRoot, 'docs', 'area', 'issues', '06-no-frontmatter.md'), '# PBI-AR-006: Missing\n')

    const result = runBacklog({ repoRoot, check: true, readBranches: () => ({ unmergedIds: [], mergedIds: [] }) })

    expect(result.exitCode).toBe(1)
    expect(result.output).toBe(
      [
        'backlog check failed with 4 error(s)',
        '  docs/area/issues/06-no-frontmatter.md: missing frontmatter',
        '  docs/area/issues/04-duplicate.md: duplicate id PBI-AR-001 (also in docs/area/issues/01-first.md)',
        '  docs/area/issues/04-duplicate.md: blocked_by names unknown id PBI-ZZ-001',
        '  docs/area/issues/05-done.md: done but Verification item is unticked without a Deferred: note: Not met.',
        '',
      ].join('\n'),
    )
  })
})
