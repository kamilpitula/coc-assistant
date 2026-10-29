import type { AbsentPlayerActiveScene, PresentPlayerActiveScene } from '@/scene-play/types/ActiveScene'

interface ActiveScenePlayerViewProps {
  scene: PresentPlayerActiveScene | AbsentPlayerActiveScene
}

/**
 * The Active Scene for a Player (specs/scene-play/ux.md section 4): a Player whose Investigator is present sees the title,
 * location, who is present, and what was revealed to their Investigator; any other Player sees only that the Scene is in progress.
 */
export function ActiveScenePlayerView({ scene }: ActiveScenePlayerViewProps) {
  if (scene.kind === 'absent-player') {
    return (
      <section className="flex max-w-2xl flex-col gap-3">
        <h1 className="text-2xl font-semibold break-words">{scene.title}</h1>
        <p className="text-sm">This Scene is in progress. You aren&apos;t taking part in it.</p>
      </section>
    )
  }

  const yourName = scene.investigatorsPresent.find((investigator) => investigator.isYours)?.name ?? 'Unnamed Investigator'

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <h1 className="text-2xl font-semibold break-words">{scene.title}</h1>
      {scene.location !== '' && (
        <dl className="flex flex-wrap gap-x-3 text-sm">
          <dt className="font-medium">Location</dt>
          <dd className="break-words">{scene.location}</dd>
        </dl>
      )}
      <section aria-labelledby="present-heading" className="flex flex-col gap-2">
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
      <section aria-labelledby="revealed-heading" className="flex flex-col gap-2">
        <h2 id="revealed-heading" className="text-lg font-semibold break-words">
          Revealed to {yourName}
        </h2>
        <p className="text-sm text-muted-foreground">The Keeper hasn&apos;t revealed anything to {yourName} yet.</p>
      </section>
    </div>
  )
}
