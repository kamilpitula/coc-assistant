import { useCallback, useEffect, useId, useReducer, useRef, useState, type FormEvent, type ReactNode } from 'react'

import { WizardField } from '@/campaign-play/components/wizard-field/wizard-field'
import { WizardSelect } from '@/campaign-play/components/wizard-select/wizard-select'
import { WizardTextarea } from '@/campaign-play/components/wizard-textarea/wizard-textarea'
import { useSkillCatalog } from '@/campaign-play/hooks/useRuleData'
import { AddSectionGroup } from '@/scenario-preparation/components/add-section-group/add-section-group'
import { FormErrorSummary } from '@/scenario-preparation/components/form-error-summary/form-error-summary'
import { MonsterCharacteristicsFields } from '@/scenario-preparation/components/monster-characteristics-fields/monster-characteristics-fields'
import { MonsterCombatFields } from '@/scenario-preparation/components/monster-combat-fields/monster-combat-fields'
import { MonsterDefensesFields } from '@/scenario-preparation/components/monster-defenses-fields/monster-defenses-fields'
import { MonsterMovementRows } from '@/scenario-preparation/components/monster-movement-rows/monster-movement-rows'
import { MonsterSanityLossFields } from '@/scenario-preparation/components/monster-sanity-loss-fields/monster-sanity-loss-fields'
import { MonsterSkillRows } from '@/scenario-preparation/components/monster-skill-rows/monster-skill-rows'
import { ProfileSection } from '@/scenario-preparation/components/profile-section/profile-section'
import { ProfileSectionIndex } from '@/scenario-preparation/components/profile-section-index/profile-section-index'
import { RemoveSectionDialog } from '@/scenario-preparation/components/remove-section-dialog/remove-section-dialog'
import { SpellRowFields } from '@/scenario-preparation/components/spell-row-fields/spell-row-fields'
import { RepeatingRows } from '@/scenario-preparation/components/repeating-rows/repeating-rows'
import { StickyFormActions } from '@/scenario-preparation/components/sticky-form-actions/sticky-form-actions'
import { useFocusOnce, useFocusTarget } from '@/scenario-preparation/hooks/useProfileFormFocus'
import {
  identityErrors,
  inputFromState,
  mythosCreatureFormReducer,
  NARRATIVE_KEYS,
  presentSections,
  sectionHasValues,
  stateFromMythosCreature,
  summaryProblems,
  type NarrativeKey,
  type SectionFieldsProps,
} from '@/scenario-preparation/services/mythosCreatureForm'
import { SECTION_LABELS, SECTION_ORDER, sectionAnchorId, sectionIndexEntries, type SectionName } from '@/scenario-preparation/services/mythosCreatureSections'
import { addRowButtonId, controlIdFor, messageFor } from '@/scenario-preparation/services/profileForm'
import { CREATURE_KINDS, type CreatureKind, type MythosCreature, type MythosCreatureInput } from '@/scenario-preparation/types/MythosCreature'
import type { ValidationProblem } from '@/scenario-preparation/types/ValidationProblem'
import { RichTextEditor } from '@/shared/components/rich-text-editor/rich-text-editor'
import { Alert } from '@/shared/components/ui/alert'
import { Button } from '@/shared/components/ui/button'
import { Label } from '@/shared/components/ui/label'
import { useUnsavedChangesPrompt } from '@/shared/hooks/useUnsavedChangesPrompt'
import type { RichTextDocument } from '@/shared/types/RichText'

const NOTES_HINT = 'Only you can read these. You can format text and add links.'

const NARRATIVE_LABELS: Record<NarrativeKey, string> = {
  descriptionAndSensoryCues: 'Description and sensory cues',
  origin: 'Origin',
  goalAndBehavior: 'Goal and typical behavior',
  signsAndTraces: 'Signs and traces',
  defeatOutcome: 'Defeat outcome',
  specimenRangeNotes: 'Specimen range notes',
}

const NARRATIVE_HELP: Partial<Record<NarrativeKey, string>> = {
  defeatOutcome: 'What happens at zero Hit Points or when it loses a conflict.',
}

const NOT_SET = 'not-set'
const KIND_OPTIONS = [{ value: NOT_SET, label: 'Not set' }, ...CREATURE_KINDS.map((kind) => ({ value: kind, label: kind }))]

interface MythosCreatureFormProps {
  campaignId: string
  mythosCreature: MythosCreature
  pending: boolean
  /** The refused values of the last save, keyed by lower-cased request path (ADR 0018). */
  problems: ValidationProblem[]
  /** The last save failed for a reason other than validation. */
  failureMessage: string | null
  onSubmit: (input: MythosCreatureInput) => void
  onCancel: () => void
}

