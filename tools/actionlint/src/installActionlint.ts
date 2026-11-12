import { join } from 'node:path'

import { actionlintVersion, type ActionlintPinnedAsset } from './actionlintPin.ts'
import { resolveActionlintAsset } from './resolveAsset.ts'

export interface ActionlintInstallDeps {
  platform: string
  arch: string
  cacheRoot: string
  systemRoot?: string
  download: (url: string) => Promise<Buffer>
  fileExists: (path: string) => boolean
  writeFile: (path: string, data: Buffer) => void
  removeFile: (path: string) => void
  makeDirectory: (path: string) => void
  runCommand: (command: string, args: readonly string[]) => void
  hashHex: (data: Buffer) => string
}

function binaryName(platform: string): string {
  return platform === 'win32' ? 'actionlint.exe' : 'actionlint'
}

function extractCommand(platform: string, systemRoot: string | undefined): string {
  if (platform === 'win32') {
    if (systemRoot === undefined || systemRoot === '') {
      throw new Error('SystemRoot is not set; cannot locate tar.exe')
    }
    return `${systemRoot}\\System32\\tar.exe`
  }
  return 'tar'
}

function extractArgs(platform: string, archivePath: string, directory: string): readonly string[] {
  if (platform === 'win32') {
    return ['-xf', archivePath, '-C', directory]
  }
  return ['-xzf', archivePath, '-C', directory]
}

export async function installActionlint(deps: ActionlintInstallDeps): Promise<string> {
  const asset = resolveActionlintAsset(deps.platform, deps.arch)
  const pinned: ActionlintPinnedAsset = { fileName: asset.fileName, sha256: asset.sha256 }
  const directory = join(deps.cacheRoot, `${actionlintVersion}-${pinned.sha256.slice(0, 12)}`)
  const binaryPath = join(directory, binaryName(deps.platform))
  if (deps.fileExists(binaryPath)) {
    return binaryPath
  }
  deps.makeDirectory(directory)
  const archivePath = join(directory, pinned.fileName)
  let data: Buffer
  try {
    data = await deps.download(asset.url)
  } catch (error) {
    throw new Error(`Failed to download actionlint from ${asset.url}: ${(error as Error).message}`)
  }
  if (deps.hashHex(data) !== pinned.sha256) {
    deps.removeFile(archivePath)
    throw new Error(`actionlint sha256 mismatch for ${pinned.fileName}; expected ${pinned.sha256}`)
  }
  deps.writeFile(archivePath, data)
  deps.runCommand(extractCommand(deps.platform, deps.systemRoot), extractArgs(deps.platform, archivePath, directory))
  return binaryPath
}
