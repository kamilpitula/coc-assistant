import { describe, expect, it } from 'vitest'

import type { HandoutSummary } from '@/scenario-preparation/types/Handout'
import type { ItemHolder, ItemLink } from '@/scenario-preparation/types/Item'
import type { NonPlayerEntityLink } from '@/scenario-preparation/types/Scene'
import type { InvestigatorPresent } from '@/scene-play/types/ActiveScene'
import type { KeeperReveal } from '@/scene-play/types/Reveal'

import {
  isRevealedToEveryonePresent,
  keeperReferenceSubjects,
  revealsToEveryonePresent,
  revealTargetOf,
  toRevealStatus,
  toRevealSubjects,
} from './subTabGrouping'

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

describe('revealTargetOf', () => {
  it('targets a Handout with its kind and visibility summary (SPL-UX-21)', () => {
    expect(revealTargetOf({ type: 'handout', handout: handout('h1', 'PlayerFacing', 'The front door') }, 'reveal-trigger-h1')).toEqual({
      subjectType: 'Handout',
      subjectId: 'h1',
      title: 'The front door',
      summary: 'Text . Player-facing',
      triggerId: 'reveal-trigger-h1',
    })
  })

  it('targets an entity link with the Non-Player Entity summary (SPL-UX-21)', () => {
    expect(revealTargetOf({ type: 'entity', link: link('l1', 'The landlord') }, 'panel-reveal-trigger-l1')).toEqual({
      subjectType: 'NonPlayerEntity',
      subjectId: 'l1',
      title: 'The landlord',
      summary: 'Non-Player Entity',
      triggerId: 'panel-reveal-trigger-l1',
    })
  })

  it('targets an Item with the Item summary (SPL-UX-51)', () => {
    const diary = itemLink('l1', "Walter Corbitt's diary", null, [])

    expect(revealTargetOf({ type: 'item', link: diary }, 'reveal-trigger-l1')).toEqual({
      subjectType: 'Item',
      subjectId: 'item-l1',
      title: "Walter Corbitt's diary",
      summary: 'Item',
      triggerId: 'reveal-trigger-l1',
    })
  })

  it('targets an Item Handout like a Handout of the same kind and visibility', () => {
    const diary = itemLink('l1', "Walter Corbitt's diary", null, [])
    const entry = handout('h-entry', 'PlayerFacing', 'The last entry')

    expect(revealTargetOf({ type: 'itemHandout', link: diary, handout: entry }, 'reveal-trigger-h-entry')).toEqual({
      subjectType: 'Handout',
      subjectId: 'h-entry',
      title: 'The last entry',
      summary: 'Text . Player-facing',
      triggerId: 'reveal-trigger-h-entry',
    })
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

function itemLink(id: string, name: string, holder: ItemHolder | null, handouts: HandoutSummary[]): ItemLink {
  return { id, item: { id: `item-${id}`, name, holder, handouts } }
}

describe('toRevealSubjects', () => {
  const secret = handout('h-secret', 'KeeperFacing', 'The secret door')
  const front = handout('h-front', 'PlayerFacing', 'The front door')
  const clipping = handout('h-clipping', 'PlayerFacing', 'Boston Globe clipping')
  const landlord = link('n-landlord', 'The landlord')
  const shape = link('n-shape', 'A shape in the cellar')

  it('lists Player-facing Handouts in stored order, then entity links in link order (SPL-UX-42)', () => {
    expect(toRevealSubjects([front, secret, clipping], [landlord, shape], [], [], [harvey, lucy])).toEqual([
      { type: 'handout', handout: front },
      { type: 'handout', handout: clipping },
      { type: 'entity', link: landlord },
      { type: 'entity', link: shape },
    ])
  })

  it('drops a subject once it reached every Investigator present, and keeps partly revealed ones (SPL-UX-43)', () => {
    const reveals = [reveal('h-front', ['harvey', 'lucy']), reveal('h-clipping', ['harvey'])]

    expect(toRevealSubjects([front, secret, clipping], [landlord, shape], [], reveals, [harvey, lucy])).toEqual([
      { type: 'handout', handout: clipping },
      { type: 'entity', link: landlord },
      { type: 'entity', link: shape },
    ])
  })

  it('is empty when everything Player-facing reached everyone present', () => {
    const reveals = [reveal('h-front', ['harvey', 'lucy']), reveal('n-landlord', ['harvey', 'lucy'])]

    expect(toRevealSubjects([front], [landlord], [], reveals, [harvey, lucy])).toEqual([])
  })
})

describe('toRevealSubjects with Items (SPL-UX-51)', () => {
  const lastEntry = handout('h-entry', 'PlayerFacing', 'The last entry')
  const hiddenPhoto = handout('h-photo', 'KeeperFacing', 'Torn photo')
  const diary = itemLink('l-diary', "Walter Corbitt's diary", { investigatorId: 'harvey' }, [lastEntry, hiddenPhoto])
  const key = itemLink('l-key', 'The cellar key', null, [])

  it('lists linked Items after the entity links, each followed by its Player-facing Handouts in stored order', () => {
    const front = handout('h-front', 'PlayerFacing', 'The front door')
    const landlord = link('n-landlord', 'The landlord')

    expect(toRevealSubjects([front], [landlord], [diary, key], [], [harvey, lucy])).toEqual([
      { type: 'handout', handout: front },
      { type: 'entity', link: landlord },
      { type: 'item', link: diary },
      { type: 'itemHandout', link: diary, handout: lastEntry },
      { type: 'item', link: key },
    ])
  })

  it('counts a give Reveal as a Reveal of the Item to its holder', () => {
    const reveals = [reveal('item-l-diary', ['harvey'])]

    expect(toRevealSubjects([], [], [diary], reveals, [harvey, lucy])).toEqual([
      { type: 'item', link: diary },
      { type: 'itemHandout', link: diary, handout: lastEntry },
    ])
  })

  it('drops an Item once it reached every Investigator present, but keeps its unrevealed Handout', () => {
    const reveals = [reveal('item-l-diary', ['harvey', 'lucy']), reveal('h-entry', ['harvey'])]

    expect(toRevealSubjects([], [], [diary], reveals, [harvey, lucy])).toEqual([{ type: 'itemHandout', link: diary, handout: lastEntry }])
  })

  it('drops an Item Handout once it reached every Investigator present', () => {
    const reveals = [reveal('h-entry', ['harvey', 'lucy'])]

    expect(toRevealSubjects([], [], [diary], reveals, [harvey, lucy])).toEqual([{ type: 'item', link: diary }])
  })
})

describe('revealsToEveryonePresent', () => {
  it('is empty when nothing was revealed', () => {
    expect(revealsToEveryonePresent([], [harvey, lucy])).toEqual([])
  })

  it('excludes the Reveal of a partly revealed subject (SPL-UX-43)', () => {
    expect(revealsToEveryonePresent([reveal('h-front', ['harvey'])], [harvey, lucy])).toEqual([])
  })

  it('includes the Reveal once its subject reached every Investigator present (SPL-UX-43)', () => {
    const full = reveal('h-front', ['harvey', 'lucy'])

    expect(revealsToEveryonePresent([reveal('h-plan', ['harvey']), full], [harvey, lucy])).toEqual([full])
  })

  it('unions the recipients across the subject Reveals', () => {
    const reveals = [reveal('h-front', ['harvey']), reveal('h-front', ['lucy'])]

    expect(revealsToEveryonePresent(reveals, [harvey, lucy])).toEqual(reveals)
  })

  it('excludes the subject again when an added Investigator has not received it (SPL-UX-44)', () => {
    expect(revealsToEveryonePresent([reveal('h-front', ['harvey'])], [harvey, lucy])).toEqual([])
  })
})

describe('keeperReferenceSubjects', () => {
  it('lists Keeper-facing Handouts in stored order, then every entity link in link order, whatever was revealed (SPL-UX-45)', () => {
    const secret = handout('h-secret', 'KeeperFacing', 'The secret door')
    const front = handout('h-front', 'PlayerFacing', 'The front door')
    const landlord = link('n-landlord', 'The landlord')

    expect(keeperReferenceSubjects([secret, front], [landlord], [])).toEqual({ handouts: [secret], links: [landlord], items: [] })
  })

  it('lists every linked Item after the entity links, whatever was revealed (SPL-UX-56)', () => {
    const front = handout('h-front', 'PlayerFacing', 'The front door')
    const landlord = link('n-landlord', 'The landlord')
    const diary = itemLink('l-diary', "Walter Corbitt's diary", { investigatorId: 'harvey' }, [])
    const key = itemLink('l-key', 'The cellar key', null, [])

    expect(keeperReferenceSubjects([front], [landlord], [diary, key])).toEqual({ handouts: [], links: [landlord], items: [diary, key] })
  })

  it('is empty when the Scene has nothing Keeper-only', () => {
    const front = handout('h-front', 'PlayerFacing', 'The front door')

    expect(keeperReferenceSubjects([front], [], [])).toEqual({ handouts: [], links: [], items: [] })
  })
})
