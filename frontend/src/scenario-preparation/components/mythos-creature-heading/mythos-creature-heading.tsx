import { createElement, forwardRef } from 'react'

import { useHeadingTag } from '@/shared/providers/heading-offset/heading-offset-context'

import type { CreatureKind } from '@/scenario-preparation/types/MythosCreature'

interface MythosCreatureHeadingProps {
  name: string
  creatureKind: CreatureKind | null
}

/**
 * A Mythos Creature's `h1` and its muted line: the type, then the Creature Kind when set (specs/scenario-preparation/ux.md
 * section 25.1). The heading can take focus, for the page to return it after a save.
 */
export const MythosCreatureHeading = forwardRef<HTMLHeadingElement, MythosCreatureHeadingProps>(function MythosCreatureHeading(
  { name, creatureKind },
  ref,
) {
  const tag = useHeadingTag(1)

  return (
    <div className="flex flex-col gap-1">
      {createElement(tag, { ref, tabIndex: -1, className: 'text-2xl font-semibold break-words outline-none' }, name)}
      <p className="text-sm text-muted-foreground">
        Mythos Creature
        {creatureKind && (
          <>
            <span aria-hidden="true"> &middot; </span>
            <span className="sr-only">, </span>
            {creatureKind}
          </>
        )}
      </p>
    </div>
  )
})
