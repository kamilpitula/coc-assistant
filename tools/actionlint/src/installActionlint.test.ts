import { createHash } from 'node:crypto'
import { join } from 'node:path'
import { describe, expect, it, vi } from 'vitest'

import { installActionlint, type ActionlintInstallDeps } from './installActionlint.ts'

const linuxSha = '8aca8db96f1b94770f1b0d72b6dddcb1ebb8123cb3712530b08cc387b349a3d8'
const windowsSha = '6e7241b51e6817ea6a047693d8e6fed13b31819c9a0dd6c5a726e1592d22f6e9'

function makeDeps(overrides: Partial<ActionlintInstallDeps> = {}): ActionlintInstallDeps & {
  download: ReturnType<typeof vi.fn>
  runCommand: ReturnType<typeof vi.fn>
} {
  const download = vi.fn(async () => Buffer.from('archive-bytes'))
  const runCommand = vi.fn()
  return {
    platform: 'linux',
    arch: 'x64',
    cacheRoot: join('tools', 'actionlint', '.cache'),
    systemRoot: 'C:\\Windows',
    download,
    fileExists: () => false,
    writeFile: () => {},
    removeFile: () => {},
    makeDirectory: () => {},
    runCommand,
    hashHex: (data: Buffer) => createHash('sha256').update(data).digest('hex'),
    ...overrides,
  } as ActionlintInstallDeps & {
    download: ReturnType<typeof vi.fn>
    runCommand: ReturnType<typeof vi.fn>
  }
}

describe('installActionlint', () => {
  it('returns the cached binary without downloading', async () => {
    const deps = makeDeps({ fileExists: () => true })

    const binaryPath = await installActionlint(deps)

    expect(binaryPath).toBe(join('tools', 'actionlint', '.cache', `1.7.12-${linuxSha.slice(0, 12)}`, 'actionlint'))
    expect(deps.download).not.toHaveBeenCalled()
  })

  it('extracts a matching archive into the version-keyed directory', async () => {
    const written: string[] = []
    const deps = makeDeps({ writeFile: (path) => void written.push(path), hashHex: () => linuxSha })

    const binaryPath = await installActionlint(deps)

    expect(binaryPath).toBe(
      join('tools', 'actionlint', '.cache', `1.7.12-${linuxSha.slice(0, 12)}`, 'actionlint'),
    )
    expect(deps.runCommand).toHaveBeenCalledWith('tar', [
      '-xzf',
      join('tools', 'actionlint', '.cache', `1.7.12-${linuxSha.slice(0, 12)}`, 'actionlint_1.7.12_linux_amd64.tar.gz'),
      '-C',
      join('tools', 'actionlint', '.cache', `1.7.12-${linuxSha.slice(0, 12)}`),
    ])
    expect(written).toHaveLength(1)
  })

  it('throws on a sha256 mismatch and never extracts', async () => {
    const removed: string[] = []
    const deps = makeDeps({
      hashHex: () => '0'.repeat(64),
      removeFile: (path) => void removed.push(path),
    })

    await expect(installActionlint(deps)).rejects.toThrow(/sha256/i)

    expect(deps.runCommand).not.toHaveBeenCalled()
    expect(removed).toHaveLength(1)
  })

  it('uses SystemRoot tar.exe on win32', async () => {
    const deps = makeDeps({ platform: 'win32', hashHex: () => windowsSha })

    const binaryPath = await installActionlint(deps)

    expect(binaryPath.endsWith('actionlint.exe')).toBe(true)
    expect(deps.runCommand).toHaveBeenCalledWith(
      'C:\\Windows\\System32\\tar.exe',
      expect.arrayContaining(['-C']),
    )
  })

  it('throws with the URL when the download fails', async () => {
    const deps = makeDeps({
      download: vi.fn(async () => {
        throw new Error('socket hang up')
      }),
    })

    await expect(installActionlint(deps)).rejects.toThrow(/actionlint_1\.7\.12_linux_amd64\.tar\.gz/)
  })

  it('throws naming the supported platforms', async () => {
    const deps = makeDeps({ platform: 'darwin', arch: 'arm64' })

    await expect(installActionlint(deps)).rejects.toThrow(/linux-x64/)
  })
})