/**
 * The whole-profile Mythos Creature editor (specs/scenario-preparation/ux.md sections 25.2 and 25.5): the section index,
 * Details, the added sections, "Add a section", Keeper notes, and a sticky Save and Cancel bar. The client checks only
 * the Name; every other rule is the server's and arrives as `problems`.
 */
export function MythosCreatureForm({ campaignId, mythosCreature, pending, problems, failureMessage, onSubmit, onCancel }: MythosCreatureFormProps) {
  const [state, dispatch] = useReducer(mythosCreatureFormReducer, mythosCreature, stateFromMythosCreature)
  const [initialJson] = useState(() => JSON.stringify(inputFromState(stateFromMythosCreature(mythosCreature), null)))
  const [clientErrors, setClientErrors] = useState<Record<string, string>>({})
  const [notesChanged, setNotesChanged] = useState(false)
  const notes = useRef<RichTextDocument | null>(mythosCreature.keeperNotes)
  const summaryRef = useRef<HTMLDivElement>(null)
  const notesIds = { label: useId(), hint: useId(), error: useId() }
  const skillCatalog = useSkillCatalog(campaignId)

  const isDirty = notesChanged || JSON.stringify(inputFromState(state, null)) !== initialJson
  useUnsavedChangesPrompt(isDirty)
  useFocusTarget(state.focusTarget, useCallback(() => dispatch({ type: 'clearFocus' }), []))
  useFocusOnce(summaryRef, problems)
  useEffect(() => {
    // The form opens on Name, unless it already carries a refused save, whose summary takes focus instead.
    if (problems.length === 0) {
      document.getElementById(controlIdFor('name'))?.focus()
    }
    // Once, when the form appears.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const errorOf = (path: string): string | undefined => clientErrors[path] ?? messageFor(problems, path)
  const sectionProps: SectionFieldsProps = { state, dispatch, errorOf }
  const summary = summaryProblems(state, problems)
  const present = presentSections(state)

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const errors = identityErrors(state)
    if (errors.name) {
      setClientErrors({ name: errors.name })
      document.getElementById(controlIdFor('name'))?.focus()
      return
    }
    setClientErrors({})
    onSubmit(inputFromState(state, notes.current))
  }

  return (
    <form className="flex max-w-3xl scroll-pb-24 flex-col gap-6" onSubmit={handleSubmit} noValidate>
      <p role="status" className="sr-only">
        {state.announcement}
      </p>
      <ProfileSectionIndex sections={sectionIndexEntries(present)} />
      {summary.length > 0 && (
        <FormErrorSummary ref={summaryRef} problems={summary} onSelect={(path) => document.getElementById(controlIdFor(path))?.focus()} />
      )}
      <DetailsFields {...sectionProps} />
      <OptionalSections
        {...sectionProps}
        present={present}
        skillCatalog={skillCatalog.data}
        catalogFailed={skillCatalog.isError}
        onRetryCatalog={() => void skillCatalog.refetch()}
      />
      <ProfileSection id={sectionAnchorId('keeperNotes')} title="Keeper notes" mode="edit">
        <div className="flex flex-col gap-2">
          <Label id={notesIds.label} htmlFor={controlIdFor('keeperNotes')} className="sr-only">
            Keeper notes
          </Label>
          <RichTextEditor
            id={controlIdFor('keeperNotes')}
            labelledBy={notesIds.label}
            describedBy={errorOf('keeperNotes') ? `${notesIds.hint} ${notesIds.error}` : notesIds.hint}
            invalid={Boolean(errorOf('keeperNotes'))}
            initialValue={mythosCreature.keeperNotes}
            onChange={(value) => {
              notes.current = value
              setNotesChanged(true)
            }}
          />
          <p id={notesIds.hint} className="text-sm text-muted-foreground">
            {NOTES_HINT}
          </p>
          {errorOf('keeperNotes') && (
            <p id={notesIds.error} className="text-sm text-destructive">
              {errorOf('keeperNotes')}
            </p>
          )}
        </div>
      </ProfileSection>
      {failureMessage && (
        <Alert variant="destructive" role="alert">
          {failureMessage}
        </Alert>
      )}
      <StickyFormActions>
        <Button type="submit" disabled={pending}>
          {pending ? 'Saving...' : 'Save'}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      </StickyFormActions>
    </form>
  )
}

function DetailsFields({ state, dispatch, errorOf }: SectionFieldsProps) {
  return (
    <ProfileSection id={sectionAnchorId('details')} title="Details" mode="edit">
      <WizardField
        field="name"
        label="Name"
        value={state.name}
        error={errorOf('name')}
        onChange={(value) => dispatch({ type: 'setName', value: value ?? '' })}
      />
      <WizardSelect
        field="details.creatureKind"
        label="Creature Kind"
        help="It only organizes your profiles and has no game effect."
        value={state.creatureKind ?? NOT_SET}
        options={KIND_OPTIONS}
        error={errorOf('details.creatureKind')}
        onChange={(value) => dispatch({ type: 'setCreatureKind', value: value === NOT_SET ? null : (value as CreatureKind) })}
        className="w-48"
      />
      {NARRATIVE_KEYS.map((key) => (
        <WizardTextarea
          key={key}
          field={`details.${key}`}
          label={NARRATIVE_LABELS[key]}
          help={NARRATIVE_HELP[key]}
          value={state.details[key] === '' ? null : state.details[key]}
          error={errorOf(`details.${key}`)}
          onChange={(value) => dispatch({ type: 'setDetail', key, value: value ?? '' })}
        />
      ))}
    </ProfileSection>
  )
}

interface OptionalSectionsProps extends SectionFieldsProps {
  present: SectionName[]
  skillCatalog: React.ComponentProps<typeof MonsterSkillRows>['skillCatalog']
  catalogFailed: boolean
  onRetryCatalog: () => void
}

/** What each section edits; one entry per section keeps the choice out of a branching function. */
const SECTION_FIELDS: { [S in SectionName]: (props: OptionalSectionsProps) => ReactNode } = {
  characteristics: (props) => <MonsterCharacteristicsFields {...props} />,
  movement: (props) => <MonsterMovementRows {...props} />,
  combat: (props) => <MonsterCombatFields {...props} />,
  defenses: (props) => <MonsterDefensesFields {...props} />,
  skills: (props) => <MonsterSkillRows {...props} />,
  spells: (props) => <SpellRows {...props} list="spells" />,
  powers: (props) => <SpellRows {...props} list="powers" />,
  sanityLoss: (props) => <MonsterSanityLossFields {...props} />,
}

/** The added sections in their fixed order, with the Remove confirmation and the "Add a section" group. */
function OptionalSections(props: OptionalSectionsProps) {
  const { state, dispatch, present } = props
  const [removing, setRemoving] = useState<SectionName | null>(null)

  const requestRemoval = (section: SectionName) => {
    if (sectionHasValues(state, section)) {
      setRemoving(section)
    } else {
      dispatch({ type: 'removeSection', section })
    }
  }

  return (
    <>
      {present.map((section) => (
        <ProfileSection key={section} id={sectionAnchorId(section)} title={SECTION_LABELS[section]} mode="edit" onRemove={() => requestRemoval(section)}>
          {SECTION_FIELDS[section](props)}
        </ProfileSection>
      ))}
      <AddSectionGroup
        available={SECTION_ORDER.filter((section) => !present.includes(section))}
        labels={SECTION_LABELS}
        onAdd={(section) => dispatch({ type: 'addSection', section })}
      />
      <RemoveSectionDialog
        open={removing !== null}
        section={removing ? SECTION_LABELS[removing] : ''}
        onKeep={() => setRemoving(null)}
        onRemove={() => {
          if (removing) {
            dispatch({ type: 'removeSection', section: removing })
          }
          setRemoving(null)
        }}
      />
    </>
  )
}

/** The Spells and Powers sections: the same rows, with a Limits field for powers (ux.md sections 25.4 and 25.5). */
function SpellRows({ state, dispatch, errorOf, list }: SectionFieldsProps & { list: 'spells' | 'powers' }) {
  const rows = state[list]
  if (!rows) {
    return null
  }
  const isPower = list === 'powers'

  return (
    <RepeatingRows
      item={isPower ? 'power' : 'spell'}
      items={list}
      count={rows.length}
      addButtonId={addRowButtonId(list)}
      onAdd={() => dispatch({ type: isPower ? 'addPower' : 'addSpell' })}
    >
      {rows.map((row, index) => (
        <SpellRowFields
          key={row.key}
          list={list}
          item={isPower ? 'Power' : 'Spell'}
          index={index}
          row={row}
          errorOf={errorOf}
          onTextChange={(field, value) =>
            isPower ? dispatch({ type: 'setPowerText', index, field, value }) : field !== 'limits' && dispatch({ type: 'setSpellText', index, field, value })
          }
          onRemove={() => dispatch({ type: isPower ? 'removePower' : 'removeSpell', index })}
        />
      ))}
    </RepeatingRows>
  )
}
