import { describe, expect, it, vi } from 'vitest'

import { actionlintArgs, runActionlintCli } from './cli.ts'

describe('runActionlintCli', () => {
  it('runs actionlint with shellcheck and pyflakes off from the repo root', async () => {
    const outputs: string[] = []
    const runBinary = vi.fn(() => 0)

    const run = await runActionlintCli({
      repoRoot: '/repo',
      install: async () => '/cache/actionlint',
      runBinary,
      writeOutput: (message) => void outputs.push(message),
    })

    expect(run).toEqual({ exitCode: 0 })
    expect(runBinary).toHaveBeenCalledWith('/cache/actionlint', ['-shellcheck=', '-pyflakes='], { cwd: '/repo' })
    expect(actionlintArgs).toEqual(['-shellcheck=', '-pyflakes='])
    expect(outputs).toEqual([])
  })

  it('passes the actionlint exit code through', async () => {
    const run = await runActionlintCli({
      repoRoot: '/repo',
      install: async () => '/cache/actionlint',
      runBinary: () => 1,
      writeOutput: () => {},
    })

    expect(run).toEqual({ exitCode: 1 })
  })

  it('exits non-zero with the message when the install fails', async () => {
    const outputs: string[] = []

    const run = await runActionlintCli({
      repoRoot: '/repo',
      install: async () => {
        throw new Error('socket hang up')
      },
      runBinary: () => 0,
      writeOutput: (message) => void outputs.push(message),
    })

    expect(run).toEqual({ exitCode: 1 })
    expect(outputs).toHaveLength(1)
    expect(outputs[0]).toContain('socket hang up')
  })
})
