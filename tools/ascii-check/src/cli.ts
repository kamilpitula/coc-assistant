import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { isScanned } from './asciiPolicy.ts'
import { findNonAscii } from './findNonAscii.ts'

export interface AsciiCheckOptions {
  listFiles: () => string[]
  readFile: (path: string) => Buffer
}

export interface AsciiCheckRun {
  output: string
  exitCode: number
}

export function runAsciiCheck(options: AsciiCheckOptions): AsciiCheckRun {
  const textFiles = options.listFiles()
    .filter(isScanned)
    .map((path) => ({ path, content: options.readFile(path) }))
    // A NUL byte marks a binary file.
    .filter((file) => !file.content.includes(0))
  const findings = textFiles.flatMap((file) => findNonAscii(file.path, file.content.toString('utf8')))
  if (findings.length === 0) {
    return { output: `ascii check passed (${textFiles.length} files scanned)\n`, exitCode: 0 }
  }
  const lines = findings.map((finding) => `  ${finding.path}:${finding.line}:${finding.column} ${finding.codePoint}`)
  return { output: [`ascii check failed with ${findings.length} non-ASCII character(s)`, ...lines, ''].join('\n'), exitCode: 1 }
}

function listTrackedFiles(repoRoot: string): string[] {
  return execFileSync('git', ['ls-files', '-z'], { cwd: repoRoot, encoding: 'utf8' }).split('\0').filter(Boolean)
}

if (import.meta.main) {
  const repoRoot = fileURLToPath(new URL('../../../', import.meta.url))
  const run = runAsciiCheck({
    listFiles: () => listTrackedFiles(repoRoot),
    readFile: (path) => readFileSync(join(repoRoot, path)),
  })
  process.stdout.write(run.output)
  process.exitCode = run.exitCode
}
