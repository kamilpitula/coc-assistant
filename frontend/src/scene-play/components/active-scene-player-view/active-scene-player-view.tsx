import type { Ref } from 'react'

import { RevealedToSection } from '@/scene-play/components/revealed-to-section/revealed-to-section'
import { HeldItemsSection } from '@/scene-play/components/held-items-section/held-items-section'
import { ActiveSceneWall } from '@/scene-play/components/active-scene-wall/active-scene-wall'
import type { AbsentPlayerActiveScene, PresentPlayerActiveScene } from '@/scene-play/types/ActiveScene'

interface ActiveScenePlayerViewProps {
  campaignId: string
  scene: PresentPlayerActiveScene | AbsentPlayerActiveScene
  /** The page h1, for panel focus return when the opening control is gone. */
  headingRef: Ref<HTMLHeadingElement>
  /** Called after a Wall Entry is added, so the page can say "Wall Entry added.". */
  onWallEntryAdded: () => void
}

/**
 * The Active Scene for a Player (specs/scene-play/ux.md sections 4 and 21.8): a Player whose Investigator is present sees the title,
 * location, who is present, and what was revealed to their Investigator; any other Player sees only that the Scene is in progress.
 * Both see the Campaign Wall last, on the right from 1024px.
 */
export function ActiveScenePlayerView({ campaignId, scene, headingRef, onWallEntryAdded }: ActiveScenePlayerViewProps) {
  if (scene.kind === 'absent-player') {
    return (
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <section className="flex min-w-0 max-w-2xl flex-col gap-3">
          <h1 ref={headingRef} tabIndex={-1} className="text-2xl font-semibold break-words">
            {scene.title}
          </h1>
          <p className="text-sm">This Scene is in progress. You aren&apos;t taking part in it.</p>
        </section>
        <ActiveSceneWall campaignId={campaignId} viewerRole="Player" onWallEntryAdded={onWallEntryAdded} />
      </div>
    )
  }

  const yourName = scene.investigatorsPresent.find((investigator) => investigator.isYours)?.name ?? 'Unnamed Investigator'

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <div className="flex min-w-0 flex-col gap-6">
        <h1 ref={headingRef} tabIndex={-1} className="max-w-2xl text-2xl font-semibold break-words">
          {scene.title}
        </h1>
        {scene.location !== '' && (
          <dl className="flex max-w-2xl flex-wrap gap-x-3 text-sm">
            <dt className="font-medium">Location</dt>
            <dd className="break-words">{scene.location}</dd>
          </dl>
        )}
        <section aria-labelledby="present-heading" className="flex max-w-2xl flex-col gap-2">
          <h2 id="present-heading" className="text-lg font-semibold">
            Investigators present
          </h2>
          <ul className="list-disc pl-5 text-sm">
            {scene.investigatorsPresent.map((investigator, index) => (
              <li key={index} className="break-words">
                {investigator.name ?? 'Unnamed Investigator'}
                {investigator.isYours && ' (your Investigator)'}
              </li>
            ))}
          </ul>
        </section>
        <RevealedToSection campaignId={campaignId} investigatorName={yourName} reveals={scene.reveals} />
        <HeldItemsSection campaignId={campaignId} shortTime />
      </div>
      <ActiveSceneWall campaignId={campaignId} viewerRole="Player" onWallEntryAdded={onWallEntryAdded} />
    </div>
  )
}
