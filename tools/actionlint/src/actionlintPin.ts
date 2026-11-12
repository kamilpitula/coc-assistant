// The single pin CI, the pre-commit hook, and the local command all read.
// Version and sha256 values copied from the official release checksums file
// (actionlint_1.7.12_checksums.txt), checked 2026-11-12.
export const actionlintVersion = '1.7.12'

export interface ActionlintPinnedAsset {
  fileName: string
  sha256: string
}

export const actionlintDownloadBase = `https://github.com/rhysd/actionlint/releases/download/v${actionlintVersion}`

export const actionlintAssets: Record<string, ActionlintPinnedAsset> = {
  'linux-x64': {
    fileName: `actionlint_${actionlintVersion}_linux_amd64.tar.gz`,
    sha256: '8aca8db96f1b94770f1b0d72b6dddcb1ebb8123cb3712530b08cc387b349a3d8',
  },
  'win32-x64': {
    fileName: `actionlint_${actionlintVersion}_windows_amd64.zip`,
    sha256: '6e7241b51e6817ea6a047693d8e6fed13b31819c9a0dd6c5a726e1592d22f6e9',
  },
}
