import { Link } from '@tanstack/react-router'
import { useEffect, useId, useRef, useState } from 'react'

import { MaterialEntry, MaterialEntryList } from '@/scenario-preparation/components/material-entry/material-entry'
import { UnlinkNonPlayerEntityDialog } from '@/scenario-preparation/components/unlink-non-player-entity-dialog/unlink-non-player-entity-dialog'
import { useUnlinkNonPlayerEntity } from '@/scenario-preparation/hooks/useNonPlayerEntityLinks'
import { SceneFinishedError } from '@/scenario-preparation/services/sceneApi'
import type { NonPlayerEntityLink, SceneStatus } from '@/scenario-preparation/types/Scene'
import { Button, buttonVariants } from '@/shared/components/ui/button'

interface SceneLinkSectionProps {
  campaignId: string
  scenarioId: string
  sceneId: string
  status: SceneStatus
  links: NonPlayerEntityLink[]
  /** The link whose title takes focus once it is listed, for example right after it was linked or saved. */
  focusLinkId?: string
  /** Called with the link's Player-facing name once it has been unlinked, so the page can say so. */
  onUnlinked: (playerFacingName: string) => void
  /** Called when a refusal because the Scene is Finished is closed, so the page shows the Finished Scene. */
  onRefetch: () => void
}

const entityLinkTitleId = (linkId: string): string => `entity-link-${linkId}`

/**
 * The Scene's "Non-Player Entities" section (specs/scenario-preparation/ux.md section 32): each link's Player-facing
 * name as a material entry title that opens its side panel, with "Link a Non-Player Entity", "Edit", and "Unlink"
 * while the Scene is Prepared or Active. The profile and description live in the entity panel (PBI-SPL-005).
 */
export function SceneLinkSection({ campaignId, scenarioId, sceneId, status, links, focusLinkId, onUnlinked, onRefetch }: SceneLinkSectionProps) {
  const headingId = useId()
  const headingRef = useRef<HTMLHeadingElement>(null)
  const sectionRef = useRef<HTMLElement>(null)
  const canChange = status !== 'Finished'

  // Focus the named link's title once, as soon as it is listed.
  const focused = useRef(false)
  useEffect(() => {
    if (!focusLinkId || focused.current) {
      return
    }
    const title = sectionRef.current?.querySelector<HTMLElement>(`#${CSS.escape(entityLinkTitleId(focusLinkId))}`)
    if (title) {
      focused.current = true
      title.focus()
    }
  }, [focusLinkId, links])

  return (
    <section ref={sectionRef} aria-labelledby={headingId} className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
        <h2 id={headingId} ref={headingRef} tabIndex={-1} className="text-lg font-semibold outline-none">
          Non-Player Entities
        </h2>
        {canChange && (
          <Link
            to="/campaigns/$campaignId/scenarios/$scenarioId/scenes/$sceneId/non-player-entity-links/new"
            params={{ campaignId, scenarioId, sceneId }}
            className={buttonVariants({ variant: 'outline', size: 'sm' })}
          >
            Link a Non-Player Entity
          </Link>
        )}
      </div>
      <p className="text-sm text-muted-foreground">Only the Player-facing name and description can reach Players, and only when you reveal them.</p>
      {links.length === 0 ? (
        <p className="text-sm text-muted-foreground">No Non-Player Entities linked yet.</p>
      ) : (
        <MaterialEntryList as="ul">
          {links.map((link) => (
            <MaterialEntry
              key={link.id}
              subject={{ type: 'entity', link }}
              titleId={entityLinkTitleId(link.id)}
              action={
                canChange ? (
                  <div className="flex flex-wrap items-center gap-3">
                    <Link
                      to="/campaigns/$campaignId/scenarios/$scenarioId/scenes/$sceneId/non-player-entity-links/$linkId"
                      params={{ campaignId, scenarioId, sceneId, linkId: link.id }}
                      aria-label={`Edit ${link.playerFacingName}`}
                      className={buttonVariants({ variant: 'outline', size: 'sm' })}
                    >
                      Edit
                    </Link>
                    <UnlinkControl
                      campaignId={campaignId}
                      scenarioId={scenarioId}
                      sceneId={sceneId}
                      link={link}
                      onUnlinked={() => onUnlinked(link.playerFacingName)}
                      onFocusSection={() => headingRef.current?.focus()}
                      onRefetch={onRefetch}
                    />
                  </div>
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
  link: NonPlayerEntityLink
  onUnlinked: () => void
  onFocusSection: () => void
  onRefetch: () => void
}

function UnlinkControl({ campaignId, scenarioId, sceneId, link, onUnlinked, onFocusSection, onRefetch }: UnlinkControlProps) {
  const [open, setOpen] = useState(false)
  const unlink = useUnlinkNonPlayerEntity(campaignId, scenarioId, sceneId, link.id)
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
        aria-label={`Unlink ${link.playerFacingName}`}
        onClick={() => {
          unlink.reset()
          setOpen(true)
        }}
      >
        Unlink
      </Button>
      <UnlinkNonPlayerEntityDialog
        open={open}
        playerFacingName={link.playerFacingName}
        profileName={link.nonPlayerEntity.name}
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
          // The unlinked item is gone, so focus goes to the section heading; a Cancel returns it to Unlink.
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
