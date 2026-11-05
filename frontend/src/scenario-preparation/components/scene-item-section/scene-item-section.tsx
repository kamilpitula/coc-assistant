import { Link } from '@tanstack/react-router'
import { useEffect, useId, useRef, useState } from 'react'

import { MaterialEntry, MaterialEntryList } from '@/scenario-preparation/components/material-entry/material-entry'
import { UnlinkItemDialog } from '@/scenario-preparation/components/unlink-item-dialog/unlink-item-dialog'
import { useUnlinkItem } from '@/scenario-preparation/hooks/useItemLinks'
import { SceneFinishedError } from '@/scenario-preparation/services/sceneApi'
import type { ItemLink } from '@/scenario-preparation/types/Item'
import type { SceneStatus } from '@/scenario-preparation/types/Scene'
import { Button, buttonVariants } from '@/shared/components/ui/button'

interface SceneItemSectionProps {
  campaignId: string
  scenarioId: string
  sceneId: string
  status: SceneStatus
  /** The Scene's Item links in the order linked. */
  links: ItemLink[]
  /** The link whose Item link takes focus once it is listed, for example right after it was linked. */
  focusLinkId?: string
  /** Called with the Item's name once it has been unlinked, so the page can say so. */
  onUnlinked: (name: string) => void
  /** Called when a refusal because the Scene is Finished is closed, so the page shows the Finished Scene. */
  onRefetch: () => void
}

const itemLinkTitleId = (linkId: string): string => `item-link-${linkId}`

/**
 * The Scene's "Items" section (specs/scenario-preparation/ux.md section 64.1): each linked Item's name as a material
 * entry linking to its page, with "Link an Item" and "Unlink" while the Scene is Prepared or Active (PBI-SPL-005).
 */
export function SceneItemSection({ campaignId, scenarioId, sceneId, status, links, focusLinkId, onUnlinked, onRefetch }: SceneItemSectionProps) {
  const headingId = useId()
  const headingRef = useRef<HTMLHeadingElement>(null)
  const sectionRef = useRef<HTMLElement>(null)
  const canChange = status !== 'Finished'

  // Focus the named Item's link once, as soon as it is listed.
  const focused = useRef(false)
  useEffect(() => {
    if (!focusLinkId || focused.current) {
      return
    }
    const title = sectionRef.current?.querySelector<HTMLElement>(`#${CSS.escape(itemLinkTitleId(focusLinkId))}`)
    if (title) {
      focused.current = true
      title.focus()
    }
  }, [focusLinkId, links])

  return (
    <section ref={sectionRef} aria-labelledby={headingId} className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
        <h2 id={headingId} ref={headingRef} tabIndex={-1} className="text-lg font-semibold outline-none">
          Items
        </h2>
        {canChange && (
          <Link
            to="/campaigns/$campaignId/scenarios/$scenarioId/scenes/$sceneId/item-links/new"
            params={{ campaignId, scenarioId, sceneId }}
            className={buttonVariants({ variant: 'outline', size: 'sm' })}
          >
            Link an Item
          </Link>
        )}
      </div>
      <p className="text-sm text-muted-foreground">Players see an Item&apos;s name and description only when you reveal or give it.</p>
      {links.length === 0 ? (
        <p className="text-sm text-muted-foreground">No Items linked yet.</p>
      ) : (
        <MaterialEntryList as="ul">
          {links.map((link) => (
            <MaterialEntry
              key={link.id}
              subject={{
                type: 'item',
                link,
                page: { to: '/campaigns/$campaignId/items/$itemId', params: { campaignId, itemId: link.item.id } },
              }}
              titleId={itemLinkTitleId(link.id)}
              action={
                canChange ? (
                  <UnlinkControl
                    campaignId={campaignId}
                    scenarioId={scenarioId}
                    sceneId={sceneId}
                    link={link}
                    onUnlinked={() => onUnlinked(link.item.name)}
                    onFocusSection={() => headingRef.current?.focus()}
                    onRefetch={onRefetch}
                  />
                ) : undefined
              }
            />
          ))}
        </MaterialEntryList>
      )}
    </section>
  )
}

interface UnlinkControlProps {
  campaignId: string
  scenarioId: string
  sceneId: string
  link: ItemLink
  onUnlinked: () => void
  onFocusSection: () => void
  onRefetch: () => void
}

function UnlinkControl({ campaignId, scenarioId, sceneId, link, onUnlinked, onFocusSection, onRefetch }: UnlinkControlProps) {
  const [open, setOpen] = useState(false)
  const unlink = useUnlinkItem(campaignId, scenarioId, sceneId, { id: link.id, itemId: link.item.id })
  const buttonRef = useRef<HTMLButtonElement>(null)
  const unlinkedRef = useRef(false)
  const refused = unlink.error instanceof SceneFinishedError

  const close = () => {
    setOpen(false)
    if (refused) {
      onRefetch()
    }
    unlink.reset()
  }

  return (
    <>
      <Button
        ref={buttonRef}
        type="button"
        variant="outline"
        size="sm"
        className="text-destructive"
        aria-label={`Unlink ${link.item.name}`}
        onClick={() => {
          unlink.reset()
          setOpen(true)
        }}
      >
        Unlink
      </Button>
      <UnlinkItemDialog
        open={open}
        name={link.item.name}
        pending={unlink.isPending}
        failed={unlink.isError && !refused}
        refused={refused}
        onConfirm={() =>
          unlink.mutate(undefined, {
            onSuccess: () => {
              unlinkedRef.current = true
              setOpen(false)
              onUnlinked()
            },
          })
        }
        onCancel={close}
        onCloseAutoFocus={(event) => {
          // The unlinked Item is gone, so focus goes to the section heading; a Cancel returns it to Unlink.
          event.preventDefault()
          if (unlinkedRef.current) {
            onFocusSection()
          } else {
            buttonRef.current?.focus()
          }
        }}
      />
    </>
  )
}
