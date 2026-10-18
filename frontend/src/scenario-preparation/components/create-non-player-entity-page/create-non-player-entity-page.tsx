import { Link, useNavigate } from '@tanstack/react-router'
import { useId, useState, type FormEvent } from 'react'

import { useCampaign } from '@/campaign-play/hooks/useCampaign'
import '@/campaign-play/types/navigationState'
import { NonPlayerEntityNotFound } from '@/scenario-preparation/components/non-player-entity-not-found/non-player-entity-not-found'
import { useCreateHumanNpc } from '@/scenario-preparation/hooks/useNonPlayerEntities'
import { NonPlayerEntityValidationError } from '@/scenario-preparation/services/nonPlayerEntityApi'
import {
  CREATE_FIELD_ORDER,
  CREATE_MESSAGES,
  validateCreateNonPlayerEntityForm,
  type CreateNonPlayerEntityErrors,
  type CreateNonPlayerEntityField,
} from '@/scenario-preparation/services/nonPlayerEntityForm'
import type { NonPlayerEntityType } from '@/scenario-preparation/types/NonPlayerEntity'
import { Alert } from '@/shared/components/ui/alert'
import { Button, buttonVariants } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { Label } from '@/shared/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/shared/components/ui/radio-group'
import { useUnsavedChangesPrompt } from '@/shared/hooks/useUnsavedChangesPrompt'

interface CreateNonPlayerEntityPageProps {
  campaignId: string
}

/** The messages for the fields a 400 can refuse on create. */
function serverErrorsOf(error: unknown): CreateNonPlayerEntityErrors {
  if (!(error instanceof NonPlayerEntityValidationError)) {
    return {}
  }
  const paths = error.problems.map((problem) => problem.path)
  return {
    ...(paths.includes('name') ? { name: CREATE_MESSAGES.nameRequired } : {}),
    ...(paths.includes('age') ? { age: CREATE_MESSAGES.ageInvalid } : {}),
  }
}

function describedBy(...ids: (string | false | undefined)[]): string | undefined {
  return ids.filter(Boolean).join(' ') || undefined
}

function FieldMessage({ id, message }: { id: string; message?: string }) {
  return message ? (
    <p id={id} className="text-sm text-destructive">
      {message}
    </p>
  ) : null
}

/**
 * "Create Non-Player Entity" (specs/scenario-preparation/ux.md section 24): a type, a name, and for a Human NPC an age.
 * A Player sees the not-found page and no request is made.
 */
export function CreateNonPlayerEntityPage({ campaignId }: CreateNonPlayerEntityPageProps) {
  const campaign = useCampaign(campaignId)
  const creation = useCreateHumanNpc(campaignId)
  const navigate = useNavigate()
  const ids = { type: useId(), name: useId(), age: useId() }
  const [type, setType] = useState<NonPlayerEntityType | null>(null)
  const [name, setName] = useState('')
  const [age, setAge] = useState('')
  const [clientErrors, setClientErrors] = useState<CreateNonPlayerEntityErrors>({})
  useUnsavedChangesPrompt(type !== null || name !== '' || age !== '')

  if (campaign.data?.role !== 'Keeper') {
    return <NonPlayerEntityNotFound campaignId={campaignId} />
  }

  const errors: CreateNonPlayerEntityErrors = { ...serverErrorsOf(creation.error), ...clientErrors }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const result = validateCreateNonPlayerEntityForm({ type, name, age })
    if (!result.success) {
      setClientErrors(result.errors)
      const first: CreateNonPlayerEntityField | undefined = CREATE_FIELD_ORDER.find((field) => result.errors[field])
      document.getElementById(first ? ids[first] : '')?.focus()
      return
    }

    setClientErrors({})
    creation.mutate(
      { name: result.data.name, age: result.data.age ?? 0 },
      {
        onSuccess: (humanNpc) =>
          void navigate({
            to: '/campaigns/$campaignId/human-npcs/$humanNpcId',
            params: { campaignId, humanNpcId: humanNpc.id },
            state: { statusMessage: 'Human NPC created.' },
          }),
      },
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Create Non-Player Entity</h1>
      <form className="flex max-w-2xl flex-col gap-4" onSubmit={handleSubmit} noValidate>
        <TypeFieldset id={ids.type} value={type} error={errors.type} onChange={setType} />
        <div className="flex flex-col gap-2">
          <Label htmlFor={ids.name}>Name</Label>
          <Input
            id={ids.name}
            value={name}
            onChange={(event) => setName(event.target.value)}
            aria-invalid={errors.name ? true : undefined}
            aria-describedby={describedBy(errors.name && `${ids.name}-error`)}
          />
          <FieldMessage id={`${ids.name}-error`} message={errors.name} />
        </div>
        {type === 'HumanNpc' && <AgeField id={ids.age} value={age} error={errors.age} onChange={setAge} />}
        <FailureAlert error={creation.error} />
        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" disabled={creation.isPending}>
            {creation.isPending ? 'Creating...' : 'Create'}
          </Button>
          <Link
            to="/campaigns/$campaignId/non-player-entities"
            params={{ campaignId }}
            className={buttonVariants({ variant: 'link', className: 'px-0' })}
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  )
}

