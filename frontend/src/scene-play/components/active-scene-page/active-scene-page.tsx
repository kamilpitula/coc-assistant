import { useRouterState } from '@tanstack/react-router'
import { useEffect, useRef, useState, type RefObject } from 'react'

import { useCampaign } from '@/campaign-play/hooks/useCampaign'
import '@/campaign-play/types/navigationState'
import { ActiveSceneKeeperView } from '@/scene-play/components/active-scene-keeper-view/active-scene-keeper-view'
import { ActiveScenePlayerView } from '@/scene-play/components/active-scene-player-view/active-scene-player-view'
import { NoActiveScene } from '@/scene-play/components/no-active-scene/no-active-scene'
import { useActiveScene } from '@/scene-play/hooks/useActiveScene'
import { useActiveSceneAnnouncement } from '@/scene-play/hooks/useActiveSceneAnnouncement'
import type { ActiveScene } from '@/scene-play/types/ActiveScene'
import { Button } from '@/shared/components/ui/button'
import { Skeleton } from '@/shared/components/ui/skeleton'

interface ActiveScenePageProps {
  campaignId: string
}

/**
 * The Active Scene page (specs/scene-play/ux.md sections 3 and 4): the Keeper's run view, a Player's view, or the
 * no-Active-Scene state. The layout route renders the Campaign header and handles not-found, so the Campaign is already cached here.
 * Players hear changes in a polite live region; the Keeper, the only actor, hears none.
 */
export function ActiveScenePage({ campaignId }: ActiveScenePageProps) {
  const campaign = useCampaign(campaignId)
  const isKeeper = campaign.data?.role === 'Keeper'
  const active = useActiveScene(campaignId)
  const navigationMessage = useRouterState({ select: (state) => state.location.state.statusMessage })
  const announcement = useActiveSceneAnnouncement(isKeeper ? undefined : active.data, active.isFetchedAfterMount)
  const [message, setMessage] = useState<string | null>(null)
  const focusHeadingPending = useRef(false)
  const headingRef = useRef<HTMLHeadingElement>(null)

  // The h1 of the next state is mounted after the state change, so focus moves in an effect (SPL-A11Y-3).
  useEffect(() => {
    if (focusHeadingPending.current && active.data === null) {
      headingRef.current?.focus()
      focusHeadingPending.current = false
    }
  }, [message, active.data])

  if (active.isError) {
    return <LoadFailed onRetry={() => void active.refetch()} />
  }

  if (active.data === undefined) {
    return <ActiveSceneSkeleton />
  }

  return (
    <div className="flex flex-col gap-6">
      <p role="status" className="text-sm empty:hidden">
        {message ?? (announcement.sequence > 0 ? announcement.message : navigationMessage)}
      </p>
      <ActiveSceneBody
        campaignId={campaignId}
        isKeeper={isKeeper}
        scene={active.data}
        headingRef={headingRef}
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
        onRefetch={() => void active.refetch()}
      />
    </div>
  )
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
  headingRef: RefObject<HTMLHeadingElement | null>
  onFinished: (title: string) => void
  onAlreadyFinished: () => void
  onPresentSaved: () => void
  onRefetch: () => void
}

function ActiveSceneBody({ campaignId, isKeeper, scene, headingRef, onFinished, onAlreadyFinished, onPresentSaved, onRefetch }: ActiveSceneBodyProps) {
  if (scene === null) {
    return <NoActiveScene campaignId={campaignId} isKeeper={isKeeper} headingRef={headingRef} />
  }

  if (scene.kind === 'keeper') {
    return (
      <ActiveSceneKeeperView
        campaignId={campaignId}
        scene={scene}
        headingRef={headingRef}
        onFinished={onFinished}
        onAlreadyFinished={onAlreadyFinished}
        onPresentSaved={onPresentSaved}
        onRefetch={onRefetch}
      />
    )
  }

  return <ActiveScenePlayerView scene={scene} />
}
