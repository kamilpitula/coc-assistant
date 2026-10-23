import { describe, expect, it, vi } from 'vitest'

import { corbittHouse } from '@/scenario-preparation/test-support/handoutOwnerFixtures'
import { diary, diaryLinkedTo, itemScene } from '@/scenario-preparation/test-support/itemFixtures'

import { itemHandoutContext, sceneHandoutContext } from './handoutOwnerContext'

// specs/scenario-preparation/ux.md sections 41 to 44; SP-UX-71 to SP-UX-73.
describe('sceneHandoutContext', () => {
  it('names the Scene and the way back', () => {
    const context = sceneHandoutContext(corbittHouse('Prepared'), () => undefined)

    expect(context).toMatchObject({ ownerLabel: 'Scene', ownerName: 'The Corbitt House', backLabel: 'Back to the Scene' })
  })

  it('allows every change to the Handouts of a Prepared Scene and has nothing to explain (SP-UX-71)', () => {
    const context = sceneHandoutContext(corbittHouse('Prepared'), () => undefined)

    expect(context).toMatchObject({ canChange: true, canDelete: true, lockedMessage: null })
  })

  it('allows every change but a delete on an Active Scene and says why (SP-UX-72)', () => {
    const context = sceneHandoutContext(corbittHouse('Active'), () => undefined)

    expect(context).toMatchObject({
      canChange: true,
      canDelete: false,
      lockedMessage: "This Scene has been started, so its Handouts can't be deleted.",
    })
  })

  it('allows no change on a Finished Scene and says so (SP-UX-73)', () => {
    const context = sceneHandoutContext(corbittHouse('Finished'), () => undefined)

    expect(context).toMatchObject({ canChange: false, canDelete: false, lockedMessage: "This Scene is finished and can't be changed." })
  })

  it('words the refusal of a delete after the Scene was started meanwhile', () => {
    const context = sceneHandoutContext(corbittHouse('Prepared'), () => undefined)

    expect(context.deleteRefusedMessage).toBe("This Scene has been started, so this Handout can't be deleted.")
  })

  it('reloads the Scene through the function it is given', () => {
    const refetch = vi.fn()

    sceneHandoutContext(corbittHouse('Prepared'), refetch).refetchOwner()

    expect(refetch).toHaveBeenCalledTimes(1)
  })
})

// specs/scenario-preparation/ux.md section 65; SP-UX-100: an Item is never Finished, so only a delete waits until it is out of play.
describe('itemHandoutContext', () => {
  it('names the Item and the way back', () => {
    const context = itemHandoutContext(diary, () => undefined)

    expect(context).toMatchObject({ ownerLabel: 'Item', ownerName: "Walter Corbitt's diary", backLabel: 'Back to the Item' })
  })

  it('allows every change, including a delete, for an Item linked to no Scene or only to Prepared Scenes', () => {
    for (const item of [diary, diaryLinkedTo('Prepared')]) {
      expect(itemHandoutContext(item, () => undefined)).toMatchObject({ canChange: true, canDelete: true, lockedMessage: null })
    }
  })

  it.each(['Active', 'Finished'] as const)('allows every change but a delete for an Item linked to an %s Scene and says why', (status) => {
    const context = itemHandoutContext({ ...diary, scenes: [itemScene('Prepared'), itemScene(status)] }, () => undefined)

    expect(context).toMatchObject({
      canChange: true,
      canDelete: false,
      lockedMessage: "This Item is part of a Scene that has been played, so its Handouts can't be deleted.",
    })
  })

  it('words the refusal of a delete after the Item came into play meanwhile', () => {
    const context = itemHandoutContext(diary, () => undefined)

    expect(context.deleteRefusedMessage).toBe("This Item is now part of a Scene that has been played, so this Handout can't be deleted.")
  })

  it('reloads the Item through the function it is given', () => {
    const refetch = vi.fn()

    itemHandoutContext(diary, refetch).refetchOwner()

    expect(refetch).toHaveBeenCalledTimes(1)
  })
})
