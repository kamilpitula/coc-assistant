import { Outlet, useNavigate, useRouterState } from '@tanstack/react-router'
import { useEffect, useRef, useState, type RefObject } from 'react'

import { useCampaign } from '@/campaign-play/hooks/useCampaign'
import '@/campaign-play/types/navigationState'
import { ActiveSceneHeader } from '@/scene-play/components/active-scene-header/active-scene-header'
import { ActiveSceneNav, type ActiveSceneSubTabCounts } from '@/scene-play/components/active-scene-nav/active-scene-nav'
import { ActiveScenePanel } from '@/scene-play/components/active-scene-panel/active-scene-panel'
import { ActiveScenePlayerView } from '@/scene-play/components/active-scene-player-view/active-scene-player-view'
import { NoActiveScene } from '@/scene-play/components/no-active-scene/no-active-scene'
import { RevealDialog } from '@/scene-play/components/reveal-dialog/reveal-dialog'
import { useActiveScene } from '@/scene-play/hooks/useActiveScene'
import { useActiveSceneAnnouncement } from '@/scene-play/hooks/useActiveSceneAnnouncement'
import { usePlayerRevealAnnouncement } from '@/scene-play/hooks/usePlayerRevealAnnouncement'
import { useRevealFlow, type RevealTarget } from '@/scene-play/hooks/useRevealFlow'
import { useScene } from '@/scenario-preparation/hooks/useScenes'
import type { Scene } from '@/scenario-preparation/types/Scene'
import { activeSceneSubTabOf, type ActiveSceneSubTab } from '@/scene-play/services/activeSceneSubTab'
import { recipientsOfSubject } from '@/scene-play/services/revealPresentation'
import { keeperReferenceSubjects, toRevealSubjects } from '@/scene-play/services/subTabGrouping'
import type { ActiveScene, KeeperActiveScene } from '@/scene-play/types/ActiveScene'
import { SidePanelScopeProvider } from '@/shared/components/side-panel/side-panel-scope'
import { Button } from '@/shared/components/ui/button'
import { Skeleton } from '@/shared/components/ui/skeleton'

import { ActiveSceneTabContext } from './active-scene-tab-context'

interface ActiveScenePageProps {
  campaignId: string
}

/**
 * The Active Scene page (specs/scene-play/ux.md sections 3, 4, and 21): the layout route for the Keeper's sub-tabs and
 * the Player's view. The Keeper gets the scene header, the sub-navigation with live counts, and the sub-tab body through
 * the Outlet; a Player gets no sub-navigation and lands on `/active-scene` from a Keeper sub-route, as does every role
 * when no Scene is Active. The layout owns the reveal dialog shared by the sub-tabs, the status message, and the side panel.
 */
