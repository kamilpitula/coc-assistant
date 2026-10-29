import { describe, expect, it } from 'vitest'

import { AnotherSceneActiveError, InvestigatorsRefusedError, SceneNotPreparedError } from './activeSceneApi'
import { refusalFor, validateStart } from './startSceneForm'

// specs/scene-play/ux.md section 2: validation on submit and the server refusals.
describe('validateStart', () => {
  it('accepts a selection with no Active Scene to finish', () => {
    expect(validateStart(['i1'], null, false)).toEqual({})
  })

  it('refuses an empty selection', () => {
    expect(validateStart([], null, false)).toEqual({ present: 'Choose at least one Investigator present.' })
  })

  it('refuses an unchecked "finish first" while another Scene is Active, naming it', () => {
    expect(validateStart(['i1'], 'Meeting Knott', false)).toEqual({ finish: 'Choose to finish Meeting Knott first, or cancel.' })
    expect(validateStart(['i1'], 'Meeting Knott', true)).toEqual({})
  })

  it('reports both errors at once', () => {
    expect(Object.keys(validateStart([], 'Meeting Knott', false)).sort()).toEqual(['finish', 'present'])
  })
})

describe('refusalFor', () => {
  it('explains a Scene that is no longer Prepared and offers the way back', () => {
    expect(refusalFor(new SceneNotPreparedError())).toEqual({
      kind: 'not-prepared',
      message: "This Scene has already been started, so it can't be started again.",
    })
  })

  it('asks the Keeper to choose when another Scene became Active', () => {
    expect(refusalFor(new AnotherSceneActiveError())).toEqual({
      kind: 'another-active',
      message: 'Another Scene was started meanwhile. Choose whether to finish it first.',
    })
  })

  it('tells the Keeper to check the list when an Investigator cannot be present', () => {
    expect(refusalFor(new InvestigatorsRefusedError())).toEqual({
      kind: 'investigators',
      message: "One of these Investigators can't be present. Check the list and try again.",
    })
  })

  it('falls back to a generic failure, and to nothing without an error', () => {
    expect(refusalFor(new Error('boom'))).toEqual({ kind: 'failed', message: "We couldn't start the Scene. Try again." })
    expect(refusalFor(null)).toBeNull()
  })
})
