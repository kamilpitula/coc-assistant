import { useEffect, useId, useReducer, useRef, useState, type Dispatch, type FormEvent } from 'react'

import { WizardField } from '@/campaign-play/components/wizard-field/wizard-field'
import { WizardTextarea } from '@/campaign-play/components/wizard-textarea/wizard-textarea'
import { useOccupationCatalog, useSkillCatalog } from '@/campaign-play/hooks/useRuleData'
import { AddSectionGroup } from '@/scenario-preparation/components/add-section-group/add-section-group'
import { FormErrorSummary } from '@/scenario-preparation/components/form-error-summary/form-error-summary'
import { NpcCharacteristicsFields } from '@/scenario-preparation/components/npc-characteristics-fields/npc-characteristics-fields'
import { NpcCombatFields } from '@/scenario-preparation/components/npc-combat-fields/npc-combat-fields'
import { NpcSkillRows } from '@/scenario-preparation/components/npc-skill-rows/npc-skill-rows'
import { NpcSpellRows } from '@/scenario-preparation/components/npc-spell-rows/npc-spell-rows'
import { ProfileSection } from '@/scenario-preparation/components/profile-section/profile-section'
import { RemoveSectionDialog } from '@/scenario-preparation/components/remove-section-dialog/remove-section-dialog'
import { StickyFormActions } from '@/scenario-preparation/components/sticky-form-actions/sticky-form-actions'
import {
  controlIdFor,
  identityErrors,
  inputFromState,
  messageFor,
  SECTION_LABELS,
  SECTION_ORDER,
  sectionHasValues,
  stateFromHumanNpc,
  summaryProblems,
  humanNpcFormReducer,
  type DetailKey,
  type HumanNpcFormAction,
  type HumanNpcFormState,
  type SectionFieldsProps,
  type SectionName,
} from '@/scenario-preparation/services/humanNpcForm'
import type { HumanNpc, HumanNpcInput, ValidationProblem } from '@/scenario-preparation/types/HumanNpc'
import { RichTextEditor } from '@/shared/components/rich-text-editor/rich-text-editor'
import { Alert } from '@/shared/components/ui/alert'
import { Button } from '@/shared/components/ui/button'
import { Label } from '@/shared/components/ui/label'
import { useUnsavedChangesPrompt } from '@/shared/hooks/useUnsavedChangesPrompt'
import type { RichTextDocument } from '@/shared/types/RichText'

const NOTES_HINT = 'Only you can read these. You can format text and add links.'

const NARRATIVE_FIELDS: [DetailKey, string][] = [
  ['shortDescription', 'Short description'],
  ['goal', 'Goal'],
  ['relationshipToInvestigators', 'Relationship to the Investigators'],
  ['knowledge', 'What the Human NPC knows'],
  ['secrets', 'What the Human NPC hides'],
  ['behaviorCue', 'Behavior cue'],
]

interface HumanNpcFormProps {
  campaignId: string
  humanNpc: HumanNpc
  pending: boolean
  /** The refused values of the last save, keyed by lower-cased request path (ADR 0018). */
  problems: ValidationProblem[]
  /** The last save failed for a reason other than validation. */
  failureMessage: string | null
  onSubmit: (input: HumanNpcInput) => void
  onCancel: () => void
}

/**
 * The whole-profile Human NPC editor (specs/scenario-preparation/ux.md sections 25.2 and 25.4): Details, the added
 * sections, "Add a section", Keeper notes, and a sticky Save and Cancel bar. The client checks only Name and Age; every
 * other rule is the server's and arrives as `problems`.
 */