export function ActiveScenePage({ campaignId }: ActiveScenePageProps) {
  const campaign = useCampaign(campaignId)
  const isKeeper = campaign.data?.role === 'Keeper'
  const active = useActiveScene(campaignId)
  const leafRouteId = useRouterState({ select: (state) => state.matches.at(-1)?.routeId })
  const subTab = activeSceneSubTabOf(leafRouteId) ?? 'run'
  const navigate = useNavigate()
  const navigationMessage = useRouterState({ select: (state) => state.location.state.statusMessage })
  const announcement = useActiveSceneAnnouncement(isKeeper ? undefined : active.data, active.isFetchedAfterMount)
  const revealAnnouncement = usePlayerRevealAnnouncement(active.data, isKeeper, active.isFetchedAfterMount)
  const [message, setMessage] = useState<string | null>(null)
  const focusHeadingPending = useRef(false)
  const headingRef = useRef<HTMLHeadingElement>(null)

  const scene = active.data ?? null
  const keeperScene = scene?.kind === 'keeper' ? scene : null
  const flow = useRevealFlow(campaignId, keeperScene?.investigatorsPresent, {
    onRevealed: (revealMessage) => {
      // A Scene finished between the Reveal and its refetch shows the no-Active-Scene state with the h1 focused.
      focusHeadingPending.current = true
      setMessage(revealMessage)
    },
    onSceneFinished: () => {
      focusHeadingPending.current = true
      setMessage(null)
      void active.refetch()
    },
    onRefetch: () => void active.refetch(),
  })

  // The h1 of the next state is mounted after the state change, so focus moves in an effect (SPL-A11Y-3).
  useEffect(() => {
    if (focusHeadingPending.current && active.data === null) {
      headingRef.current?.focus()
      focusHeadingPending.current = false
    }
  }, [message, active.data, subTab])

  // Keeper sub-routes need a Keeper and a Scene; anything else lands on Run (21.1, SPL-UX-48).
  const redirect = needsSubTabRedirect(subTab, campaign.data !== undefined, isKeeper, active.data)
  useEffect(() => {
    if (redirect) {
      void navigate({ to: '/campaigns/$campaignId/active-scene', params: { campaignId }, replace: true })
    }
  }, [redirect, navigate, campaignId])

  if (active.isError) {
    return <LoadFailed onRetry={() => void active.refetch()} />
  }

  if (active.data === undefined) {
    return <ActiveSceneSkeleton />
  }

  return (
    <SidePanelScopeProvider>
      <div className="flex flex-col gap-6">
        <p role="status" className="text-sm empty:hidden">
          {pageStatusMessage(message, announcement, navigationMessage)}
        </p>
        <p aria-live="polite" className="sr-only">
          {revealAnnouncement.message}
        </p>
        <ActiveSceneBody
          campaignId={campaignId}
          isKeeper={isKeeper}
          scene={scene}
          subTab={subTab}
          headingRef={headingRef}
          flow={flow}
          onFinished={(title) => {
            focusHeadingPending.current = true
            setMessage(`${title} finished.`)
          }}
          onAlreadyFinished={() => {
            focusHeadingPending.current = true
            setMessage('This Scene was already finished.')
            void active.refetch()
          }}
          onPresentSaved={() => setMessage('Investigators present saved.')}
          onFinishedMeanwhile={() => void active.refetch()}
        />
        <ActiveScenePanel campaignId={campaignId} headingRef={headingRef} onReveal={flow.open} />
      </div>
    </SidePanelScopeProvider>
  )
}

/** A Keeper sub-route without a Keeper or a Scene lands on Run, replacing history (SPL-UX-48). */
function needsSubTabRedirect(subTab: ActiveSceneSubTab, roleKnown: boolean, isKeeper: boolean, scene: ActiveScene | null | undefined): boolean {
  if (subTab === 'run' || !roleKnown || scene === undefined) {
    return false
  }
  return !isKeeper || scene === null
}

/** The status line: the latest local message wins, then the newest announcement, then the navigation message. */
function pageStatusMessage(
  message: string | null,
  announcement: { sequence: number; message: string },
  navigationMessage: string | undefined,
): string | undefined {
  return message ?? (announcement.sequence > 0 ? announcement.message : navigationMessage)
}

/** The reveal dialog's text: the open target's, or blank while no dialog is open. */
function dialogText(target: RevealTarget | null): { title: string; summary: string } {
  return { title: target?.title ?? '', summary: target?.summary ?? '' }
}

/** The nav counts for a Keeper Scene: subjects still to reveal, Keeper-only subjects, and all Reveals. */
function keeperSubTabCounts(material: Scene, scene: KeeperActiveScene): ActiveSceneSubTabCounts {
  const reference = keeperReferenceSubjects(material.handouts, material.nonPlayerEntityLinks)
  return {
    toReveal: toRevealSubjects(material.handouts, material.nonPlayerEntityLinks, scene.reveals, scene.investigatorsPresent).length,
    reference: reference.handouts.length + reference.links.length,
    revealed: scene.reveals.length,
  }
}

