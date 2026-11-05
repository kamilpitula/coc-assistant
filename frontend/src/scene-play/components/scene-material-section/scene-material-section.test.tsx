import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { Scene } from '@/scenario-preparation/types/Scene'
import { RevealInvestigatorsRefusedError, RevealSceneFinishedError, RevealSubjectRefusedError } from '@/scene-play/services/revealApi'
import type { KeeperActiveScene } from '@/scene-play/types/ActiveScene'
import type { KeeperReveal } from '@/scene-play/types/Reveal'

import { SceneMaterialSection } from './scene-material-section'

// specs/scene-play/ux.md sections 12 and 13; SPL-UX-20 to SPL-UX-25, SPL-UX-35, SPL-UX-36, SPL-A11Y-8, SPL-A11Y-11.
const { mockUseScene, mockUseReveal, revealMutate, revealReset, refetchScene } = vi.hoisted(() => ({
  mockUseScene: vi.fn(),
  mockUseReveal: vi.fn(),
  revealMutate: vi.fn(),
  revealReset: vi.fn(),
  refetchScene: vi.fn(),
}))

vi.mock('@tanstack/react-router', async () => (await import('@/shared/test-support/routerMock')).routerMock)
vi.mock('@/scenario-preparation/hooks/useScenes', () => ({ useScene: mockUseScene }))
vi.mock('@/scene-play/hooks/useReveals', () => ({ useRevealToInvestigators: mockUseReveal }))
vi.mock('@/scenario-preparation/components/handout-preview/handout-preview', () => ({
  HandoutPreview: ({ handoutId }: { handoutId: string }) => <div>Preview of {handoutId}</div>,
}))

const text = (value: string) => ({ type: 'text', version: 1, text: value, format: 0, style: '', detail: 0, mode: 'normal' })
const doc = (value: string) => ({ root: { type: 'root' as const, children: [{ type: 'paragraph', version: 1, children: [text(value)] }] } })

const material: Scene = {
  id: 's1',
  title: 'The Corbitt House',
  status: 'Active',
  startedAt: null,
  finishedAt: null,
  location: '',
  keeperNotes: doc('Walter is in the cellar.'),
  itemLinks: [],
  nonPlayerEntityLinks: [
    {
      id: 'l1',
      nonPlayerEntity: { id: 'n1', type: 'MythosCreature', name: 'Ghoul' },
      playerFacingName: 'A shape in the cellar',
      playerFacingDescription: doc('It moves in the dark.'),
    },
  ],
  handouts: [
    { id: 'h1', kind: 'ReadAloud', visibility: 'PlayerFacing', title: 'The front door' },
    { id: 'h2', kind: 'Text', visibility: 'KeeperFacing', title: "Corbitt's true nature" },
  ],
}

const reveal = (overrides: Partial<KeeperReveal> = {}): KeeperReveal => ({
  revealId: 'r1',
  revealedAt: '2026-10-28T19:52:00Z',
  subjectType: 'Handout',
  title: 'The front door',
  handoutKind: 'ReadAloud',
  content: null,
  file: null,
  imageDescription: null,
  subjectId: 'h1',
  recipients: [{ id: 'i1', name: 'Harvey Walters' }],
  ...overrides,
})

const scene = (reveals: KeeperReveal[] = []): KeeperActiveScene => ({
  kind: 'keeper',
  sceneId: 's1',
  scenarioId: 'p1',
  scenarioTitle: 'The Haunting',
  title: 'The Corbitt House',
  location: '',
  startedAt: null,
  investigatorsPresent: [
    { id: 'i1', name: 'Harvey Walters' },
    { id: 'i2', name: 'Lucy Ward' },
  ],
  reveals,
})

const revealing = (overrides: Record<string, unknown> = {}) => ({ mutate: revealMutate, reset: revealReset, isPending: false, error: null, ...overrides })

