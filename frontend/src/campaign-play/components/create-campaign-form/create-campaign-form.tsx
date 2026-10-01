import { useId, useState, type FormEvent } from 'react'
import { z } from 'zod'

import { useCreateCampaign } from '@/campaign-play/hooks/useCreateCampaign'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'

const createCampaignFormSchema = z.object({
  name: z.string().trim().min(1, 'Campaign name is required'),
})

/** Lets a signed-in Keeper name and create a new Campaign, then confirms their ownership. */
export function CreateCampaignForm() {
  const nameFieldId = useId()
  const errorId = useId()
  const [name, setName] = useState('')
  const [validationError, setValidationError] = useState<string | null>(null)
  const { mutate, isPending, isSuccess, isError, data } = useCreateCampaign()

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const result = createCampaignFormSchema.safeParse({ name })
    if (!result.success) {
      setValidationError(result.error.issues[0].message)
      return
    }

    setValidationError(null)
    mutate(result.data.name)
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
            aria-invalid={validationError !== null}
            aria-describedby={validationError ? errorId : undefined}
            disabled={isPending}
          />
          {validationError && (
            <p id={errorId} role="alert" className="text-sm text-destructive">
              {validationError}
            </p>
          )}
        </div>

        <Button type="submit" disabled={isPending}>
          {isPending ? 'Creating…' : 'Create Campaign'}
        </Button>
      </form>

      {isSuccess && data && (
        <p role="status" className="text-sm">
          Campaign &ldquo;{data.name}&rdquo; created. You are its Keeper.{' '}
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
