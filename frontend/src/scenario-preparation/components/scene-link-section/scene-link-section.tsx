import { Link } from '@tanstack/react-router'
import { useEffect, useId, useRef, useState } from 'react'

import { UnlinkNonPlayerEntityDialog } from '@/scenario-preparation/components/unlink-non-player-entity-dialog/unlink-non-player-entity-dialog'
import { useUnlinkNonPlayerEntity } from '@/scenario-preparation/hooks/useNonPlayerEntityLinks'
import { SceneFinishedError } from '@/scenario-preparation/services/sceneApi'
import { NON_PLAYER_ENTITY_PROFILE_PATHS, NON_PLAYER_ENTITY_TYPE_LABELS } from '@/scenario-preparation/types/NonPlayerEntity'
import type { NonPlayerEntityLink, SceneStatus } from '@/scenario-preparation/types/Scene'
import { RichTextView } from '@/shared/components/rich-text-view/rich-text-view'
import { Button, buttonVariants } from '@/shared/components/ui/button'
import { isEmptyRichText } from '@/shared/services/richText'

interface SceneLinkSectionProps {
  campaignId: string
  scenarioId: string
  sceneId: string
  status: SceneStatus
  links: NonPlayerEntityLink[]
  /** The link whose heading takes focus once it is listed, for example right after it was linked or saved. */
  focusLinkId?: string
  /** Called with the link's Player-facing name once it has been unlinked, so the page can say so. */
  onUnlinked: (playerFacingName: string) => void
  /** Called when a refusal because the Scene is Finished is closed, so the page shows the Finished Scene. */
  onRefetch: () => void
}

/**
 * The Scene's "Non-Player Entities" section (specs/scenario-preparation/ux.md section 32): each link's Player-facing name, its
 * profile and its description, with "Link a Non-Player Entity", "Edit", and "Unlink" while the Scene is Prepared or Active.
 */
export function SceneLinkSection({ campaignId, scenarioId, sceneId, status, links, focusLinkId, onUnlinked, onRefetch }: SceneLinkSectionProps) {
  const headingId = useId()
  const headingRef = useRef<HTMLHeadingElement>(null)
  const sectionRef = useRef<HTMLElement>(null)
  const canChange = status !== 'Finished'

  // Focus the named link's heading once, as soon as it is listed.
  const focused = useRef(false)
  useEffect(() => {
    if (!focusLinkId || focused.current) {
      return
    }
    const heading = sectionRef.current?.querySelector<HTMLElement>(`[data-link-heading="${CSS.escape(focusLinkId)}"]`)
    if (heading) {
      focused.current = true
      heading.focus()
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
        <ul className="flex flex-col gap-4">
          {links.map((link) => (
            <LinkItem
              key={link.id}
              campaignId={campaignId}
              scenarioId={scenarioId}
              sceneId={sceneId}
              link={link}
              canChange={canChange}
              onUnlinked={() => onUnlinked(link.playerFacingName)}
              onFocusSection={() => headingRef.current?.focus()}
              onRefetch={onRefetch}
            />
          ))}
        </ul>
      )}
    </section>
  )
}

interface LinkItemProps {
  campaignId: string
  scenarioId: string
  sceneId: string
  link: NonPlayerEntityLink
  canChange: boolean
  onUnlinked: () => void
  onFocusSection: () => void
  onRefetch: () => void
}

function LinkItem({ campaignId, scenarioId, sceneId, link, canChange, onUnlinked, onFocusSection, onRefetch }: LinkItemProps) {
  const profilePath = NON_PLAYER_ENTITY_PROFILE_PATHS[link.nonPlayerEntity.type]
  const hasDescription = link.playerFacingDescription !== null && !isEmptyRichText(link.playerFacingDescription)

  return (
    <li className="flex flex-col gap-2">
      <h3 data-link-heading={link.id} tabIndex={-1} className="text-base font-semibold break-words outline-none">
        {link.playerFacingName}
      </h3>
      <p className="text-sm break-words text-muted-foreground">
        {NON_PLAYER_ENTITY_TYPE_LABELS[link.nonPlayerEntity.type]}:{' '}
        <Link
          to={profilePath.to}
          params={{ campaignId, [profilePath.idParam]: link.nonPlayerEntity.id } as never}
          className="font-medium text-foreground underline underline-offset-4"
        >
          {link.nonPlayerEntity.name}
        </Link>
      </p>
      {hasDescription ? (
        <RichTextView document={link.playerFacingDescription!} headingOffset={1} />
      ) : (
        <p className="text-sm text-muted-foreground">No Player-facing description yet.</p>
      )}
      {canChange && (
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
            onUnlinked={onUnlinked}
            onFocusSection={onFocusSection}
            onRefetch={onRefetch}
          />
        </div>
      )}
    </li>
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
