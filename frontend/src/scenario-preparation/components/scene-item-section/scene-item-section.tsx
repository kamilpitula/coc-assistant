import { Link } from '@tanstack/react-router'
import { useEffect, useId, useRef, useState } from 'react'

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

const itemLinkAnchorId = (linkId: string): string => `item-link-${linkId}`

/**
 * The Scene's "Items" section (specs/scenario-preparation/ux.md section 64.1): each linked Item's name as a link to its page, with
 * "Link an Item" and "Unlink" while the Scene is Prepared or Active.
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
    const anchor = sectionRef.current?.querySelector<HTMLElement>(`#${CSS.escape(itemLinkAnchorId(focusLinkId))}`)
    if (anchor) {
      focused.current = true
      anchor.focus()
    }
  }, [focusLinkId, links])

  return (
    <section ref={sectionRef} aria-labelledby={headingId} className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
        <h2 id={headingId} ref={headingRef} tabIndex={-1} className="text-lg font-semibold outline-none">
          Items
        </h2>
        {canChange && <LinkAnItemAction campaignId={campaignId} scenarioId={scenarioId} sceneId={sceneId} />}
      </div>
      <p className="text-sm text-muted-foreground">Players see an Item&apos;s name and description only when you reveal or give it.</p>
      {links.length === 0 ? (
        <p className="text-sm text-muted-foreground">No Items linked yet.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {links.map((link) => (
            <li key={link.id} className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
              <Link
                id={itemLinkAnchorId(link.id)}
                to="/campaigns/$campaignId/items/$itemId"
                params={{ campaignId, itemId: link.item.id }}
                className="min-h-6 min-w-0 text-sm font-medium break-words hover:underline"
              >
                {link.item.name}
              </Link>
              {canChange && (
                <UnlinkControl
                  campaignId={campaignId}
                  scenarioId={scenarioId}
                  sceneId={sceneId}
                  link={link}
                  onUnlinked={() => onUnlinked(link.item.name)}
                  onFocusSection={() => headingRef.current?.focus()}
                  onRefetch={onRefetch}
                />
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function LinkAnItemAction({ campaignId, scenarioId, sceneId }: { campaignId: string; scenarioId: string; sceneId: string }) {
  return (
    <Link
      to="/campaigns/$campaignId/scenarios/$scenarioId/scenes/$sceneId/item-links/new"
      params={{ campaignId, scenarioId, sceneId }}
      className={buttonVariants({ variant: 'outline', size: 'sm' })}
    >
      Link an Item
    </Link>
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
