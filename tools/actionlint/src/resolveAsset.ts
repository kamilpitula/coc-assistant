import { actionlintAssets, actionlintDownloadBase } from './actionlintPin.ts'

export interface ActionlintAsset {
  fileName: string
  url: string
  sha256: string
}

export function resolveActionlintAsset(platform: string, arch: string): ActionlintAsset {
  const key = `${platform}-${arch}`
  const pinned = actionlintAssets[key]
  if (pinned === undefined) {
    throw new Error(`Unsupported platform "${key}"; supported: ${Object.keys(actionlintAssets).join(', ')}`)
  }
  return { fileName: pinned.fileName, url: `${actionlintDownloadBase}/${pinned.fileName}`, sha256: pinned.sha256 }
}
