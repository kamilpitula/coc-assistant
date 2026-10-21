import { describe, expect, it } from 'vitest'

import type { RichTextDocument } from '@/shared/types/RichText'

import { firstInvalidField, validateNonPlayerEntityLinkForm } from './nonPlayerEntityLinkForm'

// specs/scenario-preparation/ux.md section 33; SP-UX-53, SP-UX-63.
const chosen = { type: 'MythosCreature' as const, id: 'm1' }
const oversize: RichTextDocument = { root: { type: 'root', children: [{ type: 'paragraph', children: [{ text: 'x'.repeat(204_800) }] }] } }

describe('validateNonPlayerEntityLinkForm', () => {
  it('accepts a chosen entity and a name, and trims the name', () => {
    const result = validateNonPlayerEntityLinkForm(
      { nonPlayerEntity: chosen, playerFacingName: '  A shape in the cellar ', playerFacingDescription: null },
      true,
    )

    expect(result).toEqual({
      success: true,
      data: { nonPlayerEntity: chosen, playerFacingName: 'A shape in the cellar', playerFacingDescription: null },
    })
  })

  it('asks for an entity, a name, and a shorter description, each with its message', () => {
    const result = validateNonPlayerEntityLinkForm({ nonPlayerEntity: null, playerFacingName: '   ', playerFacingDescription: oversize }, true)

    expect(result).toEqual({
      success: false,
      errors: {
        nonPlayerEntity: 'Choose a Non-Player Entity.',
        playerFacingName: 'Enter a Player-facing name.',
        playerFacingDescription: 'Player-facing description is too long. Shorten it and try again.',
      },
    })
  })

  it('accepts a name of 200 characters and refuses 201', () => {
    const at = validateNonPlayerEntityLinkForm({ nonPlayerEntity: chosen, playerFacingName: 'n'.repeat(200), playerFacingDescription: null }, true)
    const over = validateNonPlayerEntityLinkForm({ nonPlayerEntity: chosen, playerFacingName: 'n'.repeat(201), playerFacingDescription: null }, true)

    expect(at.success).toBe(true)
    expect(over).toEqual({ success: false, errors: { playerFacingName: 'Player-facing name must be 200 characters or fewer.' } })
  })

  it('does not ask for an entity when editing', () => {
    const result = validateNonPlayerEntityLinkForm({ nonPlayerEntity: null, playerFacingName: 'Renamed', playerFacingDescription: null }, false)

    expect(result.success).toBe(true)
  })
})

describe('firstInvalidField', () => {
  it('visits the entity, then the name, then the description', () => {
    expect(firstInvalidField({ playerFacingDescription: 'd', playerFacingName: 'n', nonPlayerEntity: 'e' })).toBe('nonPlayerEntity')
    expect(firstInvalidField({ playerFacingDescription: 'd', playerFacingName: 'n' })).toBe('playerFacingName')
    expect(firstInvalidField({ playerFacingDescription: 'd' })).toBe('playerFacingDescription')
    expect(firstInvalidField({})).toBeNull()
  })
})
