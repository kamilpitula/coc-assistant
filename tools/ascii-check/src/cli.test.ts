import { describe, expect, it } from 'vitest'

import { runAsciiCheck } from './cli.ts'

function runOn(files: Record<string, string | Buffer>) {
  return runAsciiCheck({
    listFiles: () => Object.keys(files),
    readFile: (path) => Buffer.from(files[path]),
  })
}

describe('runAsciiCheck', () => {
  it('passes and exits 0 when scanned files are ASCII', () => {
    const run = runOn({ 'frontend/src/a.ts': 'export const a = 1\n', 'docs/b.md': '\uFEFF# Title\n' })

    expect(run).toEqual({ output: 'ascii check passed (2 files scanned)\n', exitCode: 0 })
  })

  it('lists every non-ASCII character and exits 1', () => {
    const run = runOn({ 'docs/b.md': 'ok\nnot \u2014 ok\n', 'specs/c.md': '\u2026' })

    expect(run.exitCode).toBe(1)
    expect(run.output).toBe(
      [
        'ascii check failed with 2 non-ASCII character(s)',
        '  docs/b.md:2:5 U+2014',
        '  specs/c.md:1:1 U+2026',
        '',
      ].join('\n'),
    )
  })

  it('skips excluded and binary files', () => {
    const run = runOn({
      'docs/game-rules/rules.md': '\u2014',
      'frontend/public/logo.png': Buffer.from([0x89, 0x00, 0xff]),
      'docs/b.md': 'ok\n',
    })

    expect(run).toEqual({ output: 'ascii check passed (1 files scanned)\n', exitCode: 0 })
  })
})
