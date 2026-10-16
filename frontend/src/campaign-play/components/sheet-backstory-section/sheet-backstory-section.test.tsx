import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useReducer } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { characterSheetFormReducer, EMPTY_BACKSTORY } from '@/campaign-play/state/characterSheetForm'
import { validInputs } from '@/campaign-play/test-support/characterSheetFixtures'
import type { CharacterSheetInputs } from '@/campaign-play/types/CharacterSheet'

import { SheetBackstorySection } from './sheet-backstory-section'

const backstory = { ...EMPTY_BACKSTORY, myStory: 'Grew up above a bookshop.', traits: 'Stubborn', significantPeople: 'My sister Ada' }

function Editing({ initial = validInputs, onChange = vi.fn() }: { initial?: CharacterSheetInputs; onChange?: (inputs: CharacterSheetInputs) => void }) {
  const [inputs, dispatch] = useReducer(characterSheetFormReducer, initial)
  onChange(inputs)
  return <SheetBackstorySection backstory={inputs.backstory} keyConnection={inputs.keyConnection} editing={{ inputs, errors: {}, onAction: dispatch, onBlur: vi.fn() }} />
}

/** specs/character-sheet/ux.md section 6.7 Backstory and section 7 (read-only); docs/game-rules section 12. */
describe('SheetBackstorySection', () => {
  it('UX-28: shows My Story and the filled-in Background entries read-only, marking the Key Connection', () => {
    render(<SheetBackstorySection backstory={backstory} keyConnection="significantPeople" />)

    expect(screen.getByRole('heading', { level: 2, name: 'Backstory' })).toBeInTheDocument()
    expect(screen.getByText('Grew up above a bookshop.')).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 3, name: 'Significant people (Key Connection)' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 3, name: 'Traits' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Phobias and manias' })).not.toBeInTheDocument()
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
  })

  it('reads "None recorded." when nothing is filled in', () => {
    render(<SheetBackstorySection backstory={EMPTY_BACKSTORY} keyConnection={null} />)

    expect(screen.getByText('None recorded.')).toBeInTheDocument()
  })

  it('UX-27: offers a textarea per entry and a Key Connection choice from the filled-in Background entries only', async () => {
    let latest = validInputs
    render(<Editing onChange={(inputs) => (latest = inputs)} />)

    expect(screen.getAllByRole('textbox')).toHaveLength(11)
    expect(screen.getByText('Fill in a Background entry to choose your Key Connection.')).toBeInTheDocument()

    await userEvent.type(screen.getByRole('textbox', { name: 'My story' }), 'A story')
    await userEvent.type(screen.getByRole('textbox', { name: 'Significant people' }), 'Ada')

    const choice = screen.getByRole('radiogroup', { name: 'Which of these is your Key Connection?' })
    expect(within(choice).getAllByRole('radio')).toHaveLength(2)
    expect(within(choice).getByRole('radio', { name: 'None' })).toBeChecked()
    expect(within(choice).queryByRole('radio', { name: 'My story' })).not.toBeInTheDocument()

    await userEvent.click(within(choice).getByRole('radio', { name: 'Significant people' }))
    expect(latest.keyConnection).toBe('significantPeople')

    await userEvent.clear(screen.getByRole('textbox', { name: 'Significant people' }))
    expect(latest.keyConnection).toBeNull()
  })
})
