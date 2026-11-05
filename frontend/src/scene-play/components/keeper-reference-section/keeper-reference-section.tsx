import { useId, type ReactNode } from 'react'

import { MaterialEntry, MaterialEntryList } from '@/scenario-preparation/components/material-entry/material-entry'
import { useScene } from '@/scenario-preparation/hooks/useScenes'
import { keeperReferenceSubjects } from '@/scene-play/services/subTabGrouping'
import type { KeeperActiveScene } from '@/scene-play/types/ActiveScene'
import { Button } from '@/shared/components/ui/button'
import { Skeleton } from '@/shared/components/ui/skeleton'

interface KeeperReferenceSectionProps {
  campaignId: string
  scene: KeeperActiveScene
}

/**
 * The "Keeper reference" sub-tab body (specs/scene-play/ux.md section 21.5): Keeper-facing Handouts in stored order,
 * then every Non-Player Entity link in link order, whatever has been revealed. Entries have no action and no reveal
 * status; each title opens its `handout` or `entity` side panel.
 */
export function KeeperReferenceSection({ campaignId, scene }: KeeperReferenceSectionProps) {
  const headingId = useId()
  const material = useScene(campaignId, scene.scenarioId, scene.sceneId, true)

  if (material.isError) {
    return (
      <div className="flex flex-col items-start gap-3">
        <p className="text-sm">We couldn&apos;t load this Scene&apos;s material.</p>
        <Button type="button" variant="outline" onClick={() => void material.refetch()}>
          Try again
        </Button>
      </div>
    )
  }
  if (!material.data) {
    return (
      <div aria-busy="true" className="flex flex-col gap-3">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-20 w-full" />
      </div>
    )
  }

  const { handouts, links } = keeperReferenceSubjects(material.data.handouts, material.data.nonPlayerEntityLinks)

  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 id={headingId} tabIndex={-1} className="text-lg font-semibold outline-none">
          Keeper reference
        </h2>
        <p className="text-sm text-muted-foreground">Only you see these: Keeper-facing Handouts and the profiles behind Non-Player Entities.</p>
      </div>
      {handouts.length === 0 && links.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nothing Keeper-only in this Scene.</p>
      ) : (
        <>
          {handouts.length > 0 && (
            <ReferenceGroup title="Handouts">
              {handouts.map((handout) => (
                <MaterialEntry key={handout.id} subject={{ type: 'handout', handout }} titleId={`handout-link-${handout.id}`} headingLevel={4} />
              ))}
            </ReferenceGroup>
          )}
          {links.length > 0 && (
            <ReferenceGroup title="Non-Player Entities">
              {links.map((link) => (
                <MaterialEntry key={link.id} subject={{ type: 'entity', link }} titleId={`entity-link-${link.id}`} headingLevel={4} />
              ))}
            </ReferenceGroup>
          )}
        </>
      )}
    </section>
  )
}

function ReferenceGroup({ title, children }: { title: string; children: ReactNode }) {
  const groupId = useId()

  return (
    <section aria-labelledby={groupId} className="flex flex-col gap-3">
      <h3 id={groupId} className="text-base font-semibold">
        {title}
      </h3>
      <MaterialEntryList as="ul">{children}</MaterialEntryList>
    </section>
  )
}
