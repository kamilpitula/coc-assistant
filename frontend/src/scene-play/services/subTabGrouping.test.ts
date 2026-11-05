import { describe, expect, it } from 'vitest'

import type { HandoutSummary } from '@/scenario-preparation/types/Handout'
import type { NonPlayerEntityLink } from '@/scenario-preparation/types/Scene'
import type { InvestigatorPresent } from '@/scene-play/types/ActiveScene'
import type { KeeperReveal } from '@/scene-play/types/Reveal'

import { isRevealedToEveryonePresent, keeperReferenceSubjects, toRevealStatus, toRevealSubjects } from './subTabGrouping'

// specs/scene-play/ux.md section 21.4: the rule that moves a subject off "To reveal".
function reveal(subjectId: string, recipientIds: string[]): KeeperReveal {
  return {
    revealId: `reveal-${subjectId}-${recipientIds.join('-')}`,
    revealedAt: '2026-10-28T19:52:00Z',
    subjectType: 'Handout',
    title: 'The front door',
    handoutKind: 'ReadAloud',
    content: null,
    file: null,
    imageDescription: null,
    subjectId,
    recipients: recipientIds.map((id) => ({ id, name: `Investigator ${id}` })),
  }
}

const harvey: InvestigatorPresent = { id: 'harvey', name: 'Harvey Walters' }
const lucy: InvestigatorPresent = { id: 'lucy', name: 'Lucy Ward' }

describe('isRevealedToEveryonePresent', () => {
  it('is false when nothing of the subject was revealed', () => {
    expect(isRevealedToEveryonePresent('h1', [], [harvey, lucy])).toBe(false)
  })

  it('is false when the subject reached only some of the Investigators present', () => {
    expect(isRevealedToEveryonePresent('h1', [reveal('h1', ['harvey'])], [harvey, lucy])).toBe(false)
  })

  it('is true when the subject reached every Investigator present', () => {
    expect(isRevealedToEveryonePresent('h1', [reveal('h1', ['harvey', 'lucy'])], [harvey, lucy])).toBe(true)
  })

  it('unions the recipients across the subject Reveals', () => {
    const reveals = [reveal('h1', ['harvey']), reveal('h1', ['lucy'])]

    expect(isRevealedToEveryonePresent('h1', reveals, [harvey, lucy])).toBe(true)
  })

  it('ignores Reveals of other subjects', () => {
    const reveals = [reveal('h2', ['harvey', 'lucy']), reveal('h1', ['harvey'])]

    expect(isRevealedToEveryonePresent('h1', reveals, [harvey, lucy])).toBe(false)
  })

  it('is false again for a subject an added Investigator has not received (SPL-UX-44)', () => {
    const reveals = [reveal('h1', ['harvey'])]

    expect(isRevealedToEveryonePresent('h1', reveals, [harvey, lucy])).toBe(false)
  })

  it('is true when a removed Investigator keeps the Clue but is no longer present', () => {
    const reveals = [reveal('h1', ['harvey', 'lucy'])]

    expect(isRevealedToEveryonePresent('h1', reveals, [harvey])).toBe(true)
  })
})

describe('toRevealStatus', () => {
  it('is null while nobody has received the subject', () => {
    expect(toRevealStatus('h1', [], [harvey, lucy])).toBe(null)
  })

  it('names who received it and who is still missing (SPL-UX-42)', () => {
    expect(toRevealStatus('h1', [reveal('h1', ['harvey'])], [harvey, lucy])).toBe(
      'Revealed to Harvey Walters . not yet: Lucy Ward',
    )
  })

  it('unions recipients across Reveals and has no suffix once everyone received it', () => {
    const reveals = [reveal('h1', ['harvey']), reveal('h1', ['lucy'])]

    expect(toRevealStatus('h1', reveals, [harvey, lucy])).toBe('Revealed to Harvey Walters and Lucy Ward')
  })

  it('lists a departed recipient after those present', () => {
    const departed: InvestigatorPresent = { id: 'lucy', name: 'Lucy Ward' }
    const reveals = [{ ...reveal('h1', ['harvey']), recipients: [harvey, departed] }]

    expect(toRevealStatus('h1', reveals, [harvey])).toBe('Revealed to Harvey Walters and Lucy Ward')
  })
})

// specs/scene-play/ux.md sections 21.4 and 21.5: what each sub-tab lists, and in which order.
function handout(id: string, visibility: 'PlayerFacing' | 'KeeperFacing', title: string): HandoutSummary {
  return { id, kind: 'Text', visibility, title }
}

function link(id: string, playerFacingName: string): NonPlayerEntityLink {
  return {
    id,
    nonPlayerEntity: { id: `entity-${id}`, type: 'HumanNpc', name: 'Mr. Knott' },
    playerFacingName,
    playerFacingDescription: null,
  }
}

describe('toRevealSubjects', () => {
  const secret = handout('h-secret', 'KeeperFacing', 'The secret door')
  const front = handout('h-front', 'PlayerFacing', 'The front door')
  const clipping = handout('h-clipping', 'PlayerFacing', 'Boston Globe clipping')
  const landlord = link('n-landlord', 'The landlord')
  const shape = link('n-shape', 'A shape in the cellar')

  it('lists Player-facing Handouts in stored order, then entity links in link order (SPL-UX-42)', () => {
    expect(toRevealSubjects([front, secret, clipping], [landlord, shape], [], [harvey, lucy])).toEqual([
      { type: 'handout', handout: front },
      { type: 'handout', handout: clipping },
      { type: 'entity', link: landlord },
      { type: 'entity', link: shape },
    ])
  })

  it('drops a subject once it reached every Investigator present, and keeps partly revealed ones (SPL-UX-43)', () => {
    const reveals = [reveal('h-front', ['harvey', 'lucy']), reveal('h-clipping', ['harvey'])]

    expect(toRevealSubjects([front, secret, clipping], [landlord, shape], reveals, [harvey, lucy])).toEqual([
      { type: 'handout', handout: clipping },
      { type: 'entity', link: landlord },
      { type: 'entity', link: shape },
    ])
  })

  it('is empty when everything Player-facing reached everyone present', () => {
    const reveals = [reveal('h-front', ['harvey', 'lucy']), reveal('n-landlord', ['harvey', 'lucy'])]

    expect(toRevealSubjects([front], [landlord], reveals, [harvey, lucy])).toEqual([])
  })
})

describe('keeperReferenceSubjects', () => {
  it('lists Keeper-facing Handouts in stored order, then every entity link in link order, whatever was revealed (SPL-UX-45)', () => {
    const secret = handout('h-secret', 'KeeperFacing', 'The secret door')
    const front = handout('h-front', 'PlayerFacing', 'The front door')
    const landlord = link('n-landlord', 'The landlord')

    expect(keeperReferenceSubjects([secret, front], [landlord])).toEqual({ handouts: [secret], links: [landlord] })
  })

  it('is empty when the Scene has nothing Keeper-only', () => {
    const front = handout('h-front', 'PlayerFacing', 'The front door')

    expect(keeperReferenceSubjects([front], [])).toEqual({ handouts: [], links: [] })
  })
})