describe('SceneMaterialSection', () => {
  const onRevealed = vi.fn()
  const onSceneFinished = vi.fn()
  const onRefetch = vi.fn()
  const renderSection = (active: KeeperActiveScene = scene()) =>
    render(<SceneMaterialSection campaignId="c1" scene={active} onRevealed={onRevealed} onSceneFinished={onSceneFinished} onRefetch={onRefetch} />)

  beforeEach(() => {
    vi.clearAllMocks()
    mockUseScene.mockReturnValue({ data: material, isError: false, refetch: refetchScene })
    mockUseReveal.mockReturnValue(revealing())
  })

  it('reads the Keeper Scene by the ids of the Active Scene (D4)', () => {
    renderSection()

    expect(mockUseScene).toHaveBeenCalledWith('c1', 'p1', 's1', true)
  })

  it('lists Keeper notes (closed), Handouts, and Non-Player Entities in sections labelled by their h2, in that order (SPL-UX-20, SPL-A11Y-8)', () => {
    renderSection()

    expect(screen.getAllByRole('heading', { level: 2 }).map((heading) => heading.textContent)).toEqual(['Keeper notes', 'Handouts', 'Non-Player Entities'])
    expect(screen.getByRole('region', { name: 'Handouts' })).toBeInTheDocument()
    expect(screen.queryByText('Walter is in the cellar.')).not.toBeInTheDocument()
    const handouts = within(screen.getByRole('region', { name: 'Handouts' }))
    expect(handouts.getAllByRole('heading', { level: 3 }).map((heading) => heading.textContent)).toEqual(['The front door', "Corbitt's true nature"])
    expect(handouts.getByText('Read-aloud')).toBeInTheDocument()
    expect(handouts.getAllByText('Player-facing').length + handouts.getAllByText('Keeper-facing').length).toBe(2)
  })

  it('shows Keeper notes read-only after "Show Keeper notes" (SPL-UX-25)', async () => {
    renderSection()

    const toggle = screen.getByRole('button', { name: 'Show Keeper notes' })
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    await userEvent.click(toggle)

    expect(screen.getByText('Walter is in the cellar.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Hide Keeper notes' })).toHaveAttribute('aria-expanded', 'true')
  })

  it('says "No Keeper notes." when the Scene has none', async () => {
    mockUseScene.mockReturnValue({ data: { ...material, keeperNotes: null }, isError: false, refetch: refetchScene })
    renderSection()

    await userEvent.click(screen.getByRole('button', { name: 'Show Keeper notes' }))

    expect(screen.getByText('No Keeper notes.')).toBeInTheDocument()
  })

  it('offers "Reveal..." on Player-facing Handouts and Non-Player Entities only, never on a Keeper-facing Handout (SPL-UX-20, SPL-UX-35)', () => {
    renderSection()

    expect(screen.getByRole('button', { name: 'Reveal The front door' })).toHaveTextContent('Reveal...')
    expect(screen.getByRole('button', { name: 'Reveal A shape in the cellar' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: "Reveal Corbitt's true nature" })).not.toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: /^Reveal / })).toHaveLength(2)
  })

  it('shows a Handout\'s current content after "Show content", named by its title (SPL-UX-25, SPL-A11Y-11)', async () => {
    renderSection()

    const toggle = screen.getByRole('button', { name: 'Show content of The front door' })
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    await userEvent.click(toggle)

    expect(screen.getByText('Preview of h1')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Hide content of The front door' })).toHaveAttribute('aria-expanded', 'true')
  })

  it('shows a Non-Player Entity with its type, profile link, and Player-facing description, or the none sentence', () => {
    mockUseScene.mockReturnValue({
      data: { ...material, nonPlayerEntityLinks: [material.nonPlayerEntityLinks[0], { ...material.nonPlayerEntityLinks[0], id: 'l2', playerFacingName: 'A clerk', playerFacingDescription: null }] },
      isError: false,
      refetch: refetchScene,
    })
    renderSection()

    expect(screen.getAllByRole('link', { name: 'Ghoul' })[0]).toHaveAttribute('href', '/campaigns/c1/mythos-creatures/n1')
    expect(screen.getByText('It moves in the dark.')).toBeInTheDocument()
    expect(screen.getByText('No Player-facing description yet.')).toBeInTheDocument()
  })

  it('says "Revealed to {names}" only once an item has been revealed, in roster order (SPL-UX-22)', () => {
    renderSection(scene([reveal({ recipients: [{ id: 'i2', name: 'Lucy Ward' }] }), reveal({ revealId: 'r2', recipients: [{ id: 'i1', name: 'Harvey Walters' }] })]))

    expect(screen.getByText('Revealed to Harvey Walters and Lucy Ward')).toBeInTheDocument()
    expect(screen.getAllByText(/^Revealed to/)).toHaveLength(1)
  })

  it('shows empty sentences for no Handouts and no Non-Player Entities', () => {
    mockUseScene.mockReturnValue({ data: { ...material, handouts: [], nonPlayerEntityLinks: [] }, isError: false, refetch: refetchScene })
    renderSection()

    expect(screen.getByText('No Handouts in this Scene.')).toBeInTheDocument()
    expect(screen.getByText('No Non-Player Entities in this Scene.')).toBeInTheDocument()
  })

  it('shows a Skeleton while the Scene loads and a "Try again" when it fails, without affecting the rest (D4)', async () => {
    mockUseScene.mockReturnValue({ data: undefined, isError: false, refetch: refetchScene })
    const { container, rerender } = renderSection()
    expect(container.querySelector('[aria-busy="true"]')).not.toBeNull()

    mockUseScene.mockReturnValue({ data: undefined, isError: true, refetch: refetchScene })
    rerender(<SceneMaterialSection campaignId="c1" scene={scene()} onRevealed={onRevealed} onSceneFinished={onSceneFinished} onRefetch={onRefetch} />)
    expect(screen.getByText("We couldn't load this Scene's material.")).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }))
    expect(refetchScene).toHaveBeenCalled()
  })

  describe('the reveal dialog', () => {
    const open = async (name = 'Reveal The front door') => userEvent.click(screen.getByRole('button', { name }))

    it('opens "Reveal {title}" with everyone checked, and marks those who already received it "(already revealed)" (SPL-UX-21)', async () => {
      renderSection(scene([reveal()]))

      await open()

      const dialog = screen.getByRole('dialog', { name: 'Reveal The front door' })
      expect(within(dialog).getByText('Read-aloud \u00b7 Player-facing')).toBeInTheDocument()
      expect(within(dialog).getByRole('checkbox', { name: 'Harvey Walters (already revealed)' })).not.toBeChecked()
      expect(within(dialog).getByRole('checkbox', { name: 'Lucy Ward' })).toBeChecked()
    })

    it('reveals to the checked Investigators, then closes, tells the page, and returns focus to "Reveal..." (SPL-UX-22)', async () => {
      revealMutate.mockImplementation((_input: unknown, callbacks: { onSuccess: () => void }) => callbacks.onSuccess())
      renderSection()

      await open()
      await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Reveal' }))

      expect(revealMutate).toHaveBeenCalledWith({ subjectType: 'Handout', subjectId: 'h1', investigatorIds: ['i1', 'i2'] }, expect.anything())
      expect(onRevealed).toHaveBeenCalledWith('The front door revealed to Harvey Walters and Lucy Ward.')
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Reveal The front door' })).toHaveFocus()
    })

    it('reveals a Non-Player Entity by its link id', async () => {
      renderSection()

      await open('Reveal A shape in the cellar')
      await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Reveal' }))

      expect(revealMutate).toHaveBeenCalledWith({ subjectType: 'NonPlayerEntity', subjectId: 'l1', investigatorIds: ['i1', 'i2'] }, expect.anything())
    })

    it('reveals nothing on Cancel and returns focus to "Reveal..." (SPL-UX-23)', async () => {
      renderSection()

      await open()
      await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancel' }))

      expect(revealMutate).not.toHaveBeenCalled()
      expect(screen.getByRole('button', { name: 'Reveal The front door' })).toHaveFocus()
    })

    it('shows "Revealing..." while in flight (SPL-UX-36)', async () => {
      mockUseReveal.mockReturnValue(revealing({ isPending: true }))
      renderSection()

      await open()

      expect(within(screen.getByRole('dialog')).getByRole('button', { name: 'Revealing...' })).toBeDisabled()
    })

    it('shows the 409 refusal, and on closing asks the page for the no-Active-Scene state (SPL-UX-24)', async () => {
      mockUseReveal.mockReturnValue(revealing({ error: new RevealSceneFinishedError() }))
      renderSection()

      await open()
      expect(within(screen.getByRole('dialog')).getByRole('alert')).toHaveTextContent('This Scene has been finished, so nothing more can be revealed.')
      await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancel' }))

      expect(onSceneFinished).toHaveBeenCalled()
    })

    it.each([
      [new RevealSubjectRefusedError(), "This can't be revealed any more. It may have been changed or removed."],
      [new RevealInvestigatorsRefusedError(), 'One of these Investigators is no longer present. Check the list and try again.'],
      [new Error('boom'), "We couldn't reveal The front door. Try again."],
    ])('shows the other refusals inside the dialog (SPL-UX-24)', async (error, message) => {
      mockUseReveal.mockReturnValue(revealing({ error }))
      renderSection()

      await open()

      expect(within(screen.getByRole('dialog')).getByRole('alert')).toHaveTextContent(message)
    })

    it('asks the page to refetch after a 400 refusal and keeps the dialog open', async () => {
      revealMutate.mockImplementation((_input: unknown, callbacks: { onError: (error: Error) => void }) => callbacks.onError(new RevealSubjectRefusedError()))
      renderSection()

      await open()
      await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Reveal' }))

      expect(onRefetch).toHaveBeenCalled()
      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })
  })
})
