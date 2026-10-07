import type { Pbi, PbiStatus } from './pbiFile.ts'

export interface GitBranches {
  unmergedIds: string[]
  mergedIds: string[]
}

export interface BacklogEntry {
  id: string
  path: string
  status: PbiStatus | 'in-progress'
  blockedBy: string[]
}

export interface UnpromotedFollowUp {
  id: string
  text: string
}

export interface BacklogReport {
  entries: BacklogEntry[]
  ready: string[]
  unpromotedFollowUps: UnpromotedFollowUp[]
  warnings: string[]
}

export function buildBacklogReport(pbis: Pbi[], branches: GitBranches): BacklogReport {
  const unmerged = new Set(branches.unmergedIds)
  const entries: BacklogEntry[] = pbis.map((pbi) => ({
    id: pbi.id,
    path: pbi.path,
    status: unmerged.has(pbi.id) ? 'in-progress' : pbi.status,
    blockedBy: pbi.blockedBy,
  }))
  return {
    entries,
    ready: readyIds(entries),
    unpromotedFollowUps: unpromotedFollowUps(pbis),
    warnings: gitMismatchWarnings(pbis, branches),
  }
}

function readyIds(entries: BacklogEntry[]): string[] {
  const doneIds = new Set(entries.filter((entry) => entry.status === 'done').map((entry) => entry.id))
  return entries
    .filter((entry) => entry.status === 'todo' && entry.blockedBy.every((id) => doneIds.has(id)))
    .map((entry) => entry.id)
}

function unpromotedFollowUps(pbis: Pbi[]): UnpromotedFollowUp[] {
  return pbis.flatMap((pbi) =>
    pbi.followUps
      .filter((followUp) => followUp.promotedTo === null)
      .map((followUp) => ({ id: pbi.id, text: followUp.text })),
  )
}

function gitMismatchWarnings(pbis: Pbi[], branches: GitBranches): string[] {
  const unmerged = new Set(branches.unmergedIds)
  const merged = new Set(branches.mergedIds)
  const warnings: string[] = []
  for (const pbi of pbis) {
    if (unmerged.has(pbi.id) && pbi.status !== 'todo') {
      warnings.push(`${pbi.id}: an unmerged branch exists but status is ${pbi.status}`)
    } else if (merged.has(pbi.id) && !unmerged.has(pbi.id) && pbi.status !== 'done') {
      warnings.push(`${pbi.id}: a branch is merged into master but status is ${pbi.status}`)
    }
  }
  const knownIds = new Set(pbis.map((pbi) => pbi.id))
  for (const id of new Set([...branches.unmergedIds, ...branches.mergedIds])) {
    if (!knownIds.has(id)) {
      warnings.push(`${id}: a branch names this id but no PBI file has it`)
    }
  }
  return warnings
}
