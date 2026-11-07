import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { HeldItem, InvestigatorHeldItems, MyHeldItems } from '@/scene-play/services/itemHolderApi'
import { formatClueTime, formatRevealTime } from '@/scene-play/services/revealPresentation'
import { paragraph } from '@/scene-play/test-support/revealFixtures'

import { HeldItemsSection } from './held-items-section'

// specs/scene-play/ux.md section 22.7; SPL-UX-52, SPL-UX-54, SPL-UX-57, SPL-UX-59, SPL-A11Y-20, SPL-A11Y-21.
const { mockUseMine, mockUseTheirs, mockUseTakeBack, mutate, reset } = vi.hoisted(() => ({
  mockUseMine: vi.fn(),
  mockUseTheirs: vi.fn(),
  mockUseTakeBack: vi.fn(),
  mutate: vi.fn(),
  reset: vi.fn(),
}))
vi.mock('@/scene-play/hooks/useHeldItems', () => ({
  useMyHeldItems: mockUseMine,
  useInvestigatorHeldItems: mockUseTheirs,
  useTakeBackItem: mockUseTakeBack,
}))

const diary: HeldItem = {
  revealId: 'r1',
  name: "Walter Corbitt's diary",
  description: paragraph("Walter's last entry."),
  givenAt: '2026-10-28T19:58:00Z',
}
const key: HeldItem = { revealId: 'r2', name: 'A brass key', description: paragraph('It opens the cellar.'), givenAt: '2026-10-28T20:02:00Z' }

const mine: MyHeldItems = { investigatorName: 'Harvey Walters', items: [key, diary] }
const theirs: InvestigatorHeldItems = {
  investigatorName: 'Harvey Walters',
  items: [
    { ...key, itemId: 'k2' },
    { ...diary, itemId: 'k1' },
  ],
}

const playerQuery = (data: MyHeldItems | null | undefined, overrides: Record<string, unknown> = {}) => ({
  data,
  isError: false,
  isFetchedAfterMount: true,
  refetch: vi.fn(),
  ...overrides,
})
const keeperQuery = (data: InvestigatorHeldItems | null | undefined, overrides: Record<string, unknown> = {}) => ({
  data,
  isError: false,
  isFetchedAfterMount: true,
  refetch: vi.fn(),
  ...overrides,
})

describe('HeldItemsSection', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseMine.mockReturnValue(playerQuery(mine))
    mockUseTheirs.mockReturnValue(keeperQuery(theirs))
    mockUseTakeBack.mockReturnValue({ mutate, reset, isPending: false, error: null })
  })

  it('shows the Player their Items newest first, each closed until "Show" (SPL-UX-52)', async () => {
    render(<HeldItemsSection campaignId="c1" />)

    expect(screen.getByRole('heading', { level: 2, name: 'Items Harvey Walters holds' })).toBeInTheDocument()
    expect(screen.getAllByRole('heading', { level: 3 }).map((heading) => heading.textContent)).toEqual([
      'A brass key',
      "Walter Corbitt's diary",
    ])
    const keyArticle = screen.getByRole('article', { name: 'A brass key' })
    expect(within(keyArticle).getByText(/^Given/)).toBeInTheDocument()
    expect(keyArticle.querySelector('time')).toHaveAttribute('datetime', '2026-10-28T20:02:00Z')
    expect(keyArticle.querySelector('time')).toHaveTextContent(formatClueTime('2026-10-28T20:02:00Z'))
    expect(screen.queryByText("Walter's last entry.")).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: "Show Walter Corbitt's diary" }))

    expect(screen.getByText("Walter's last entry.")).toBeInTheDocument()
    expect(screen.getByRole('button', { name: "Hide Walter Corbitt's diary" })).toBeInTheDocument()
  })

  it('shows the short Given time on the Active Scene', () => {
    render(<HeldItemsSection campaignId="c1" shortTime />)

    const keyArticle = screen.getByRole('article', { name: 'A brass key' })
    expect(keyArticle.querySelector('time')).toHaveTextContent(formatRevealTime('2026-10-28T20:02:00Z'))
  })

  it('shows the Player no "Take back" and announces a gained Item politely (SPL-UX-57, SPL-A11Y-21)', () => {
    const query = playerQuery({ investigatorName: 'Harvey Walters', items: [diary] })
    mockUseMine.mockReturnValue(query)
    const { rerender } = render(<HeldItemsSection campaignId="c1" />)
    expect(screen.queryByRole('button', { name: /Take back/ })).not.toBeInTheDocument()

    mockUseMine.mockReturnValue({ ...query, data: { investigatorName: 'Harvey Walters', items: [key, diary] } })
    rerender(<HeldItemsSection campaignId="c1" />)

    expect(screen.getByRole('status')).toHaveTextContent('Harvey Walters now holds A brass key.')
  })

  it('tells the Player when they hold no Items', () => {
    mockUseMine.mockReturnValue(playerQuery({ investigatorName: 'Harvey Walters', items: [] }))
    render(<HeldItemsSection campaignId="c1" />)

    expect(screen.getByText("Harvey Walters doesn't hold any Items.")).toBeInTheDocument()
    expect(screen.queryByRole('article')).not.toBeInTheDocument()
  })

  it('renders nothing when there is no Approved Investigator', () => {
    mockUseMine.mockReturnValue(playerQuery(null))
    const { container } = render(<HeldItemsSection campaignId="c1" />)

    expect(container).toBeEmptyDOMElement()
  })

  it('loads with a busy Skeleton and retries a failed load without touching the Clues', async () => {
    const refetch = vi.fn()
    mockUseMine.mockReturnValue(playerQuery(undefined, { isError: true, refetch }))
    render(<HeldItemsSection campaignId="c1" />)

    expect(screen.getByText("We couldn't load the Items.")).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Try again' }))

    expect(refetch).toHaveBeenCalledTimes(1)
  })

  it('shows a busy Skeleton while the Items load', () => {
    mockUseMine.mockReturnValue(playerQuery(undefined, { isFetchedAfterMount: false }))
    const { container } = render(<HeldItemsSection campaignId="c1" />)

    expect(container.querySelector('[aria-busy="true"]')).not.toBeNull()
  })

  it('offers the Keeper "Take back" on each Item and takes it back with a status (SPL-UX-54, SPL-UX-59)', async () => {
    mutate.mockImplementation((_itemId: unknown, handlers: { onSuccess: () => void }) => handlers.onSuccess())
    render(<HeldItemsSection campaignId="c1" investigatorId="i1" />)

    const article = within(screen.getByRole('article', { name: "Walter Corbitt's diary" }))
    await userEvent.click(article.getByRole('button', { name: "Take back Walter Corbitt's diary" }))

    expect(screen.getByRole('alertdialog', { name: "Take Walter Corbitt's diary back from Harvey Walters?" })).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Take back' }))

    expect(mutate).toHaveBeenCalledWith('k1', expect.anything())
    expect(screen.getByRole('status')).toHaveTextContent("Walter Corbitt's diary taken back from Harvey Walters.")
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
  })
})
