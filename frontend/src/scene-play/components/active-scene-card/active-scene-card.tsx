import { Link } from '@tanstack/react-router'
import type { ReactNode } from 'react'

import { useActiveScene } from '@/scene-play/hooks/useActiveScene'
import { useActiveSceneAnnouncement } from '@/scene-play/hooks/useActiveSceneAnnouncement'
import type { KeeperActiveScene, PresentPlayerActiveScene } from '@/scene-play/types/ActiveScene'
import { Button, buttonVariants } from '@/shared/components/ui/button'
import { Card } from '@/shared/components/ui/card'

interface ActiveSceneCardProps {
  campaignId: string
  isKeeper: boolean
}

const UNNAMED = 'Unnamed Investigator'

function presentNames(scene: KeeperActiveScene | PresentPlayerActiveScene): string {
  if (scene.kind === 'keeper') {
    return scene.investigatorsPresent.map((investigator) => investigator.name ?? UNNAMED).join(', ')
  }

  return scene.investigatorsPresent.map((investigator) => `${investigator.name ?? UNNAMED}${investigator.isYours ? ' (your Investigator)' : ''}`).join(', ')
}

// Only a start or a finish is heard from the card; who is present is announced on the Active Scene page.
const isCardAnnouncement = (message: string): boolean => message.endsWith(' started.') || message.endsWith(' finished.')

function CardSection({ children }: { children: ReactNode }) {
  return (
    <Card className="p-4">
      <section aria-labelledby="active-scene-card-heading" className="flex flex-col gap-1 text-sm">
        <h2 id="active-scene-card-heading" className="text-lg font-semibold">
          Active Scene
        </h2>
        {children}
      </section>
    </Card>
  )
}

/**
 * The Active Scene on the Campaign overview (specs/scene-play/ux.md section 5): rendered only while a Scene is Active, and
 * for a Player whose Investigator is not present only as the sentence that it is in progress. Players hear starts and finishes in
 * a polite live region; the Keeper never does.
 */
export function ActiveSceneCard({ campaignId, isKeeper }: ActiveSceneCardProps) {
  const active = useActiveScene(campaignId)
  const announcement = useActiveSceneAnnouncement(isKeeper ? undefined : active.data, active.isFetchedAfterMount)
  const live = (
    <p role="status" className="sr-only">
      {announcement.sequence > 0 && isCardAnnouncement(announcement.message) ? announcement.message : ''}
    </p>
  )

  if (active.isError) {
    return (
      <CardSection>
        <p>We couldn&apos;t check for an Active Scene.</p>
        <Button type="button" variant="outline" className="self-start" onClick={() => void active.refetch()}>
          Try again
        </Button>
      </CardSection>
    )
  }

  if (!active.data) {
    return live
  }

  const scene = active.data
  return (
    <>
      <CardSection>
        {scene.kind === 'absent-player' ? (
          <p className="break-words">{scene.title} is in progress. You aren&apos;t taking part in it.</p>
        ) : (
          <>
            <p className="font-medium break-words">{scene.title}</p>
            {scene.location !== '' && <p className="text-muted-foreground break-words">{scene.location}</p>}
            <p className="break-words">Investigators present: {presentNames(scene)}</p>
            <Link to="/campaigns/$campaignId/active-scene" params={{ campaignId }} className={buttonVariants({ variant: 'link', className: 'self-start px-0' })}>
              Open Active Scene
            </Link>
          </>
        )}
      </CardSection>
      {live}
    </>
  )
}
