import { Link, useNavigate } from '@tanstack/react-router'
import type { ReactNode } from 'react'

import '@/campaign-play/types/navigationState'
import { HandoutForm } from '@/scenario-preparation/components/handout-form/handout-form'
import { useCreateHandout } from '@/scenario-preparation/hooks/useHandouts'
import { HandoutNotFoundError, HandoutValidationError } from '@/scenario-preparation/services/handoutApi'
import { HANDOUT_SCENE_FINISHED_MEANWHILE, type HandoutFormValues } from '@/scenario-preparation/services/handoutForm'
import { describeHandoutOwner, type HandoutOwner } from '@/scenario-preparation/services/handoutOwner'
import { SceneFinishedError } from '@/scenario-preparation/services/sceneApi'
import type { HandoutOwnerContext } from '@/scenario-preparation/types/HandoutOwnerContext'
import { buttonVariants } from '@/shared/components/ui/button'

const EMPTY_HANDOUT: HandoutFormValues = { title: '', kind: null, visibility: null, content: null }

interface AddHandoutPageProps {
  /** The Scene or Item that gets the Handout; the caller has already checked that the viewer is the Keeper. */
  owner: HandoutOwner
  context: HandoutOwnerContext
  /** Shown when the owner turns out to be gone: the not-found page of the owner's type. */
  ownerNotFound: ReactNode
}

function failureMessageFor(error: unknown): string | null {
  if (!error || error instanceof HandoutValidationError) {
    return null
  }
  return error instanceof SceneFinishedError ? HANDOUT_SCENE_FINISHED_MEANWHILE : "We couldn't add the Handout. Try again."
}

/**
 * "Add Handout" (specs/scenario-preparation/ux.md sections 43 and 65). An owner that can not be changed gets the sentence that says
 * so instead of the form; an owner that has gone gets its not-found page.
 */
export function AddHandoutPage({ owner, context, ownerNotFound }: AddHandoutPageProps) {
  const creating = useCreateHandout(owner)
  const navigate = useNavigate()
  const pages = describeHandoutOwner(owner)

  if (creating.error instanceof HandoutNotFoundError) {
    return ownerNotFound
  }

  const backToOwner = (
    <Link {...pages.ownerPage} className={buttonVariants({ variant: 'link', className: 'px-0' })}>
      {context.canChange ? 'Cancel' : context.backLabel}
    </Link>
  )

  if (!context.canChange) {
    return (
      <div className="flex flex-col items-start gap-4">
        <h1 className="text-2xl font-semibold">Add Handout</h1>
        <p className="text-sm text-muted-foreground">{context.lockedMessage}</p>
        {backToOwner}
      </div>
    )
  }

  const validationError = creating.error instanceof HandoutValidationError ? creating.error : null

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">Add Handout</h1>
        <p className="text-sm break-words text-muted-foreground">
          {context.ownerLabel}: {context.ownerName}
        </p>
      </div>
      <HandoutForm
        initialValues={EMPTY_HANDOUT}
        submitLabel="Add Handout"
        busyLabel="Adding..."
        pending={creating.isPending}
        failureMessage={failureMessageFor(creating.error)}
        serverErrors={validationError?.fieldErrors}
        cancel={backToOwner}
        onSubmit={(input) =>
          creating.mutate(input, {
            onSuccess: (handout) =>
              void navigate({ ...pages.ownerPage, state: { statusMessage: `${handout.title} added.`, focusHandoutId: handout.id } }),
          })
        }
      />
    </div>
  )
}
