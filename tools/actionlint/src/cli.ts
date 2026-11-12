import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { installActionlint } from './installActionlint.ts'

export const actionlintArgs: readonly string[] = ['-shellcheck=', '-pyflakes=']

export interface ActionlintCliDeps {
  repoRoot: string
  install: () => Promise<string>
  runBinary: (binaryPath: string, args: readonly string[], options: { cwd: string }) => number
  writeOutput: (message: string) => void
}

export interface ActionlintCliRun {
  exitCode: number
}

export async function runActionlintCli(deps: ActionlintCliDeps): Promise<ActionlintCliRun> {
  let binaryPath: string
  try {
    binaryPath = await deps.install()
  } catch (error) {
    deps.writeOutput(`actionlint install failed: ${(error as Error).message}\n`)
    return { exitCode: 1 }
  }
  return { exitCode: deps.runBinary(binaryPath, actionlintArgs, { cwd: deps.repoRoot }) }
}

async function download(url: string): Promise<Buffer> {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`)
  }
  return Buffer.from(await response.arrayBuffer())
}

if (import.meta.main) {
  const repoRoot = fileURLToPath(new URL('../../../', import.meta.url))
  const cacheRoot = join(repoRoot, 'tools', 'actionlint', '.cache')
  const run = await runActionlintCli({
    repoRoot,
    install: () =>
      installActionlint({
        platform: process.platform,
        arch: process.arch,
        cacheRoot,
        systemRoot: process.env.SystemRoot,
        download,
        fileExists: (path) => existsSync(path),
        writeFile: (path, data) => writeFileSync(path, data),
        removeFile: (path) => rmSync(path, { force: true }),
        makeDirectory: (path) => mkdirSync(path, { recursive: true }),
        runCommand: (command, args) => void execFileSync(command, [...args], { stdio: 'inherit' }),
        hashHex: (data) => createHash('sha256').update(data).digest('hex'),
      }),
    runBinary: (binaryPath, args, options) => {
      try {
        execFileSync(binaryPath, [...args], { cwd: options.cwd, stdio: 'inherit' })
        return 0
      } catch (error) {
        return (error as { status?: number }).status ?? 1
      }
    },
    writeOutput: (message) => process.stderr.write(message),
  })
  process.exitCode = run.exitCode
}
