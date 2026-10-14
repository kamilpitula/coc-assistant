import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { validInputs } from '@/campaign-play/test-support/characterSheetFixtures'

import { SheetGearSection } from './sheet-gear-section'

/** specs/character-sheet/ux.md section 6.7 Gear and possessions and section 7; docs/game-rules section 11. */
describe('SheetGearSection', () => {
  it('UX-28: shows the Gear read-only with its line breaks', () => {
    render(<SheetGearSection gear={'Lantern\nRope'} />)

    expect(screen.getByRole('heading', { level: 2, name: 'Gear and possessions' })).toBeInTheDocument()
    expect(screen.getByText(/Lantern/)).toHaveClass('whitespace-pre-line')
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
  })

  it('reads "None recorded." without Gear', () => {
    render(<SheetGearSection gear={null} />)

    expect(screen.getByText('None recorded.')).toBeInTheDocument()
  })

  it('UX-27: records the Gear in a textarea named by the section heading', async () => {
    const onAction = vi.fn()
    render(<SheetGearSection gear={null} editing={{ inputs: validInputs, errors: {}, onAction, onBlur: vi.fn() }} />)

    const textarea = screen.getByRole('textbox', { name: 'Gear and possessions' })
    expect(textarea).toHaveAttribute('maxlength', '2000')
    await userEvent.type(textarea, 'L')

    expect(onAction).toHaveBeenLastCalledWith({ type: 'gear', value: 'L' })
  })
})
