import { describe, expect, it } from 'vitest'

import { resolveActionlintAsset } from './resolveAsset.ts'

describe('resolveActionlintAsset', () => {
  it('resolves the linux tarball and its sha256', () => {
    const asset = resolveActionlintAsset('linux', 'x64')

    expect(asset.fileName).toBe('actionlint_1.7.12_linux_amd64.tar.gz')
    expect(asset.sha256).toBe('8aca8db96f1b94770f1b0d72b6dddcb1ebb8123cb3712530b08cc387b349a3d8')
    expect(asset.url).toBe(
      'https://github.com/rhysd/actionlint/releases/download/v1.7.12/actionlint_1.7.12_linux_amd64.tar.gz',
    )
  })

  it('resolves the windows zip and its sha256', () => {
    const asset = resolveActionlintAsset('win32', 'x64')

    expect(asset.fileName).toBe('actionlint_1.7.12_windows_amd64.zip')
    expect(asset.sha256).toBe('6e7241b51e6817ea6a047693d8e6fed13b31819c9a0dd6c5a726e1592d22f6e9')
    expect(asset.url).toBe(
      'https://github.com/rhysd/actionlint/releases/download/v1.7.12/actionlint_1.7.12_windows_amd64.zip',
    )
  })

  it('throws naming the supported platforms', () => {
    expect(() => resolveActionlintAsset('darwin', 'arm64')).toThrow(/linux-x64.*win32-x64|win32-x64.*linux-x64/)
  })
})
