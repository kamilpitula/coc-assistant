import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createRef, useState } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { ItemSummary } from '@/scenario-preparation/types/Item'

import { ItemPicker, type ItemPickerHandle } from './item-picker'

vi.mock('@tanstack/react-router', async () => (await import('@/shared/test-support/routerMock')).routerMock)

// specs/scenario-preparation/ux.md section 64.2; SP-UX-98, SP-UX-102, SP-A11Y-52, SP-A11Y-53, SP-A11Y-55.
const diary: ItemSummary = { id: 'k1', name: "Walter Corbitt's diary", sceneCount: 1 }
const key: ItemSummary = { id: 'k2', name: 'The cellar key', sceneCount: 0 }
const lamp: ItemSummary = { id: 'k3', name: 'Oil lamp', sceneCount: 0 }

interface HarnessProps {
  items?: ItemSummary[]
  linkedIds?: string[]
  initial?: string | null
  error?: string
  isPending?: boolean
  isError?: boolean
  onRetry?: () => void
  onChange?: (itemId: string) => void
  handle?: React.RefObject<ItemPickerHandle | null>
}

function Harness({ items = [diary, key, lamp], linkedIds = [], initial = null, error, isPending = false, isError = false, onRetry = vi.fn(), onChange, handle }: HarnessProps) {
  const [value, setValue] = useState<string | null>(initial)

  return (
    <ItemPicker
      ref={handle}
      campaignId="c1"
      items={items}
      isPending={isPending}
      isError={isError}
      onRetry={onRetry}
      linkedIds={linkedIds}
      value={value}
      onChange={(itemId) => {
        setValue(itemId)
        onChange?.(itemId)
      }}
      error={error}
      errorId="picker-error"
    />
  )
}

const radioNames = () => screen.getAllByRole('radio').map((radio) => radio.getAttribute('id')).map((id) => document.querySelector(`label[for="${id}"]`)?.textContent)

describe('ItemPicker', () => {
  afterEach(() => vi.useRealTimers())

  it('is a fieldset with the legend "Item" and a radio group of the Items sorted by name (SP-A11Y-52)', () => {
    render(<Harness />)

    expect(screen.getByRole('group', { name: 'Item' })).toBeInTheDocument()
    expect(within(screen.getByRole('radiogroup', { name: 'Items' })).getAllByRole('radio')).toHaveLength(3)
    expect(radioNames()).toEqual(['Oil lamp', 'The cellar key', "Walter Corbitt's diary"])
  })

  it('chooses an Item and names it on a Selected line (SP-UX-98, SP-A11Y-52)', async () => {
    const onChange = vi.fn()
    render(<Harness onChange={onChange} />)

    await userEvent.click(screen.getByRole('radio', { name: 'The cellar key' }))

    expect(onChange).toHaveBeenCalledWith('k2')
    expect(screen.getByRole('radio', { name: 'The cellar key' })).toBeChecked()
    expect(screen.getByText('Selected: The cellar key')).toBeInTheDocument()
  })

  it('shows an Item the Scene already links as a disabled radio described by "Already in this Scene" (SP-UX-98, SP-A11Y-52)', () => {
    render(<Harness linkedIds={['k1']} />)

    const linked = screen.getByRole('radio', { name: "Walter Corbitt's diary" })
    expect(linked).toBeDisabled()
    expect(linked).toHaveAccessibleDescription('Already in this Scene')
    expect(screen.getByRole('radio', { name: 'The cellar key' })).toBeEnabled()
  })

  it('does not call onChange for an Item that is already linked', async () => {
    const onChange = vi.fn()
    render(<Harness linkedIds={['k1']} onChange={onChange} />)

    await userEvent.click(screen.getByRole('radio', { name: "Walter Corbitt's diary" }))

    expect(onChange).not.toHaveBeenCalled()
  })

  it('narrows by search text, case- and accent-insensitively, and announces the count after a pause, not on first load (SP-A11Y-53)', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    render(<Harness />)
    const count = () => document.querySelector('[aria-live="polite"]')
    expect(count()).toBeEmptyDOMElement()

    await userEvent.type(screen.getByLabelText('Search by name'), 'CELLAR')

    expect(radioNames()).toEqual(['The cellar key'])
    expect(count()).toBeEmptyDOMElement()
    await act(() => vi.advanceTimersByTimeAsync(500))
    expect(count()).toHaveTextContent('1 shown.')
  })

  it('keeps the choice when the search hides it, and the Selected line still names it (SP-A11Y-52)', async () => {
    render(<Harness initial="k2" />)

    await userEvent.type(screen.getByLabelText('Search by name'), 'lamp')

    expect(radioNames()).toEqual(['Oil lamp'])
    expect(screen.getByText('Selected: The cellar key')).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: 'Oil lamp' })).not.toBeChecked()
  })

  it('offers Clear search when nothing matches, restores the list, and focuses the search field', async () => {
    render(<Harness />)

    await userEvent.type(screen.getByLabelText('Search by name'), 'zzz')
    expect(screen.getByText('No Items match this search.')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Clear search' }))

    expect(screen.getAllByRole('radio')).toHaveLength(3)
    expect(screen.getByLabelText('Search by name')).toHaveFocus()
  })

  it('says there are no Items yet, offers Create Item, and shows no search for an empty Campaign (SP-UX-102)', () => {
    render(<Harness items={[]} />)

    expect(screen.getByText('No Items yet.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Create Item' })).toHaveAttribute('href', '/campaigns/c1/items/new')
    expect(screen.queryByLabelText('Search by name')).not.toBeInTheDocument()
  })

  it('shows a busy skeleton while loading, and explains a failed load with Try again', async () => {
    const onRetry = vi.fn()
    const { container, rerender } = render(<Harness isPending onRetry={onRetry} />)
    expect(container.querySelector('[aria-busy="true"]')).not.toBeNull()

    rerender(<Harness isError onRetry={onRetry} />)
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }))

    expect(screen.getByText("We couldn't load the Items.")).toBeInTheDocument()
    expect(onRetry).toHaveBeenCalled()
  })

  it('shows its error under the options and connects it to the fieldset (SP-A11Y-55)', () => {
    render(<Harness error="Choose an Item." />)

    expect(screen.getByText('Choose an Item.')).toBeInTheDocument()
    expect(screen.getByRole('group', { name: 'Item' })).toHaveAccessibleDescription('Choose an Item.')
  })

  describe('focus', () => {
    it('focuses the checked radio (SP-A11Y-55)', () => {
      const handle = createRef<ItemPickerHandle>()
      render(<Harness initial="k3" handle={handle} />)

      act(() => handle.current?.focus())

      expect(screen.getByRole('radio', { name: 'Oil lamp' })).toHaveFocus()
    })

    it('focuses the first enabled radio when none is checked and skips a linked Item (SP-A11Y-55)', () => {
      const handle = createRef<ItemPickerHandle>()
      render(<Harness linkedIds={['k3']} handle={handle} />)

      act(() => handle.current?.focus())

      expect(screen.getByRole('radio', { name: 'The cellar key' })).toHaveFocus()
    })

    it('focuses the search field when every Item is already linked (SP-A11Y-55)', () => {
      const handle = createRef<ItemPickerHandle>()
      render(<Harness items={[diary]} linkedIds={['k1']} handle={handle} />)

      act(() => handle.current?.focus())

      expect(screen.getByLabelText('Search by name')).toHaveFocus()
    })
  })
})