export function HumanNpcForm({ campaignId, humanNpc, pending, problems, failureMessage, onSubmit, onCancel }: HumanNpcFormProps) {
  const [state, dispatch] = useReducer(humanNpcFormReducer, humanNpc, stateFromHumanNpc)
  const [initialJson] = useState(() => JSON.stringify(inputFromState(stateFromHumanNpc(humanNpc), null)))
  const [clientErrors, setClientErrors] = useState<Record<string, string>>({})
  const [notesChanged, setNotesChanged] = useState(false)
  const notes = useRef<RichTextDocument | null>(humanNpc.keeperNotes)
  const summaryRef = useRef<HTMLDivElement>(null)
  const notesIds = { label: useId(), hint: useId(), error: useId() }
  const skillCatalog = useSkillCatalog(campaignId)

  const isDirty = notesChanged || JSON.stringify(inputFromState(state, null)) !== initialJson
  useUnsavedChangesPrompt(isDirty)
  useFocusTarget(state, dispatch)
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

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const errors = identityErrors(state)
    if (errors.name || errors.age) {
      setClientErrors(errors as Record<string, string>)
      document.getElementById(controlIdFor(errors.name ? 'name' : 'age'))?.focus()
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
      {summary.length > 0 && (
        <FormErrorSummary ref={summaryRef} problems={summary} onSelect={(path) => document.getElementById(controlIdFor(path))?.focus()} />
      )}
      <DetailsFields {...sectionProps} campaignId={campaignId} />
      <OptionalSections {...sectionProps} skillCatalog={skillCatalog.data} catalogFailed={skillCatalog.isError} onRetryCatalog={() => void skillCatalog.refetch()} />
      <div className="flex flex-col gap-2">
        <Label id={notesIds.label} htmlFor={controlIdFor('keeperNotes')}>
          Keeper notes
        </Label>
        <RichTextEditor
          id={controlIdFor('keeperNotes')}
          labelledBy={notesIds.label}
          describedBy={errorOf('keeperNotes') ? `${notesIds.hint} ${notesIds.error}` : notesIds.hint}
          invalid={Boolean(errorOf('keeperNotes'))}
          initialValue={humanNpc.keeperNotes}
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

/** Moves focus to the control a change names (a new section's first field, the next row, an Add button), then clears it. */
function useFocusTarget(state: HumanNpcFormState, dispatch: Dispatch<HumanNpcFormAction>): void {
  useEffect(() => {
    if (state.focusTarget) {
      document.getElementById(state.focusTarget)?.focus()
      dispatch({ type: 'clearFocus' })
    }
  }, [state.focusTarget, dispatch])
}

/** Focuses the error summary each time a refused save brings new problems (SP-A11Y-20). */
function useFocusOnce(summaryRef: React.RefObject<HTMLDivElement | null>, problems: ValidationProblem[]): void {
  useEffect(() => {
    if (problems.length > 0) {
      summaryRef.current?.focus()
    }
  }, [problems, summaryRef])
}

function DetailsFields({ state, dispatch, errorOf, campaignId }: SectionFieldsProps & { campaignId: string }) {
  const occupations = useOccupationCatalog(campaignId)

  return (
    <ProfileSection title="Details" mode="edit">
      <div className="flex flex-wrap items-start gap-3">
        <WizardField
          field="name"
          label="Name"
          value={state.name}
          error={errorOf('name')}
          onChange={(value) => dispatch({ type: 'setName', value: value ?? '' })}
          className="min-w-48 flex-1"
        />
        <WizardField
          type="number"
          field="age"
          label="Age"
          help="Any age from 0 to 150."
          value={state.age}
          error={errorOf('age')}
          onChange={(value) => dispatch({ type: 'setAge', value })}
          className="w-32"
        />
      </div>
      <WizardField
        field="details.professionOrRole"
        label="Profession or role"
        help="Choose a suggestion or type your own."
        value={state.details.professionOrRole}
        suggestions={occupations.data?.occupations.map((occupation) => occupation.name) ?? []}
        error={errorOf('details.professionOrRole')}
        onChange={(value) => dispatch({ type: 'setDetail', key: 'professionOrRole', value: value ?? '' })}
      />
      {NARRATIVE_FIELDS.map(([key, label]) => (
        <WizardTextarea
          key={key}
          field={`details.${key}`}
          label={label}
          value={state.details[key] === '' ? null : state.details[key]}
          error={errorOf(`details.${key}`)}
          onChange={(value) => dispatch({ type: 'setDetail', key, value: value ?? '' })}
        />
      ))}
    </ProfileSection>
  )
}

interface OptionalSectionsProps extends SectionFieldsProps {
  skillCatalog: React.ComponentProps<typeof NpcSkillRows>['skillCatalog']
  catalogFailed: boolean
  onRetryCatalog: () => void
}

/** The added sections in their fixed order, with the Remove confirmation and the "Add a section" group. */
function OptionalSections(props: OptionalSectionsProps) {
  const { state, dispatch } = props
  const [removing, setRemoving] = useState<SectionName | null>(null)
  const added = SECTION_ORDER.filter((section) => state[section] !== null)

  const requestRemoval = (section: SectionName) => {
    if (sectionHasValues(state, section)) {
      setRemoving(section)
    } else {
      dispatch({ type: 'removeSection', section })
    }
  }

  return (
    <>
      {added.map((section) => (
        <ProfileSection key={section} title={SECTION_LABELS[section]} mode="edit" onRemove={() => requestRemoval(section)}>
          <SectionContent section={section} {...props} />
        </ProfileSection>
      ))}
      <AddSectionGroup available={SECTION_ORDER.filter((section) => !added.includes(section))} onAdd={(section) => dispatch({ type: 'addSection', section })} />
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

function SectionContent({ section, ...props }: OptionalSectionsProps & { section: SectionName }) {
  switch (section) {
    case 'characteristics':
      return <NpcCharacteristicsFields {...props} />
    case 'skills':
      return <NpcSkillRows {...props} />
    case 'combat':
      return <NpcCombatFields {...props} />
    case 'spells':
      return <NpcSpellRows {...props} />
  }
}
