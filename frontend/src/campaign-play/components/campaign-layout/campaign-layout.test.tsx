import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useActiveScene } from '@/scene-play/hooks/useActiveScene'
import type { ActiveScene } from '@/scene-play/types/ActiveScene'

import { CampaignLayout } from './campaign-layout'

// specs/campaign-overview/ux.md section 2, header states; specs/character-sheet/ux.md section 3.3.
// specs/navigation/ux.md section 2; NAV-UX-3.

const { mockUseCampaign, mockUseActive, mockRefetch, mockGetActiveScene } = vi.hoisted(() => ({
  mockUseCampaign: vi.fn(),
  mockUseActive: vi.fn(),
  mockRefetch: vi.fn(),
  mockGetActiveScene: vi.fn(),
}))

vi.mock('@tanstack/react-router', async () => (await import('@/shared/test-support/routerMock')).routerMock)
vi.mock('@/campaign-play/hooks/useCampaign', () => ({ useCampaign: mockUseCampaign }))
vi.mock('@/scene-play/hooks/useActiveScene', () => ({ useActiveScene: mockUseActive }))
vi.mock('@/shared/hooks/useAccessToken', () => ({ useAccessToken: () => async () => 'token' }))
vi.mock('@/scene-play/services/activeSceneApi', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/scene-play/services/activeSceneApi')>()),
  getActiveScene: mockGetActiveScene,
}))
vi.mock('@/shared/components/header/header', () => ({ Header: () => <div>Site header</div> }))

function query(data: unknown, overrides: Record<string, unknown> = {}) {
  return { data, isPending: false, isError: false, refetch: mockRefetch, ...overrides }
}

const campaign = { id: 'c1', name: 'Haunting of Corbitt House', era: '1920s', allowedCreationMethods: ['PointBuy'], role: 'Player' }
const keeperScene: ActiveScene = {
  kind: 'keeper',
  sceneId: 's',
  scenarioId: 'p',
  scenarioTitle: 'T',
  title: 'The Corbitt House',
  location: '',
  startedAt: null,
  investigatorsPresent: [],
  reveals: [],
}

function renderLayout() {
  return render(
    <CampaignLayout campaignId="c1" section="overview" isOverview>
      <p>Page content</p>
    </CampaignLayout>,
  )
}

describe('CampaignLayout', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetActiveScene.mockResolvedValue(null)
    mockUseActive.mockReturnValue(query(null))
  })

  it('shows the site header, the Campaign header, and the page once the Campaign loads (CO-UX-1)', () => {
    mockUseCampaign.mockReturnValue(query(campaign))

    renderLayout()

    expect(screen.getByText('Site header')).toBeInTheDocument()
    expect(screen.getByRole('main')).toContainElement(screen.getByRole('heading', { level: 1, name: 'Haunting of Corbitt House' }))
    expect(screen.getByRole('navigation', { name: 'Campaign' })).toBeInTheDocument()
    expect(screen.getByText('Page content')).toBeInTheDocument()
  })

  it('shows a busy placeholder while the Campaign loads', () => {
    mockUseCampaign.mockReturnValue(query(undefined, { isPending: true }))

    renderLayout()

    expect(screen.getByRole('main').querySelector('[aria-busy="true"]')).not.toBeNull()
    expect(screen.queryByText('Page content')).not.toBeInTheDocument()
  })

  it('replaces the header and the page with "Try again" when the Campaign cannot be loaded', async () => {
    mockUseCampaign.mockReturnValue(query(undefined, { isError: true }))

    renderLayout()

    expect(screen.getByText("We couldn't load this Campaign.")).toBeInTheDocument()
    expect(screen.queryByRole('navigation', { name: 'Campaign' })).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }))
    expect(mockRefetch).toHaveBeenCalled()
  })

  it('replaces the header and the page with the not-found page for a non-member', () => {
    mockUseCampaign.mockReturnValue(query(null))

    renderLayout()

    expect(screen.getByRole('heading', { level: 1, name: "We couldn't find that Campaign" })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Back to Campaigns' })).toHaveAttribute('href', '/campaigns')
    expect(screen.queryByRole('navigation', { name: 'Campaign' })).not.toBeInTheDocument()
    expect(screen.queryByText('Page content')).not.toBeInTheDocument()
  })

  it.each<[string, ReturnType<typeof query>]>([
    ['while the Campaign is pending', query(undefined, { isPending: true })],
    ['when the Campaign cannot be loaded', query(undefined, { isError: true })],
    ['for a non-member', query(null)],
  ])('gates the Active Scene query off %s', (_case, campaignQuery) => {
    mockUseCampaign.mockReturnValue(campaignQuery)

    renderLayout()

    expect(mockUseActive).toHaveBeenCalledWith('c1', false)
    expect(mockGetActiveScene).not.toHaveBeenCalled()
  })

  it('gates the Active Scene query on once the Campaign has loaded', () => {
    mockUseCampaign.mockReturnValue(query(campaign))

    renderLayout()

    expect(mockUseActive).toHaveBeenCalledWith('c1', true)
  })

  it('shows Live on the Active Scene tab while a Scene is Active (NAV-UX-3)', () => {
    mockUseCampaign.mockReturnValue(query(campaign))
    mockUseActive.mockReturnValue(query(keeperScene))

    renderLayout()

    expect(screen.getByRole('link', { name: 'Active Scene, live' })).toBeInTheDocument()
  })

  it.each<[string, ReturnType<typeof query>]>([
    ['when no Scene is Active', query(null)],
    ['when the Active Scene cannot be loaded', query(undefined, { isError: true })],
  ])('shows no Live badge %s (NAV-UX-3)', (_case, activeSceneQuery) => {
    mockUseCampaign.mockReturnValue(query(campaign))
    mockUseActive.mockReturnValue(activeSceneQuery)

    renderLayout()

    expect(screen.getByRole('link', { name: 'Active Scene' })).toBeInTheDocument()
    expect(screen.queryByText('Live')).not.toBeInTheDocument()
  })

  it('makes no second Active Scene request when a page observer shares the cached query', async () => {
    const realUseActiveScene = (await vi.importActual<typeof import('@/scene-play/hooks/useActiveScene')>(
      '@/scene-play/hooks/useActiveScene',
    )) as { useActiveScene: typeof useActiveScene }
    mockUseCampaign.mockReturnValue(query(campaign))
    mockGetActiveScene.mockResolvedValue(keeperScene)
    mockUseActive.mockImplementation((campaignId: string, enabled?: boolean) => realUseActiveScene.useActiveScene(campaignId, enabled))
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })

    function PageObserver() {
      useActiveScene('c1')
      return <p>Page content</p>
    }

    render(
      <QueryClientProvider client={queryClient}>
        <CampaignLayout campaignId="c1" section="active-scene" isOverview={false}>
          <PageObserver />
        </CampaignLayout>
      </QueryClientProvider>,
    )

    await waitFor(() => expect(screen.getByRole('link', { name: 'Active Scene, live' })).toBeInTheDocument())
    expect(mockGetActiveScene).toHaveBeenCalledTimes(1)
    expect(mockGetActiveScene).toHaveBeenCalledWith('token', 'c1')
  })
})
