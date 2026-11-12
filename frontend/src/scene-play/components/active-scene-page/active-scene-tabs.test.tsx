import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import type { KeeperActiveScene } from '@/scene-play/types/ActiveScene'

import { ActiveSceneTabContext, type ActiveSceneTabContextValue } from './active-scene-tab-context'
import { ReferenceTab, RevealedTab, RunTab, ToRevealTab } from './active-scene-tabs'

// The tab adapters forward the layout's tab data to the section components (specs/scene-play/ux.md section 21.1).
vi.mock('@/scene-play/components/run-view/run-view', () => ({
  RunView: (props: Record<string, unknown>) => {
    runProps = props
    return <div data-testid="run-view" />
  },
}))
vi.mock('@/scene-play/components/to-reveal-section/to-reveal-section', () => ({
  ToRevealSection: (props: Record<string, unknown>) => {
    toRevealProps = props
    return <div data-testid="to-reveal-section" />
  },
}))
vi.mock('@/scene-play/components/keeper-reference-section/keeper-reference-section', () => ({
  KeeperReferenceSection: (props: Record<string, unknown>) => {
    referenceProps = props
    return <div data-testid="keeper-reference-section" />
  },
}))
vi.mock('@/scene-play/components/revealed-section/revealed-section', () => ({
  RevealedSection: (props: Record<string, unknown>) => {
    revealedProps = props
    return <div data-testid="revealed-section" />
  },
}))

let runProps: Record<string, unknown> = {}
let toRevealProps: Record<string, unknown> = {}
let referenceProps: Record<string, unknown> = {}
let revealedProps: Record<string, unknown> = {}

const scene: KeeperActiveScene = {
  kind: 'keeper',
  sceneId: 's1',
  scenarioId: 'p1',
  scenarioTitle: 'The Haunting',
  title: 'The Corbitt House',
  location: '',
  startedAt: null,
  investigatorsPresent: [],
  reveals: [],
}

const value: ActiveSceneTabContextValue = {
  campaignId: 'c1',
  scene,
  onReveal: vi.fn(),
  onGive: vi.fn(),
  onTakeBack: vi.fn(),
  onPresentSaved: vi.fn(),
  onWallEntryAdded: vi.fn(),
  onFinishedMeanwhile: vi.fn(),
  onRollRequested: vi.fn(),
}

function renderTab(tab: 'run' | 'to-reveal' | 'reference' | 'revealed') {
  return render(
    <ActiveSceneTabContext.Provider value={value}>
      {tab === 'run' ? <RunTab /> : tab === 'to-reveal' ? <ToRevealTab /> : tab === 'reference' ? <ReferenceTab /> : <RevealedTab />}
    </ActiveSceneTabContext.Provider>,
  )
}

describe('ActiveSceneTabs', () => {
  it('forwards the tab data to each sub-tab body', () => {
    renderTab('run')
    expect(screen.getByTestId('run-view')).toBeInTheDocument()
    expect(runProps).toEqual({ campaignId: 'c1', scene, onPresentSaved: value.onPresentSaved, onWallEntryAdded: value.onWallEntryAdded, onFinishedMeanwhile: value.onFinishedMeanwhile, onRollRequested: value.onRollRequested })

    renderTab('to-reveal')
    expect(toRevealProps).toEqual({ campaignId: 'c1', scene, onReveal: value.onReveal, onGive: value.onGive })

    renderTab('reference')
    expect(referenceProps).toEqual({ campaignId: 'c1', scene, onGive: value.onGive, onTakeBack: value.onTakeBack })

    renderTab('revealed')
    expect(revealedProps).toEqual({ reveals: scene.reveals })
  })
})
