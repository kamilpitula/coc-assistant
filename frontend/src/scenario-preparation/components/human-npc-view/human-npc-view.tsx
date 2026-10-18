import { forwardRef } from 'react'

import { NpcCharacteristicsView } from '@/scenario-preparation/components/npc-characteristics-view/npc-characteristics-view'
import { NpcCombatView } from '@/scenario-preparation/components/npc-combat-view/npc-combat-view'
import { NpcSkillsView } from '@/scenario-preparation/components/npc-skills-view/npc-skills-view'
import { SpellsView } from '@/scenario-preparation/components/spells-view/spells-view'
import { ProfileSection } from '@/scenario-preparation/components/profile-section/profile-section'
import type { HumanNpc } from '@/scenario-preparation/types/HumanNpc'
import { RichTextView } from '@/shared/components/rich-text-view/rich-text-view'
import { isEmptyRichText } from '@/shared/services/richText'

const DETAIL_LABELS: [keyof HumanNpc['details'], string][] = [
  ['professionOrRole', 'Profession or role'],
  ['shortDescription', 'Short description'],
  ['goal', 'Goal'],
  ['relationshipToInvestigators', 'Relationship to the Investigators'],
  ['knowledge', 'What the Human NPC knows'],
  ['secrets', 'What the Human NPC hides'],
  ['behaviorCue', 'Behavior cue'],
]

interface HumanNpcViewProps {
  humanNpc: HumanNpc
}

/**
 * A Human NPC's NPC Profile in view mode (specs/scenario-preparation/ux.md sections 25.1 and 25.4): the name, the type and
 * age, Details, each added section in its fixed order with the server's worked-out values, and Keeper notes. The heading
 * can take focus, for the page to return it after a save.
 */
export const HumanNpcView = forwardRef<HTMLHeadingElement, HumanNpcViewProps>(function HumanNpcView({ humanNpc }, ref) {
  const details = DETAIL_LABELS.filter(([key]) => humanNpc.details[key])

  return (
    <>
      <div className="flex flex-col gap-1">
        <h1 ref={ref} tabIndex={-1} className="text-2xl font-semibold break-words outline-none">
          {humanNpc.name}
        </h1>
        <p className="text-sm text-muted-foreground">
          Human NPC
          <span aria-hidden="true"> &middot; </span>
          <span className="sr-only">, </span>
          Age {humanNpc.age}
        </p>
      </div>
      <ProfileSection title="Details" mode="view">
        {details.length === 0 ? (
          <p className="text-sm text-muted-foreground">No details yet.</p>
        ) : (
          <dl className="flex flex-col gap-2 text-sm">
            {details.map(([key, label]) => (
              <div key={key}>
                <dt className="font-medium">{label}</dt>
                <dd className="break-words whitespace-pre-wrap">{humanNpc.details[key]}</dd>
              </div>
            ))}
          </dl>
        )}
      </ProfileSection>
      {humanNpc.characteristics && (
        <ProfileSection title="Characteristics" mode="view">
          <NpcCharacteristicsView characteristics={humanNpc.characteristics} />
        </ProfileSection>
      )}
      {humanNpc.skills && (
        <ProfileSection title="Skills" mode="view">
          <NpcSkillsView skills={humanNpc.skills} />
        </ProfileSection>
      )}
      {humanNpc.combat && (
        <ProfileSection title="Combat" mode="view">
          <NpcCombatView combat={humanNpc.combat} skills={humanNpc.skills ?? []} />
        </ProfileSection>
      )}
      {humanNpc.spells && (
        <ProfileSection title="Spells" mode="view">
          <SpellsView spells={humanNpc.spells} />
        </ProfileSection>
      )}
      <ProfileSection title="Keeper notes" mode="view">
        {humanNpc.keeperNotes && !isEmptyRichText(humanNpc.keeperNotes) ? (
          <RichTextView document={humanNpc.keeperNotes} />
        ) : (
          <p className="text-sm text-muted-foreground">No Keeper notes yet.</p>
        )}
      </ProfileSection>
    </>
  )
})
