const refPrefixPattern = /^refs\/(?:heads|remotes\/[^/]+)\//
const branchNamePattern = /^[^/]+\/([a-z0-9]+)-(\d{3})(?:-|$)/i

/** Maps `git branch -a --format=%(refname)` output to the distinct PBI ids the branch names carry. */
export function parseBranchRefs(gitOutput: string): string[] {
  const ids = new Set<string>()
  for (const line of gitOutput.split(/\r?\n/)) {
    const match = branchNamePattern.exec(line.trim().replace(refPrefixPattern, ''))
    if (match) {
      ids.add(`PBI-${match[1].toUpperCase()}-${match[2]}`)
    }
  }
  return [...ids]
}
