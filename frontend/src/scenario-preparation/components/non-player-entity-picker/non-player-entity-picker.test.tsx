import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createRef, useState } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { NonPlayerEntitySummary } from '@/scenario-preparation/types/NonPlayerEntity'
import type { NonPlayerEntityReference } from '@/scenario-preparation/types/Scene'

import { NonPlayerEntityPicker, type NonPlayerEntityPickerHandle } from './non-player-entity-picker'

vi.mock('@tanstack/react-router', async () => (await import('@/shared/test-support/routerMock')).routerMock)

// specs/scenario-preparation/ux.md section 33; SP-UX-51, SP-UX-54, SP-UX-62, SP-A11Y-31, SP-A11Y-32, SP-A11Y-35.

const knott: NonPlayerEntitySummary = { id: 'h1', type: 'HumanNpc', name: 'Mr. Knott' }
const ghoul: NonPlayerEntitySummary = { id: 'm1', type: 'MythosCreature', name: 'Ghoul' }
const sergeant: NonPlayerEntitySummary = { id: 'h2', type: 'HumanNpc', name: 'Desk sergeant' }

interface HarnessProps {
  entities?: NonPlayerEntitySummary[]
  isPending?: boolean
  isError?: boolean
  linked?: NonPlayerEntityReference[]
  error?: string
  initial?: NonPlayerEntityReference | null
  onRetry?: () => void
  handle?: React.RefObject<NonPlayerEntityPickerHandle | null>
}

function Harness({ entities, isPending = false, isError = false, linked = [], error, initial = null, onRetry = () => undefined, handle }: HarnessProps) {
  const [value, setValue] = useState<NonPlayerEntityReference | null>(initial)
  return (
    <NonPlayerEntityPicker
      ref={handle}
      campaignId="c1"
      entities={entities}
      isPending={isPending}
      isError={isError}
      onRetry={onRetry}
      linked={linked}
      value={value}
      onChange={setValue}
      error={error}
      errorId="picker-error"
    />
  )
}

const optionNames = () =>
  within(screen.getByRole('radiogroup', { name: 'Non-Player Entities' }))
    .getAllByRole('radio')
    .map((radio) => radio.getAttribute('id') && (document.querySelector(`label[for="${radio.id}"]`)?.textContent ?? ''))