function LoadFailed({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex flex-col items-start gap-3">
      <p className="text-sm">We couldn&apos;t load the Active Scene.</p>
      <Button type="button" variant="outline" onClick={onRetry}>
        Try again
      </Button>
    </div>
  )
}

function ActiveSceneSkeleton() {
  return (
    <div aria-busy="true" className="flex max-w-2xl flex-col gap-3">
      <Skeleton className="h-8 w-64" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-3/4" />
    </div>
  )
}

interface ActiveSceneBodyProps {
  campaignId: string
  isKeeper: boolean
  scene: ActiveScene | null
  subTab: ActiveSceneSubTab
  headingRef: RefObject<HTMLHeadingElement | null>
  flow: ReturnType<typeof useRevealFlow>
  onFinished: (title: string) => void
  onAlreadyFinished: () => void
  onPresentSaved: () => void
  onFinishedMeanwhile: () => void
}

function ActiveSceneBody({ campaignId, isKeeper, scene, subTab, headingRef, flow, onFinished, onAlreadyFinished, onPresentSaved, onFinishedMeanwhile }: ActiveSceneBodyProps) {
  if (scene === null) {
    return <NoActiveScene campaignId={campaignId} isKeeper={isKeeper} headingRef={headingRef} />
  }

  if (scene.kind !== 'keeper') {
    return <ActiveScenePlayerView campaignId={campaignId} scene={scene} headingRef={headingRef} />
  }

  return (
    <KeeperSubTabs
      campaignId={campaignId}
      scene={scene}
      subTab={subTab}
      headingRef={headingRef}
      flow={flow}
      onFinished={onFinished}
      onAlreadyFinished={onAlreadyFinished}
      onPresentSaved={onPresentSaved}
      onFinishedMeanwhile={onFinishedMeanwhile}
    />
  )
}

interface KeeperSubTabsProps {
  campaignId: string
  scene: KeeperActiveScene
  subTab: ActiveSceneSubTab
  headingRef: RefObject<HTMLHeadingElement | null>
  flow: ReturnType<typeof useRevealFlow>
  onFinished: (title: string) => void
  onAlreadyFinished: () => void
  onPresentSaved: () => void
  onFinishedMeanwhile: () => void
}

function KeeperSubTabs({ campaignId, scene, subTab, headingRef, flow, onFinished, onAlreadyFinished, onPresentSaved, onFinishedMeanwhile }: KeeperSubTabsProps) {
  const material = useScene(campaignId, scene.scenarioId, scene.sceneId, true)
  const counts = material.data ? keeperSubTabCounts(material.data, scene) : null
  const dialog = dialogText(flow.target)
  const alreadyRevealedIds = flow.target === null ? new Set<string>() : new Set(recipientsOfSubject(scene.reveals, flow.target.subjectId, scene.investigatorsPresent).map((recipient) => recipient.id))

  return (
    <>
      <ActiveSceneHeader campaignId={campaignId} scene={scene} compact={subTab !== 'run'} headingRef={headingRef} onFinished={onFinished} onAlreadyFinished={onAlreadyFinished} />
      <ActiveSceneNav campaignId={campaignId} current={subTab} counts={counts} />
      <ActiveSceneTabContext.Provider value={{ campaignId, scene, onReveal: flow.open, onPresentSaved, onFinishedMeanwhile }}>
        <Outlet />
      </ActiveSceneTabContext.Provider>
      <RevealDialog
        open={flow.target !== null}
        title={dialog.title}
        summary={dialog.summary}
        investigators={scene.investigatorsPresent}
        alreadyRevealedIds={alreadyRevealedIds}
        pending={flow.pending}
        refusal={flow.refusal ? { message: flow.refusal } : null}
        onConfirm={flow.confirm}
        onCancel={flow.cancel}
        onCloseAutoFocus={flow.returnFocus}
      />
    </>
  )
}
