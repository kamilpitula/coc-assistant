import { $createParagraphNode, $createTextNode, $getRoot, type LexicalEditor } from 'lexical'
import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { ItemValidationError } from '@/scenario-preparation/services/itemApi'
import { navigateSpy } from '@/shared/test-support/routerMock'

import { CreateItemPage } from './create-item-page'

// specs/scenario-preparation/ux.md section 62; SP-UX-92, SP-UX-102, SP-A11Y-55.

const { mockUseCampaign, mockUseCreate, mutate } = vi.hoisted(() => ({ mockUseCampaign: vi.fn(), mockUseCreate: vi.fn(), mutate: vi.fn() }))

vi.mock('@tanstack/react-router', async () => (await import('@/shared/test-support/routerMock')).routerMock)
vi.mock('@/campaign-play/hooks/useCampaign', () => ({ useCampaign: mockUseCampaign }))
vi.mock('@/scenario-preparation/hooks/useItems', () => ({ useCreateItem: mockUseCreate }))

interface EditableElement extends HTMLElement {
  __lexicalEditor?: LexicalEditor
}

const creating = (overrides: Record<string, unknown> = {}) => ({ mutate, isPending: false, isError: false, error: null, ...overrides })

async function fillAndSubmit() {
  await userEvent.type(screen.getByLabelText('Name'), "Walter Corbitt's diary")
  const editor = (screen.getByRole('textbox', { name: 'Player-facing description' }) as EditableElement).__lexicalEditor as LexicalEditor
  await act(async () => {
    editor.update(() => {
      $getRoot().clear().append($createParagraphNode().append($createTextNode('A leather diary')))
    })
  })
  await userEvent.click(screen.getByRole('button', { name: 'Create' }))
}

describe('CreateItemPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseCampaign.mockReturnValue({ data: { id: 'c1', role: 'Keeper' } })
    mockUseCreate.mockReturnValue(creating())
  })

  it('has one h1, the empty form, and a Cancel link back to the list (SP-UX-92)', () => {
    render(<CreateItemPage campaignId="c1" />)

    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
    expect(screen.getByRole('heading', { level: 1, name: 'Create Item' })).toBeInTheDocument()
    expect(screen.getByLabelText('Name')).toHaveValue('')
    expect(screen.getByRole('link', { name: 'Cancel' })).toHaveAttribute('href', '/campaigns/c1/items')
  })

  it('refuses a submit without a name or a description and sends nothing (SP-UX-92)', async () => {
    render(<CreateItemPage campaignId="c1" />)

    await userEvent.click(screen.getByRole('button', { name: 'Create' }))

    expect(mutate).not.toHaveBeenCalled()
    expect(screen.getByText('Enter a name.')).toBeInTheDocument()
    expect(screen.getByText('Enter a Player-facing description.')).toBeInTheDocument()
  })

  it('creates the Item and opens its page with "Item created." (SP-UX-92)', async () => {
    mutate.mockImplementation((_input, options) => options.onSuccess({ id: 'k9', name: "Walter Corbitt's diary" }))
    render(<CreateItemPage campaignId="c1" />)

    await fillAndSubmit()

    expect(mutate).toHaveBeenCalledWith(expect.objectContaining({ name: "Walter Corbitt's diary", keeperNotes: null }), expect.any(Object))
    expect(navigateSpy).toHaveBeenCalledWith({
      to: '/campaigns/$campaignId/items/$itemId',
      params: { campaignId: 'c1', itemId: 'k9' },
      state: { statusMessage: 'Item created.' },
    })
  })

  it('shows the busy label and a disabled button while creating', () => {
    mockUseCreate.mockReturnValue(creating({ isPending: true }))

    render(<CreateItemPage campaignId="c1" />)

    expect(screen.getByRole('button', { name: 'Creating...' })).toBeDisabled()
  })

  it('maps a 400 to the field it names (SP-UX-92)', () => {
    mockUseCreate.mockReturnValue(
      creating({ isError: true, error: new ItemValidationError({ playerFacingDescription: 'Enter a Player-facing description.' }) }),
    )

    render(<CreateItemPage campaignId="c1" />)

    expect(screen.getByText('Enter a Player-facing description.')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('alerts when the create failed and keeps the form (SP-UX-92)', () => {
    mockUseCreate.mockReturnValue(creating({ isError: true, error: new Error('boom') }))

    render(<CreateItemPage campaignId="c1" />)

    expect(screen.getByRole('alert')).toHaveTextContent("We couldn't create the Item. Try again.")
    expect(screen.getByLabelText('Name')).toBeInTheDocument()
  })

  it('shows a Player the not-found page (SP-UX-102)', () => {
    mockUseCampaign.mockReturnValue({ data: { id: 'c1', role: 'Player' } })

    render(<CreateItemPage campaignId="c1" />)

    expect(screen.getByRole('heading', { level: 1, name: "We couldn't find that Item" })).toBeInTheDocument()
    expect(screen.queryByLabelText('Name')).not.toBeInTheDocument()
  })
})