describe('NonPlayerEntityPicker', () => {
  afterEach(() => vi.useRealTimers())

  it('is a fieldset named Non-Player Entity offering every entity by name, sorted, described by its type (SP-A11Y-31)', () => {
    render(<Harness entities={[knott, ghoul, sergeant]} />)

    expect(screen.getByRole('group', { name: 'Non-Player Entity' })).toBeInTheDocument()
    expect(screen.getByLabelText('Search by name')).toBeInTheDocument()
    expect(screen.getByRole('group', { name: 'Type' })).toBeInTheDocument()
    expect(optionNames()).toEqual(['Desk sergeant', 'Ghoul', 'Mr. Knott'])
    expect(screen.getByRole('radio', { name: 'Ghoul' })).toHaveAccessibleDescription('Mythos Creature')
    expect(screen.getByRole('radio', { name: 'Mr. Knott' })).toHaveAccessibleDescription('Human NPC')
  })

  it('marks an entity already linked to the Scene, still offers it, and lets it be chosen again (SP-UX-54)', async () => {
    render(<Harness entities={[knott, ghoul]} linked={[{ type: 'HumanNpc', id: 'h1' }]} />)

    expect(screen.getByRole('radio', { name: 'Mr. Knott' })).toHaveAccessibleDescription('Human NPC Already in this Scene')
    expect(screen.getByRole('radio', { name: 'Ghoul' })).toHaveAccessibleDescription('Mythos Creature')
    await userEvent.click(screen.getByRole('radio', { name: 'Mr. Knott' }))

    expect(screen.getByRole('radio', { name: 'Mr. Knott' })).toBeChecked()
  })

  it('names the chosen entity and its type on a Selected line (SP-UX-51)', async () => {
    render(<Harness entities={[knott, ghoul]} />)
    expect(screen.queryByText(/^Selected:/)).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole('radio', { name: 'Ghoul' }))

    expect(screen.getByText('Selected: Ghoul, Mythos Creature')).toBeInTheDocument()
  })

  it('keeps the choice and the Selected line when the filters hide it', async () => {
    render(<Harness entities={[knott, ghoul]} initial={{ type: 'MythosCreature', id: 'm1' }} />)

    await userEvent.type(screen.getByLabelText('Search by name'), 'kno')

    expect(optionNames()).toEqual(['Mr. Knott'])
    expect(screen.getByText('Selected: Ghoul, Mythos Creature')).toBeInTheDocument()
  })

  it('narrows by search and type, and announces the count after a pause, not on first load (SP-UX-51, SP-A11Y-32)', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    render(<Harness entities={[knott, ghoul, sergeant]} />)
    const live = () => document.querySelector('[aria-live="polite"]')
    expect(live()).toBeEmptyDOMElement()

    await userEvent.click(screen.getByRole('radio', { name: 'Human NPCs' }))
    await userEvent.type(screen.getByLabelText('Search by name'), 'des')

    expect(optionNames()).toEqual(['Desk sergeant'])
    await act(() => vi.advanceTimersByTimeAsync(500))
    expect(live()).toHaveTextContent('1 shown.')
  })

  it('offers Clear filters when nothing matches, restores the list, and focuses the search field (SP-UX-51, SP-A11Y-33)', async () => {
    render(<Harness entities={[knott, ghoul]} />)

    await userEvent.type(screen.getByLabelText('Search by name'), 'zzz')
    expect(screen.getByText('No Non-Player Entities match these filters.')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Clear filters' }))

    expect(optionNames()).toEqual(['Ghoul', 'Mr. Knott'])
    expect(screen.getByLabelText('Search by name')).toHaveValue('')
    expect(screen.getByLabelText('Search by name')).toHaveFocus()
    expect(screen.getByRole('radio', { name: 'All' })).toBeChecked()
  })

  it('says the Campaign has none yet and links to Create Non-Player Entity, with no search or filter (SP-UX-62)', () => {
    render(<Harness entities={[]} />)

    expect(screen.getByText('No Non-Player Entities yet.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Create Non-Player Entity' })).toHaveAttribute('href', '/campaigns/c1/non-player-entities/new')
    expect(screen.queryByLabelText('Search by name')).not.toBeInTheDocument()
    expect(screen.queryByRole('group', { name: 'Type' })).not.toBeInTheDocument()
  })

  it('shows busy placeholders while loading', () => {
    const { container } = render(<Harness isPending />)

    expect(container.querySelector('[aria-busy="true"]')).not.toBeNull()
  })

  it('offers to try again when the list cannot load', async () => {
    const onRetry = vi.fn()
    render(<Harness isError onRetry={onRetry} />)

    expect(screen.getByText("We couldn't load the Non-Player Entities.")).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }))

    expect(onRetry).toHaveBeenCalledTimes(1)
  })

  it('connects its error to the fieldset as text (SP-A11Y-35)', () => {
    render(<Harness entities={[knott]} error="Choose a Non-Player Entity." />)

    expect(screen.getByRole('group', { name: 'Non-Player Entity' })).toHaveAccessibleDescription('Choose a Non-Player Entity.')
  })

  it('focuses the checked radio, else the first radio, else the search field, never the type filter (SP-A11Y-33)', async () => {
    const handle = createRef<NonPlayerEntityPickerHandle>()
    const { rerender } = render(<Harness entities={[knott, ghoul]} handle={handle} />)

    act(() => handle.current?.focus())
    expect(screen.getByRole('radio', { name: 'Ghoul' })).toHaveFocus()

    rerender(<Harness entities={[knott, ghoul]} handle={handle} initial={{ type: 'HumanNpc', id: 'h1' }} />)
    await userEvent.click(screen.getByRole('radio', { name: 'Mr. Knott' }))
    act(() => handle.current?.focus())
    expect(screen.getByRole('radio', { name: 'Mr. Knott' })).toHaveFocus()

    await userEvent.type(screen.getByLabelText('Search by name'), 'zzz')
    act(() => handle.current?.focus())
    expect(screen.getByLabelText('Search by name')).toHaveFocus()
  })
})
