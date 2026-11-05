import { Link } from '@tanstack/react-router'
import { ArrowRight } from 'lucide-react'
import { useId, type ReactNode } from 'react'

import { HumanNpcView } from '@/scenario-preparation/components/human-npc-view/human-npc-view'
import { MythosCreatureView } from '@/scenario-preparation/components/mythos-creature-view/mythos-creature-view'
import { useHumanNpc, useMythosCreature } from '@/scenario-preparation/hooks/useNonPlayerEntities'
import { useScene } from '@/scenario-preparation/hooks/useScenes'
import { NON_PLAYER_ENTITY_PROFILE_PATHS } from '@/scenario-preparation/types/NonPlayerEntity'
import type { NonPlayerEntityLink } from '@/scenario-preparation/types/Scene'
import { useActiveScene } from '@/scene-play/hooks/useActiveScene'
import type { KeeperActiveScene } from '@/scene-play/types/ActiveScene'
import { SidePanelContent } from '@/shared/components/side-panel/side-panel-content'
import { RichTextView } from '@/shared/components/rich-text-view/rich-text-view'
import { buttonVariants } from '@/shared/components/ui/button'
import { HeadingOffsetProvider } from '@/shared/providers/heading-offset/heading-offset'
import { isEmptyRichText } from '@/shared/services/richText'

interface EntityPanelProps {
  campaignId: string
  linkId: string
}

/**
 * A Scene's Non-Player Entity in the side panel (specs/navigation/ux.md section 3): what Players see, then the profile's
 * view mode read-only, shifted down so the profile name is an h4. The link comes from the Keeper's Active Scene; a Player
 * or a missing Scene shows not-found and sends no Scene or profile request.
 */
export function EntityPanel({ campaignId, linkId }: EntityPanelProps) {
  const active = useActiveScene(campaignId)

  if (active.data === undefined) {
    return <SidePanelContent kindLabel="Non-Player Entity" title={null} state="loading" />
  }
  if (active.data?.kind !== 'keeper') {
    return <SidePanelContent kindLabel="Non-Player Entity" title={null} state="not-found" />
  }

  return <EntityLinkBody campaignId={campaignId} scene={active.data} linkId={linkId} />
}

function EntityLinkBody({ campaignId, scene, linkId }: { campaignId: string; scene: KeeperActiveScene; linkId: string }) {
  const material = useScene(campaignId, scene.scenarioId, scene.sceneId, true)

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

  return link.nonPlayerEntity.type === 'HumanNpc' ? <HumanNpcBody campaignId={campaignId} link={link} /> : <MythosCreatureBody campaignId={campaignId} link={link} />
}

function HumanNpcBody({ campaignId, link }: { campaignId: string; link: NonPlayerEntityLink }) {
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

  return <EntityReady campaignId={campaignId} link={link} profile={<HumanNpcView humanNpc={profile.data} />} />
}

function MythosCreatureBody({ campaignId, link }: { campaignId: string; link: NonPlayerEntityLink }) {
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

  return <EntityReady campaignId={campaignId} link={link} profile={<MythosCreatureView mythosCreature={profile.data} />} />
}

function EntityReady({ campaignId, link, profile }: { campaignId: string; link: NonPlayerEntityLink; profile: ReactNode }) {
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
          search={{ from: 'active-scene' }}
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
