import { Link } from '@tanstack/react-router'
import { ArrowRight } from 'lucide-react'
import { useId, type ReactNode } from 'react'

import { HumanNpcView } from '@/scenario-preparation/components/human-npc-view/human-npc-view'
import { MythosCreatureView } from '@/scenario-preparation/components/mythos-creature-view/mythos-creature-view'
import { useHumanNpc, useMythosCreature } from '@/scenario-preparation/hooks/useNonPlayerEntities'
import { useScene } from '@/scenario-preparation/hooks/useScenes'
import { NON_PLAYER_ENTITY_PROFILE_PATHS } from '@/scenario-preparation/types/NonPlayerEntity'
import type { NonPlayerEntityLink } from '@/scenario-preparation/types/Scene'
import type { Origin } from '@/shared/components/back-link/backLinkOrigin'
import { SidePanelContent } from '@/shared/components/side-panel/side-panel-content'
import { RichTextView } from '@/shared/components/rich-text-view/rich-text-view'
import { buttonVariants } from '@/shared/components/ui/button'
import { HeadingOffsetProvider } from '@/shared/providers/heading-offset/heading-offset'
import { isEmptyRichText } from '@/shared/services/richText'

interface EntityPanelBodyProps {
  campaignId: string
  scenarioId: string
  sceneId: string
  linkId: string
  /** Where the viewer came from; the "Open full page" link carries it, and the profile page shows its origin back link. */
  from?: Origin
}

/**
 * A Scene's Non-Player Entity in a side panel body (specs/navigation/ux.md section 3): what Players see, then the
 * profile's view mode read-only, shifted down so the profile name is an h4. The host passes the Scene's ids and, when
 * it has an origin, `from`; the body loads and authorizes through the same queries as the profile pages.
 */
export function EntityPanelBody({ campaignId, scenarioId, sceneId, linkId, from }: EntityPanelBodyProps) {
  const material = useScene(campaignId, scenarioId, sceneId, true)

  if (material.isError) {
    return <SidePanelContent kindLabel="Non-Player Entity" title={null} state="error" onRetry={() => void material.refetch()} />
  }
  if (material.data === undefined) {
    return <SidePanelContent kindLabel="Non-Player Entity" title={null} state="loading" />
  }
  if (material.data === null) {
    return <SidePanelContent kindLabel="Non-Player Entity" title={null} state="not-found" />
  }

  const link = material.data.nonPlayerEntityLinks.find((candidate) => candidate.id === linkId)
  if (link === undefined) {
    return <SidePanelContent kindLabel="Non-Player Entity" title={null} state="not-found" />
  }

  return link.nonPlayerEntity.type === 'HumanNpc' ? (
    <HumanNpcBody campaignId={campaignId} link={link} from={from} />
  ) : (
    <MythosCreatureBody campaignId={campaignId} link={link} from={from} />
  )
}

function HumanNpcBody({ campaignId, link, from }: { campaignId: string; link: NonPlayerEntityLink; from?: Origin }) {
  const profile = useHumanNpc(campaignId, link.nonPlayerEntity.id, true)

  if (profile.data === null) {
    return <SidePanelContent kindLabel="Non-Player Entity" title={null} state="not-found" />
  }
  if (profile.isError) {
    return <SidePanelContent kindLabel="Non-Player Entity" title={null} state="error" onRetry={() => void profile.refetch()} />
  }
  if (profile.data === undefined) {
    return <SidePanelContent kindLabel="Non-Player Entity" title={null} state="loading" />
  }

  return <EntityReady campaignId={campaignId} link={link} from={from} profile={<HumanNpcView humanNpc={profile.data} />} />
}

function MythosCreatureBody({ campaignId, link, from }: { campaignId: string; link: NonPlayerEntityLink; from?: Origin }) {
  const profile = useMythosCreature(campaignId, link.nonPlayerEntity.id, true)

  if (profile.data === null) {
    return <SidePanelContent kindLabel="Non-Player Entity" title={null} state="not-found" />
  }
  if (profile.isError) {
    return <SidePanelContent kindLabel="Non-Player Entity" title={null} state="error" onRetry={() => void profile.refetch()} />
  }
  if (profile.data === undefined) {
    return <SidePanelContent kindLabel="Non-Player Entity" title={null} state="loading" />
  }

  return <EntityReady campaignId={campaignId} link={link} from={from} profile={<MythosCreatureView mythosCreature={profile.data} />} />
}

function EntityReady({ campaignId, link, from, profile }: { campaignId: string; link: NonPlayerEntityLink; from?: Origin; profile: ReactNode }) {
  const seenId = useId()
  const profileId = useId()
  const paths = NON_PLAYER_ENTITY_PROFILE_PATHS[link.nonPlayerEntity.type]
  const hasDescription = link.playerFacingDescription !== null && !isEmptyRichText(link.playerFacingDescription)

  return (
    <SidePanelContent
      kindLabel="Non-Player Entity"
      title={link.playerFacingName}
      state="ready"
      footer={
        <Link
          to={paths.to}
          params={{ campaignId, [paths.idParam]: link.nonPlayerEntity.id } as never}
          {...(from === undefined ? {} : { search: { from } })}
          className={buttonVariants({ variant: 'link', className: 'px-0' })}
        >
          Open full page
          <ArrowRight aria-hidden="true" />
        </Link>
      }
    >
      <section aria-labelledby={seenId} className="flex flex-col gap-2">
        <h3 id={seenId} className="text-lg font-semibold">
          What Players see
        </h3>
        <p className="text-sm break-words text-muted-foreground">{link.playerFacingName}</p>
        {hasDescription ? (
          <RichTextView document={link.playerFacingDescription!} headingOffset={1} />
        ) : (
          <p className="text-sm text-muted-foreground">No Player-facing description yet.</p>
        )}
      </section>
      <section aria-labelledby={profileId} className="flex flex-col gap-2">
        <h3 id={profileId} className="text-lg font-semibold">
          Profile
        </h3>
        <HeadingOffsetProvider value={3}>{profile}</HeadingOffsetProvider>
      </section>
    </SidePanelContent>
  )
}
