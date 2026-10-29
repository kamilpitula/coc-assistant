import type { Clue } from '@/scene-play/types/Reveal'

/** The Clues made on one Scene, newest first. */
export interface ClueGroup {
  sceneId: string
  sceneTitle: string
  clues: Clue[]
}

/**
 * Groups Clues by Scene (specs/scene-play/ux.md section 15). Groups are ordered by their newest Clue, and the Clues within a
 * group are newest first.
 */
export function groupCluesByScene(clues: Clue[]): ClueGroup[] {
  const newestFirst = [...clues].sort((left, right) => Date.parse(right.revealedAt) - Date.parse(left.revealedAt))
  const groups = new Map<string, ClueGroup>()
  for (const clue of newestFirst) {
    const group = groups.get(clue.scene.id) ?? { sceneId: clue.scene.id, sceneTitle: clue.scene.title, clues: [] }
    group.clues.push(clue)
    groups.set(clue.scene.id, group)
  }

  return [...groups.values()]
}
