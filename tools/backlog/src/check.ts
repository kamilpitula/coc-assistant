import type { ParseResult, Pbi } from './pbiFile.ts'

/** Returns the `--check` errors for a parsed backlog; git state is never consulted. */
export function checkBacklog(results: ParseResult[]): string[] {
  const invalidFrontmatter = results.flatMap((result) =>
    result.ok ? [] : result.errors.map((error) => `${result.path}: ${error}`),
  )
  const pbis = results.flatMap((result) => (result.ok ? [result.pbi] : []))
  return [...invalidFrontmatter, ...duplicateIds(pbis), ...unknownBlockers(pbis), ...undeferredItems(pbis)]
}

function undeferredItems(pbis: Pbi[]): string[] {
  return pbis
    .filter((pbi) => pbi.status === 'done')
    .flatMap((pbi) =>
      pbi.verification
        .filter((item) => !item.ticked && !item.text.includes('Deferred:'))
        .map((item) => `${pbi.path}: done but Verification item is unticked without a Deferred: note: ${item.text}`),
    )
}

function unknownBlockers(pbis: Pbi[]): string[] {
  const knownIds = new Set(pbis.map((pbi) => pbi.id))
  return pbis.flatMap((pbi) =>
    pbi.blockedBy
      .filter((id) => !knownIds.has(id))
      .map((id) => `${pbi.path}: blocked_by names unknown id ${id}`),
  )
}

function duplicateIds(pbis: Pbi[]): string[] {
  const firstPathById = new Map<string, string>()
  const errors: string[] = []
  for (const pbi of pbis) {
    const firstPath = firstPathById.get(pbi.id)
    if (firstPath === undefined) {
      firstPathById.set(pbi.id, pbi.path)
    } else {
      errors.push(`${pbi.path}: duplicate id ${pbi.id} (also in ${firstPath})`)
    }
  }
  return errors
}
