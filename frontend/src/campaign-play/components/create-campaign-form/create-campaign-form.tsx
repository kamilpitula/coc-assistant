import { Link, useNavigate } from '@tanstack/react-router'
import { useEffect, useId, useRef, useState, type FormEvent } from 'react'
import { z } from 'zod'

import { NO_CREATION_METHOD_MESSAGE } from '@/campaign-play/components/creation-methods-fieldset/creationMethodLabels'
import { RulesOptionsCollapsible } from '@/campaign-play/components/rules-options-collapsible/rules-options-collapsible'
import { useCreateCampaign } from '@/campaign-play/hooks/useCreateCampaign'
import { creationMethodSchema, eraSchema } from '@/campaign-play/services/campaignApi'
import { CREATION_METHODS, DEFAULT_ERA, type CreationMethod } from '@/campaign-play/types/Campaign'
import { Button, buttonVariants } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'

const DEFAULT_PLAYER_LIMIT = 8
const MIN_PLAYER_LIMIT = 1
const MAX_PLAYER_LIMIT = 16
const playerLimitMessage = `Player limit must be between ${MIN_PLAYER_LIMIT} and ${MAX_PLAYER_LIMIT}`

const createCampaignFormSchema = z.object({
  name: z.string().trim().min(1, 'Campaign name is required'),
  playerLimit: z.coerce
    .number()
    .int(playerLimitMessage)
    .min(MIN_PLAYER_LIMIT, playerLimitMessage)
    .max(MAX_PLAYER_LIMIT, playerLimitMessage),
  era: eraSchema,
  allowedCreationMethods: z.array(creationMethodSchema).min(1, NO_CREATION_METHOD_MESSAGE),
})

const formFields = ['name', 'playerLimit', 'allowedCreationMethods'] as const

type FormField = (typeof formFields)[number]

type CreateCampaignFormErrors = Partial<Record<FormField, string>>

function isFormField(field: PropertyKey | undefined): field is FormField {
  return formFields.some((known) => known === field)
}

function toFieldErrors(issues: z.core.$ZodIssue[]): CreateCampaignFormErrors {
  const errors: CreateCampaignFormErrors = {}
  for (const issue of issues) {
    const field = issue.path[0]
    if (isFormField(field) && !errors[field]) {
      errors[field] = issue.message
    }
  }
  return errors
}

/**
 * Lets a signed-in Keeper name a new Campaign and set its Player limit and rules options, then opens the new Campaign's
 * overview in place of the form (specs/campaign-list/ux.md section 5).
 */
export function CreateCampaignForm() {
  const nameFieldId = useId()
  const nameErrorId = useId()
  const playerLimitFieldId = useId()
  const playerLimitErrorId = useId()
  const [name, setName] = useState('')
  const [playerLimit, setPlayerLimit] = useState(String(DEFAULT_PLAYER_LIMIT))
  const [allowedCreationMethods, setAllowedCreationMethods] = useState<CreationMethod[]>([
    ...CREATION_METHODS,
  ])
  const [rulesOptionsOpen, setRulesOptionsOpen] = useState(false)
  const [creationMethodsFocusRequest, setCreationMethodsFocusRequest] = useState(0)
  const firstCreationMethodRef = useRef<HTMLButtonElement>(null)
  const [validationErrors, setValidationErrors] = useState<CreateCampaignFormErrors>({})
  const { mutate, isPending, isSuccess, isError, data } = useCreateCampaign()
  const navigate = useNavigate()

  // Replace, so Back from the new overview returns to the Campaign List rather than to a filled-out form.
  useEffect(() => {
    if (isSuccess && data) {
      void navigate({ to: '/campaigns/$campaignId', params: { campaignId: data.id }, replace: true })
    }
  }, [isSuccess, data, navigate])

  // Runs after the expanded Rules options section has rendered its checkboxes.
  useEffect(() => {
    if (creationMethodsFocusRequest > 0) {
      firstCreationMethodRef.current?.focus()
    }
  }, [creationMethodsFocusRequest])

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const result = createCampaignFormSchema.safeParse({
      name,
      playerLimit,
      era: DEFAULT_ERA,
      allowedCreationMethods,
    })
    if (!result.success) {
      const errors = toFieldErrors(result.error.issues)
      setValidationErrors(errors)
      if (errors.allowedCreationMethods) {
        setRulesOptionsOpen(true)
        setCreationMethodsFocusRequest((request) => request + 1)
      }
      return
    }

    setValidationErrors({})
    mutate(result.data)
  }

  return (
    <section className="mx-auto flex max-w-md flex-col gap-6">
      <h1 className="text-2xl font-semibold">New campaign</h1>

      <form className="flex flex-col gap-4" onSubmit={handleSubmit} noValidate>
        <div className="flex flex-col gap-2">
          <label htmlFor={nameFieldId} className="text-sm font-medium">
            Campaign name
          </label>
          <Input
            id={nameFieldId}
            value={name}
            onChange={(event) => setName(event.target.value)}
            aria-invalid={validationErrors.name !== undefined}
            aria-describedby={validationErrors.name ? nameErrorId : undefined}
            disabled={isPending}
          />
          {validationErrors.name && (
            <p id={nameErrorId} role="alert" className="text-sm text-destructive">
              {validationErrors.name}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor={playerLimitFieldId} className="text-sm font-medium">
            Player limit
          </label>
          <Input
            id={playerLimitFieldId}
            type="number"
            inputMode="numeric"
            min={MIN_PLAYER_LIMIT}
            max={MAX_PLAYER_LIMIT}
            value={playerLimit}
            onChange={(event) => setPlayerLimit(event.target.value)}
            aria-invalid={validationErrors.playerLimit !== undefined}
            aria-describedby={validationErrors.playerLimit ? playerLimitErrorId : undefined}
            disabled={isPending}
          />
          {validationErrors.playerLimit && (
            <p id={playerLimitErrorId} role="alert" className="text-sm text-destructive">
              {validationErrors.playerLimit}
            </p>
          )}
        </div>

        <RulesOptionsCollapsible
          open={rulesOptionsOpen}
          onOpenChange={setRulesOptionsOpen}
          allowedCreationMethods={allowedCreationMethods}
          onAllowedCreationMethodsChange={setAllowedCreationMethods}
          error={validationErrors.allowedCreationMethods}
          disabled={isPending}
          firstCheckboxRef={firstCreationMethodRef}
        />

        <Button type="submit" disabled={isPending}>
          {isPending ? 'Creating…' : 'Create Campaign'}
        </Button>
        <Link to="/campaigns" className={buttonVariants({ variant: 'link', className: 'self-start px-0' })}>
          Cancel
        </Link>
      </form>

      {isError && (
        <p role="alert" className="text-sm text-destructive">
          Could not create the Campaign. Please try again.
        </p>
      )}
    </section>
  )
}
