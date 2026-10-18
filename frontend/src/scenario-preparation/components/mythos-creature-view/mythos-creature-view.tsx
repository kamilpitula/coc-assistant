import { forwardRef } from 'react'

import { MonsterCharacteristicsView } from '@/scenario-preparation/components/monster-characteristics-view/monster-characteristics-view'
import { MonsterCombatView } from '@/scenario-preparation/components/monster-combat-view/monster-combat-view'
import { MonsterDefensesView } from '@/scenario-preparation/components/monster-defenses-view/monster-defenses-view'
import { MonsterMovementView } from '@/scenario-preparation/components/monster-movement-view/monster-movement-view'
import { MonsterSanityLossView } from '@/scenario-preparation/components/monster-sanity-loss-view/monster-sanity-loss-view'
import { MonsterSkillsView } from '@/scenario-preparation/components/monster-skills-view/monster-skills-view'
import { MythosCreatureHeading } from '@/scenario-preparation/components/mythos-creature-heading/mythos-creature-heading'
import { ProfileSection } from '@/scenario-preparation/components/profile-section/profile-section'
import { ProfileSectionIndex } from '@/scenario-preparation/components/profile-section-index/profile-section-index'
import { SpellsView } from '@/scenario-preparation/components/spells-view/spells-view'
import { sectionAnchorId, sectionIndexEntries, SECTION_ORDER, SECTION_LABELS, type SectionName } from '@/scenario-preparation/services/mythosCreatureSections'
import type { MonsterDetails, MythosCreature } from '@/scenario-preparation/types/MythosCreature'
import { RichTextView } from '@/shared/components/rich-text-view/rich-text-view'
import { isEmptyRichText } from '@/shared/services/richText'

const DETAIL_LABELS: [Exclude<keyof MonsterDetails, 'creatureKind'>, string][] = [
  ['descriptionAndSensoryCues', 'Description and sensory cues'],
  ['origin', 'Origin'],
  ['goalAndBehavior', 'Goal and typical behavior'],
  ['signsAndTraces', 'Signs and traces'],
  ['defeatOutcome', 'Defeat outcome'],
  ['specimenRangeNotes', 'Specimen range notes'],
]

function presentSections(creature: MythosCreature): SectionName[] {
  return SECTION_ORDER.filter((section) => creature[section] !== null)
}

/** The body of one added section; the profile has already been checked to hold it. */
const SECTION_BODIES: { [S in SectionName]: (creature: MythosCreature) => React.ReactNode } = {
  characteristics: (creature) => (
    <MonsterCharacteristicsView characteristics={creature.characteristics!} defeatOutcome={creature.details.defeatOutcome} />
  ),
  movement: (creature) => <MonsterMovementView movement={creature.movement!} />,
  combat: (creature) => <MonsterCombatView combat={creature.combat!} />,
  defenses: (creature) => <MonsterDefensesView defenses={creature.defenses!} />,
  skills: (creature) => <MonsterSkillsView skills={creature.skills!} />,
  spells: (creature) => <SpellsView spells={creature.spells!} />,
  powers: (creature) => <SpellsView spells={creature.powers!} />,
  sanityLoss: (creature) => <MonsterSanityLossView sanityLoss={creature.sanityLoss!} />,
}

interface MythosCreatureViewProps {
  mythosCreature: MythosCreature
}

/**
 * A Mythos Creature's Monster Profile in view mode (specs/scenario-preparation/ux.md sections 25.1 and 25.5): the name and
 * Creature Kind, the "On this page" index, Details, each added section in its fixed order with the server's worked-out
 * values, and Keeper notes. The heading can take focus, for the page to return it after a save.
 */
export const MythosCreatureView = forwardRef<HTMLHeadingElement, MythosCreatureViewProps>(function MythosCreatureView({ mythosCreature }, ref) {
  const present = presentSections(mythosCreature)
  const details = DETAIL_LABELS.filter(([key]) => mythosCreature.details[key])

  return (
    <>
      <MythosCreatureHeading ref={ref} name={mythosCreature.name} creatureKind={mythosCreature.details.creatureKind} />
      <ProfileSectionIndex sections={sectionIndexEntries(present)} />
      <ProfileSection id={sectionAnchorId('details')} title="Details" mode="view">
        {details.length === 0 ? (
          <p className="text-sm text-muted-foreground">No details yet.</p>
        ) : (
          <dl className="flex flex-col gap-2 text-sm">
            {details.map(([key, label]) => (
              <div key={key}>
                <dt className="font-medium">{label}</dt>
                <dd className="break-words whitespace-pre-wrap">{mythosCreature.details[key]}</dd>
              </div>
            ))}
          </dl>
        )}
      </ProfileSection>
      {present.map((section) => (
        <ProfileSection key={section} id={sectionAnchorId(section)} title={SECTION_LABELS[section]} mode="view">
          {SECTION_BODIES[section](mythosCreature)}
        </ProfileSection>
      ))}
      <ProfileSection id={sectionAnchorId('keeperNotes')} title="Keeper notes" mode="view">
        {mythosCreature.keeperNotes && !isEmptyRichText(mythosCreature.keeperNotes) ? (
          <RichTextView document={mythosCreature.keeperNotes} />
        ) : (
          <p className="text-sm text-muted-foreground">No Keeper notes yet.</p>
        )}
      </ProfileSection>
    </>
  )
})
