import { Link } from '@tanstack/react-router'
import { useId } from 'react'

import { SceneStatusBadge } from '@/scenario-preparation/components/scene-status-badge/scene-status-badge'
import type { ItemScene } from '@/scenario-preparation/types/Item'

interface ItemScenesSectionProps {
  campaignId: string
  /** The Scenes that link the Item, in Scenario order then Scene order. */
  scenes: ItemScene[]
}

/**
 * The Item page's read-only "Scenes" section (specs/scenario-preparation/ux.md section 63.1): each Scene that links the Item, with
 * its Scenario and its status as text. Links are made and removed on the Scene page, never here.
 */
export function ItemScenesSection({ campaignId, scenes }: ItemScenesSectionProps) {
  const headingId = useId()

  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-3">
      <h2 id={headingId} className="text-lg font-semibold">
        Scenes
      </h2>
      {scenes.length === 0 ? (
        <p className="text-sm text-muted-foreground">Not linked to any Scene yet. Link it from a Scene page.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {scenes.map((scene) => (
            <li key={scene.id} className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <Link
                to="/campaigns/$campaignId/scenarios/$scenarioId/scenes/$sceneId"
                params={{ campaignId, scenarioId: scene.scenarioId, sceneId: scene.id }}
                className="min-h-6 text-sm font-medium break-words hover:underline"
              >
                {scene.title}
              </Link>
              <span className="text-sm break-words text-muted-foreground">Scenario: {scene.scenarioTitle}</span>
              <SceneStatusBadge status={scene.status} />
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
