import { useId, type ReactNode } from 'react'

import { useApprovedInvestigatorNames } from '@/campaign-play/hooks/useApprovedInvestigatorNames'
import { MaterialEntry, MaterialEntryList } from '@/scenario-preparation/components/material-entry/material-entry'
import { useScene } from '@/scenario-preparation/hooks/useScenes'
import { holderStatusOf, NO_HOLDER_STATUS } from '@/scenario-preparation/services/itemHolderStatus'
import type { GiveItemContext, GiveItemRequest } from '@/scene-play/components/give-item-dialog/give-item-dialog'
import { MaterialLoadState } from '@/scene-play/components/material-load-state/material-load-state'
import type { TakeBackItemContext, TakeBackItemRequest } from '@/scene-play/components/take-back-item-dialog/take-back-item-dialog'
import { UNNAMED_INVESTIGATOR } from '@/scene-play/services/revealPresentation'
import { keeperReferenceSubjects } from '@/scene-play/services/subTabGrouping'
import type { KeeperActiveScene } from '@/scene-play/types/ActiveScene'
import type { ItemLink } from '@/scenario-preparation/types/Item'
import { Button } from '@/shared/components/ui/button'

interface KeeperReferenceSectionProps {
  campaignId: string
  scene: KeeperActiveScene
  /** Opens the layout-level give dialog for the Item, with the focus context (22.3). */
  onGive: (request: GiveItemRequest, context: GiveItemContext) => void
  /** Opens the layout-level take-back dialog for the Item, with the focus context (22.4). */
  onTakeBack: (request: TakeBackItemRequest, context: TakeBackItemContext) => void
}

/**
 * The "Keeper reference" sub-tab body (specs/scene-play/ux.md sections 21.5 and 22.2): Keeper-facing Handouts in
 * stored order, then every Non-Player Entity link in link order, then every linked Item in link order each followed by
 * its Keeper-facing Handouts, whatever has been revealed. An Item entry shows its holder and offers "Give..." and,
 * while someone holds it, "Take back"; there is never "Reveal...". Each title opens its side panel.
 */
export function KeeperReferenceSection({ campaignId, scene, onGive, onTakeBack }: KeeperReferenceSectionProps) {
  const headingId = useId()
  const material = useScene(campaignId, scene.scenarioId, scene.sceneId, true)
  const holderNames = useApprovedInvestigatorNames(campaignId)

  if (material.isError || !material.data) {
    return <MaterialLoadState isError={material.isError} onRetry={() => void material.refetch()} />
  }

  const { handouts, links, items } = keeperReferenceSubjects(
    material.data.handouts,
    material.data.nonPlayerEntityLinks,
    material.data.itemLinks,
  )
  /** Every title id in list order, so the dialog focus fallback spans the type groups (21.7). */
  const titleIds = [
    ...handouts.map((handout) => `handout-link-${handout.id}`),
    ...links.map((link) => `entity-link-${link.id}`),
    ...items.flatMap((link) => [
      `item-link-${link.item.id}`,
      ...link.item.handouts
        .filter((handout) => handout.visibility === 'KeeperFacing')
        .map((handout) => `handout-link-${handout.id}`),
    ]),
  ]
  const fallbackIdsOf = (titleId: string): string[] => {
    const index = titleIds.indexOf(titleId)
    const next = titleIds[index + 1]
    const previous = titleIds[index - 1]
    return [...(next === undefined ? [] : [next]), ...(previous === undefined ? [] : [previous]), headingId]
  }

  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 id={headingId} tabIndex={-1} className="text-lg font-semibold outline-none">
          Keeper reference
        </h2>
        <p className="text-sm text-muted-foreground">
          Only you see these: Keeper-facing Handouts, the profiles behind Non-Player Entities, and Items&apos; Keeper notes.
        </p>
      </div>
      {handouts.length === 0 && links.length === 0 && items.length === 0 ? (
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
          {items.length > 0 && (
            <ReferenceGroup title="Items">
              {items.flatMap((link) => [
                <ItemEntry
                  key={link.item.id}
                  link={link}
                  holderName={link.item.holder === null ? null : (holderNames.names?.get(link.item.holder.investigatorId) ?? null)}
                  namesResolved={holderNames.names !== undefined}
                  fallbackIds={fallbackIdsOf(`item-link-${link.item.id}`)}
                  onGive={onGive}
                  onTakeBack={onTakeBack}
                />,
                ...link.item.handouts
                  .filter((handout) => handout.visibility === 'KeeperFacing')
                  .map((handout) => (
                    <MaterialEntry
                      key={handout.id}
                      subject={{ type: 'itemHandout', link, handout }}
                      titleId={`handout-link-${handout.id}`}
                      headingLevel={4}
                    />
                  )),
              ])}
            </ReferenceGroup>
          )}
        </>
      )}
    </section>
  )
}

function ItemEntry({
  link,
  holderName,
  namesResolved,
  fallbackIds,
  onGive,
  onTakeBack,
}: {
  link: ItemLink
  /** The holder's name, or null while unheld or the names have not resolved. */
  holderName: string | null
  namesResolved: boolean
  fallbackIds: string[]
  onGive: KeeperReferenceSectionProps['onGive']
  onTakeBack: KeeperReferenceSectionProps['onTakeBack']
}) {
  const holder = link.item.holder
  const status = holder === null ? `${NO_HOLDER_STATUS}.` : namesResolved ? `${holderStatusOf(holder, holderName) ?? NO_HOLDER_STATUS}.` : null
  const giveTriggerId = `give-trigger-${link.item.id}`

  return (
    <MaterialEntry
      subject={{ type: 'item', link }}
      titleId={`item-link-${link.item.id}`}
      headingLevel={4}
      status={status === null ? undefined : <p className="text-sm break-words text-muted-foreground">{status}</p>}
      action={
        <div className="flex flex-wrap items-center gap-2">
          <Button
            id={giveTriggerId}
            type="button"
            variant="outline"
            size="sm"
            aria-label={`Give ${link.item.name}`}
            onClick={() =>
              onGive(
                {
                  itemId: link.item.id,
                  itemName: link.item.name,
                  holder: holder === null ? null : { id: holder.investigatorId, name: holderName ?? UNNAMED_INVESTIGATOR },
                  triggerId: giveTriggerId,
                },
                { fallbackIds },
              )
            }
          >
            Give...
          </Button>
          {holder === null ? null : (
            <Button
              id={`take-back-trigger-${link.item.id}`}
              type="button"
              variant="outline"
              size="sm"
              aria-label={`Take back ${link.item.name}`}
              onClick={() =>
                onTakeBack(
                  {
                    itemId: link.item.id,
                    itemName: link.item.name,
                    holderId: holder.investigatorId,
                    holderName: holderName ?? UNNAMED_INVESTIGATOR,
                    triggerId: `take-back-trigger-${link.item.id}`,
                  },
                  { fallbackIds: [giveTriggerId, ...fallbackIds] },
                )
              }
            >
              Take back
            </Button>
          )}
        </div>
      }
    />
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
