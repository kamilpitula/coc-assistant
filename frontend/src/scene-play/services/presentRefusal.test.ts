import { describe, expect, it } from 'vitest'

import { InvestigatorsRefusedError, NoActiveSceneError } from './activeSceneApi'
import { presentRefusalFor } from './presentRefusal'

// specs/scene-play/ux.md section 3 (Investigators present, Errors).
describe('presentRefusalFor', () => {
  it('explains a Scene that was finished meanwhile', () => {
    expect(presentRefusalFor(new NoActiveSceneError())).toEqual({
      kind: 'finished',
      message: "This Scene has been finished, so who is present can't be changed.",
    })
  })

  it('reuses the start page message for a refused Investigator', () => {
    expect(presentRefusalFor(new InvestigatorsRefusedError())).toEqual({
      kind: 'investigators',
      message: "One of these Investigators can't be present. Check the list and try again.",
    })
  })

  it('falls back to a generic failure, and to nothing without an error', () => {
    expect(presentRefusalFor(new Error('boom'))).toEqual({ kind: 'failed', message: "We couldn't save who is present. Try again." })
    expect(presentRefusalFor(null)).toBeNull()
  })
})
