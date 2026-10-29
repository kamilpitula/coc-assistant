import { describe, expect, it } from 'vitest'

import type { Clue } from '@/scene-play/types/Reveal'

import { groupCluesByScene } from './cluesGrouping'

// specs/scene-play/ux.md section 15; SPL-UX-31.

const clue = (title: string, revealedAt: string, scene: { id: string; title: string }): Clue => ({
  revealId: title,
  revealedAt,
  subjectType: 'Handout',
  title,
  handoutKind: 'Text',
  content: null,
  file: null,
  imageDescription: null,
  scene,
})
const corbitt = { id: 's2', title: 'The Corbitt House' }
const knott = { id: 's1', title: 'Meeting Knott' }

describe('groupCluesByScene', () => {
  it('groups the Clues by Scene, newest group first, and each group newest first', () => {
    const groups = groupCluesByScene([
      clue('Cellar door', '2026-10-28T19:52:00Z', corbitt),
      clue('Knott letter', '2026-10-28T19:30:00Z', knott),
      clue('Cellar plan', '2026-10-28T19:58:00Z', corbitt),
    ])

    expect(groups.map((group) => [group.sceneTitle, group.clues.map((entry) => entry.title)])).toEqual([
      ['The Corbitt House', ['Cellar plan', 'Cellar door']],
      ['Meeting Knott', ['Knott letter']],
    ])
  })

  it('sorts input that is not newest first, and answers nothing for no Clues', () => {
    const groups = groupCluesByScene([clue('Old', '2026-10-01T10:00:00Z', knott), clue('New', '2026-10-02T10:00:00Z', corbitt)])

    expect(groups.map((group) => group.sceneId)).toEqual(['s2', 's1'])
    expect(groupCluesByScene([])).toEqual([])
  })
})
