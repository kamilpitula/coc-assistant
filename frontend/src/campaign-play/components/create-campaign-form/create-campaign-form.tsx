import { useId, useState, type FormEvent } from 'react'
import { z } from 'zod'

import { useCreateCampaign } from '@/campaign-play/hooks/useCreateCampaign'
import { Button } from '@/shared/components/ui/button'
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
})

type CreateCampaignFormErrors = Partial<Record<'name' | 'playerLimit', string>>

function toFieldErrors(issues: z.core.$ZodIssue[]): CreateCampaignFormErrors {
  const errors: CreateCampaignFormErrors = {}
  for (const issue of issues) {
    const field = issue.path[0]
    if ((field === 'name' || field === 'playerLimit') && !errors[field]) {
      errors[field] = issue.message
    }
  }
  return errors
}

/** Lets a signed-in Keeper name a new Campaign, set its Player limit, and confirms their ownership. */
export function CreateCampaignForm() {
  const nameFieldId = useId()
  const nameErrorId = useId()
  const playerLimitFieldId = useId()
  const playerLimitErrorId = useId()
  const [name, setName] = useState('')
  const [playerLimit, setPlayerLimit] = useState(String(DEFAULT_PLAYER_LIMIT))
  const [validationErrors, setValidationErrors] = useState<CreateCampaignFormErrors>({})
  const { mutate, isPending, isSuccess, isError, data } = useCreateCampaign()

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const result = createCampaignFormSchema.safeParse({ name, playerLimit })
    if (!result.success) {
      setValidationErrors(toFieldErrors(result.error.issues))
      return
    }

    setValidationErrors({})
    mutate(result.data)
  }

  return (
    <section className="mx-auto flex max-w-md flex-col gap-6">
      <h1 className="text-2xl font-semibold">Create a Campaign</h1>

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

        <Button type="submit" disabled={isPending}>
          {isPending ? 'Creating…' : 'Create Campaign'}
        </Button>
      </form>

      {isSuccess && data && (
        <p role="status" className="text-sm">
          Campaign &ldquo;{data.name}&rdquo; created for up to {data.playerLimit} Players. You are
          its Keeper.{' '}
          <a
            href={`/campaigns/${data.id}`}
            className="text-primary underline-offset-4 hover:underline"
          >
            Manage its invite
          </a>
          .
        </p>
      )}

      {isError && (
        <p role="alert" className="text-sm text-destructive">
          Could not create the Campaign. Please try again.
        </p>
      )}
    </section>
  )
}
