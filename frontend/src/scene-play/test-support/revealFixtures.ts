import type { Clue, KeeperReveal, PlayerReveal } from '@/scene-play/types/Reveal'
import type { RichTextDocument } from '@/shared/types/RichText'

/** Reveal fixtures for stories (specs/scene-play/ux.md section 18). */
export const PNG_BASE64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='

export function pngBlob(): Blob {
  return new Blob([Uint8Array.from(atob(PNG_BASE64), (character) => character.charCodeAt(0))], { type: 'image/png' })
}

export const paragraph = (value: string): RichTextDocument => ({
  root: {
    type: 'root',
    children: [{ type: 'paragraph', version: 1, children: [{ type: 'text', version: 1, text: value, format: 0, style: '', detail: 0, mode: 'normal' }] }],
  },
})

export const readAloudReveal: PlayerReveal = {
  revealId: 'story-read-aloud',
  revealedAt: '2026-10-28T19:52:00Z',
  subjectType: 'Handout',
  title: 'The front door',
  handoutKind: 'ReadAloud',
  content: paragraph('The door creaks open onto a cold hall.'),
  file: null,
  imageDescription: null,
}

export const textReveal: PlayerReveal = { ...readAloudReveal, revealId: 'story-text', title: 'A letter from Knott', handoutKind: 'Text', content: paragraph('Come at once.') }

export const entityReveal: PlayerReveal = {
  ...readAloudReveal,
  revealId: 'story-entity',
  subjectType: 'NonPlayerEntity',
  title: 'A shape in the cellar',
  handoutKind: null,
  content: paragraph('It moves in the dark.'),
}

export const mapReveal: PlayerReveal = {
  ...readAloudReveal,
  revealId: 'story-map',
  revealedAt: '2026-10-28T19:58:00Z',
  title: 'Corbitt House cellar',
  handoutKind: 'Map',
  content: null,
  file: { name: 'corbitt-house-cellar.png', mediaType: 'image/png', sizeBytes: 1_258_291 },
  imageDescription: 'A plan of the cellar with the furnace in the north-east corner',
}

export const imageReveal: PlayerReveal = { ...mapReveal, revealId: 'story-image', title: 'A photograph', handoutKind: 'Image', imageDescription: null }

export const documentReveal: PlayerReveal = {
  ...mapReveal,
  revealId: 'story-document',
  title: 'Diary page',
  handoutKind: 'Document',
  imageDescription: null,
  file: { name: 'diary-page.pdf', mediaType: 'application/pdf', sizeBytes: 90_000 },
}

export const keeperReveal = (reveal: PlayerReveal, subjectId: string, recipients: string[]): KeeperReveal => ({
  ...reveal,
  subjectId,
  recipients: recipients.map((name, index) => ({ id: `i-${index}`, name })),
})

export const clueOf = (reveal: PlayerReveal, scene: { id: string; title: string }): Clue => ({ ...reveal, scene })
