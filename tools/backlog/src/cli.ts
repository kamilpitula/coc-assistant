import { execFileSync } from 'node:child_process'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { buildBacklogReport, type GitBranches } from './backlog.ts'
import { parseBranchRefs } from './branches.ts'
import { checkBacklog } from './check.ts'
import { formatCheck, formatReport } from './format.ts'
import { parsePbiFile, type ParseResult } from './pbiFile.ts'

export interface BacklogOptions {
  repoRoot: string
  check: boolean
  readBranches: () => GitBranches
}

export interface BacklogRun {
  output: string
  exitCode: number
}

export function runBacklog(options: BacklogOptions): BacklogRun {
  const results = readPbiFiles(options.repoRoot)
  if (options.check) {
    const errors = checkBacklog(results)
    return { output: formatCheck(errors, results.length), exitCode: errors.length > 0 ? 1 : 0 }
  }
  const pbis = results.flatMap((result) => (result.ok ? [result.pbi] : []))
  const invalidFileErrors = results.flatMap((result) =>
    result.ok ? [] : result.errors.map((error) => `${result.path}: ${error}`),
  )
  const report = buildBacklogReport(pbis, options.readBranches())
  return { output: formatReport(report, invalidFileErrors), exitCode: 0 }
}

function readPbiFiles(repoRoot: string): ParseResult[] {
  const docsDirectory = join(repoRoot, 'docs')
  const paths = readdirSync(docsDirectory, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .flatMap((area) => markdownFilesIn(join(docsDirectory, area.name, 'issues')).map((file) => `docs/${area.name}/issues/${file}`))
    .sort()
  return paths.map((path) => parsePbiFile(path, readFileSync(join(repoRoot, path), 'utf8')))
}

function markdownFilesIn(directory: string): string[] {
  try {
    return readdirSync(directory).filter((file) => file.endsWith('.md'))
  } catch {
    return []
  }
}

function readGitBranches(repoRoot: string): GitBranches {
  const listBranches = (mergeFilter: string): string[] =>
    parseBranchRefs(
      execFileSync('git', ['branch', '-a', mergeFilter, 'master', '--format=%(refname)'], { cwd: repoRoot, encoding: 'utf8' }),
    )
  return { unmergedIds: listBranches('--no-merged'), mergedIds: listBranches('--merged') }
}

if (import.meta.main) {
  const repoRoot = fileURLToPath(new URL('../../../', import.meta.url))
  const run = runBacklog({
    repoRoot,
    check: process.argv.includes('--check'),
    readBranches: () => readGitBranches(repoRoot),
  })
  process.stdout.write(run.output)
  process.exitCode = run.exitCode
}
