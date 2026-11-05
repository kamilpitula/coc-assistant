import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { NonPlayerEntityLink, SceneStatus } from '@/scenario-preparation/types/Scene'
import { SidePanelScopeProvider } from '@/shared/components/side-panel/side-panel-scope'

import { SceneLinkSection } from './scene-link-section'

// specs/scenario-preparation/ux.md section 32; SP-UX-38, SP-UX-40, SP-UX-41, SP-UX-42, SP-UX-108, SP-A11Y-60.

const { unlinkMutate, unlinkReset } = vi.hoisted(() => ({ unlinkMutate: vi.fn(), unlinkReset: vi.fn() }))

vi.mock('@/scenario-preparation/hooks/useNonPlayerEntityLinks', () => ({
  useUnlinkNonPlayerEntity: () => ({ mutate: unlinkMutate, reset: unlinkReset, isPending: false, isError: false, error: null }),
}))
vi.mock('@tanstack/react-router', async () => (await import('@/shared/test-support/routerMock')).routerMock)

const ghoul: NonPlayerEntityLink = {
  id: 'link-1',
  nonPlayerEntity: { id: 'ghoul', type: 'MythosCreature', name: 'Ghoul' },
  playerFacingName: 'A shape in the cellar',
  playerFacingDescription: null,
}
const knott: NonPlayerEntityLink = {
  id: 'link-2',
  nonPlayerEntity: { id: 'knott', type: 'HumanNpc', name: 'Mr. Knott' },
  playerFacingName: 'The landlord',
  playerFacingDescription: null,
}

function renderSection(overrides: {
  status?: SceneStatus
  links?: NonPlayerEntityLink[]
  focusLinkId?: string
  onUnlinked?: (name: string) => void
  onRefetch?: () => void
} = {}) {
  const { status = 'Prepared', links = [ghoul], focusLinkId, onUnlinked = () => undefined, onRefetch = () => undefined } = overrides
  return render(
    <SidePanelScopeProvider>
      <SceneLinkSection
        campaignId="c1"
        scenarioId="s1"
        sceneId="scene-1"
        status={status}
        links={links}
        focusLinkId={focusLinkId}
        onUnlinked={onUnlinked}
        onRefetch={onRefetch}
      />
    </SidePanelScopeProvider>,
  )
}

describe('SceneLinkSection', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('lists each link as a panel title button with its type and profile name as plain text (SP-UX-38, SP-UX-108)', () => {
    renderSection({ links: [knott, ghoul] })

    const list = screen.getByRole('list')
    const items = within(list).getAllByRole('listitem')
    const buttons = within(list).getAllByRole('button', { name: /^(The landlord|A shape in the cellar)$/ })
    expect(buttons.map((button) => button.textContent)).toEqual(['The landlord', 'A shape in the cellar'])
    expect(within(list).getByRole('button', { name: 'The landlord' })).toHaveAttribute('id', 'entity-link-link-2')
    expect(items[0]).toHaveTextContent('Human NPC: Mr. Knott')
    expect(items[1]).toHaveTextContent('Mythos Creature: Ghoul')
  })

  it('offers Link a Non-Player Entity, Edit, and Unlink only on a Prepared or Active Scene (SP-UX-40, SP-UX-41)', () => {
    renderSection({ status: 'Prepared' })

    expect(screen.getByRole('link', { name: 'Link a Non-Player Entity' })).toHaveAttribute(
      'href',
      '/campaigns/c1/scenarios/s1/scenes/scene-1/non-player-entity-links/new',
    )
    expect(screen.getByRole('link', { name: 'Edit A shape in the cellar' })).toHaveAttribute(
      'href',
      '/campaigns/c1/scenarios/s1/scenes/scene-1/non-player-entity-links/link-1',
    )
    expect(screen.getByRole('button', { name: 'Unlink A shape in the cellar' })).toBeInTheDocument()
  })

  it('hides Link, Edit, and Unlink on a Finished Scene (SP-UX-42)', () => {
    renderSection({ status: 'Finished' })

    expect(screen.queryByRole('link', { name: 'Link a Non-Player Entity' })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Edit A shape in the cellar' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Unlink A shape in the cellar' })).not.toBeInTheDocument()
  })

  it('moves focus to the named link title once it is listed (SP-A11Y-60)', async () => {
    const { rerender } = renderSection({ links: [], focusLinkId: 'link-1' })

    rerender(
      <SidePanelScopeProvider>
        <SceneLinkSection
          campaignId="c1"
          scenarioId="s1"
          sceneId="scene-1"
          status="Prepared"
          links={[ghoul]}
          focusLinkId="link-1"
          onUnlinked={() => undefined}
          onRefetch={() => undefined}
        />
      </SidePanelScopeProvider>,
    )

    await waitFor(() => expect(screen.getByRole('button', { name: 'A shape in the cellar' })).toHaveFocus())
  })

  it('unlinks on confirm, announces it, and focuses the heading (SP-UX-41)', async () => {
    unlinkMutate.mockImplementation((_variables: unknown, options: { onSuccess: () => void }) => options.onSuccess())
    const onUnlinked = vi.fn()
    renderSection({ onUnlinked })

    await userEvent.click(screen.getByRole('button', { name: 'Unlink A shape in the cellar' }))
    const dialog = screen.getByRole('alertdialog', { name: 'Unlink A shape in the cellar?' })
    await userEvent.click(within(dialog).getByRole('button', { name: 'Unlink' }))

    expect(onUnlinked).toHaveBeenCalledWith('A shape in the cellar')
    await waitFor(() => expect(screen.getByRole('heading', { level: 2, name: 'Non-Player Entities' })).toHaveFocus())
  })
})