function FailureAlert({ error }: { error: Error | null }) {
  return error && !(error instanceof NonPlayerEntityValidationError) ? (
    <Alert variant="destructive" role="alert">
      We couldn&apos;t create the Non-Player Entity. Try again.
    </Alert>
  ) : null
}

interface TypeFieldsetProps {
  id: string
  value: NonPlayerEntityType | null
  error?: string
  onChange: (value: NonPlayerEntityType) => void
}

/** Mythos Creatures are offered but not yet available (PBI-SP-009 adds their pages), so that option is disabled. */
function TypeFieldset({ id, value, error, onChange }: TypeFieldsetProps) {
  return (
    <fieldset className="flex flex-col gap-2" aria-describedby={describedBy(`${id}-hint`, error && `${id}-error`)}>
      <legend className="text-sm font-medium">Type</legend>
      <RadioGroup value={value ?? ''} onValueChange={(next) => onChange(next as NonPlayerEntityType)} aria-invalid={error ? true : undefined}>
        <div className="flex items-start gap-2">
          <RadioGroupItem id={id} value="HumanNpc" aria-describedby={`${id}-human`} className="mt-1" />
          <div className="flex flex-col">
            <Label htmlFor={id}>Human NPC</Label>
            <span id={`${id}-human`} className="text-sm text-muted-foreground">
              A person.
            </span>
          </div>
        </div>
        <div className="flex items-start gap-2">
          <RadioGroupItem id={`${id}-creature`} value="MythosCreature" disabled aria-describedby={`${id}-creature-description`} className="mt-1" />
          <div className="flex flex-col">
            <Label htmlFor={`${id}-creature`}>Mythos Creature</Label>
            <span id={`${id}-creature-description`} className="text-sm text-muted-foreground">
              A beast, folklore creature, Mythos monster, or unique entity. Not available yet.
            </span>
          </div>
        </div>
      </RadioGroup>
      <p id={`${id}-hint`} className="text-sm text-muted-foreground">
        You can&apos;t change the type later.
      </p>
      <FieldMessage id={`${id}-error`} message={error} />
    </fieldset>
  )
}

interface AgeFieldProps {
  id: string
  value: string
  error?: string
  onChange: (value: string) => void
}

function AgeField({ id, value, error, onChange }: AgeFieldProps) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>Age</Label>
      <Input
        id={id}
        inputMode="numeric"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-24"
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(`${id}-hint`, error && `${id}-error`)}
      />
      <p id={`${id}-hint`} className="text-sm text-muted-foreground">
        Any age from 0 to 150.
      </p>
      <FieldMessage id={`${id}-error`} message={error} />
    </div>
  )
}
