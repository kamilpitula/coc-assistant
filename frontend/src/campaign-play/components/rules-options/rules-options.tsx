import { CircleAlert } from 'lucide-react'
import { useRef, useState, type FormEvent, type ReactNode } from 'react'

import { CreationMethodsFieldset } from '@/campaign-play/components/creation-methods-fieldset/creation-methods-fieldset'
import {
  formatCreationMethods,
  NO_CREATION_METHOD_MESSAGE,
} from '@/campaign-play/components/creation-methods-fieldset/creationMethodLabels'
import { useCampaign, useChangeAllowedCreationMethods } from '@/campaign-play/hooks/useCampaign'
import type { Campaign, CreationMethod } from '@/campaign-play/types/Campaign'
import { Button } from '@/shared/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/shared/components/ui/dialog'

const UPDATED_MESSAGE = 'Creation methods updated.'

interface RulesOptionsProps {
  campaignId: string
}

/**
 * Keeper-only read-out of the Campaign's Era and allowed Creation Methods, with an edit dialog
 * (specs/character-sheet/ux.md section 3.1). Renders nothing for anyone the API does not treat as the Keeper.
 */
export function RulesOptions({ campaignId }: RulesOptionsProps) {
  const campaign = useCampaign(campaignId)

  if (campaign.isError) {
    return (
      <RulesOptionsSection>
        <p role="alert" className="flex items-center gap-1 text-sm text-destructive">
          <CircleAlert aria-hidden="true" className="size-4 shrink-0" />
          We couldn&apos;t load the rules options.
        </p>
      </RulesOptionsSection>
    )
  }

  if (campaign.data?.role !== 'Keeper') {
    return null
  }

  return <KeeperRulesOptions campaign={campaign.data} />
}

function RulesOptionsSection({ children }: { children: ReactNode }) {
  return (
    <section aria-labelledby="rules-options-heading" className="mx-auto flex max-w-md flex-col gap-3">
      <h2 id="rules-options-heading" className="text-xl font-semibold">
        Rules options
      </h2>
      {children}
    </section>
  )
}

function KeeperRulesOptions({ campaign }: { campaign: Campaign }) {
  const [statusMessage, setStatusMessage] = useState('')

  return (
    <RulesOptionsSection>
      <p className="text-sm">Era: {campaign.era}</p>
      <p className="text-sm">Creation methods: {formatCreationMethods(campaign.allowedCreationMethods)}</p>
      <EditCreationMethodsDialog
        campaign={campaign}
        onOpen={() => setStatusMessage('')}
        onSaved={() => setStatusMessage(UPDATED_MESSAGE)}
      />
      <p role="status" className="text-sm">
        {statusMessage}
      </p>
    </RulesOptionsSection>
  )
}

interface EditCreationMethodsDialogProps {
  campaign: Campaign
  onOpen: () => void
  onSaved: () => void
}

function EditCreationMethodsDialog({ campaign, onOpen, onSaved }: EditCreationMethodsDialogProps) {
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState<CreationMethod[]>(campaign.allowedCreationMethods)
  const [error, setError] = useState<string>()
  const firstCheckboxRef = useRef<HTMLButtonElement>(null)
  const change = useChangeAllowedCreationMethods(campaign.id)

  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen) {
      setDraft(campaign.allowedCreationMethods)
      setError(undefined)
      change.reset()
      onOpen()
    }
    setOpen(nextOpen)
  }

  const handleSave = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (draft.length === 0) {
      setError(NO_CREATION_METHOD_MESSAGE)
      firstCheckboxRef.current?.focus()
      return
    }

    change.mutate(draft, {
      onSuccess: () => {
        setOpen(false)
        onSaved()
      },
    })
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" className="self-start">
          Edit creation methods
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit creation methods</DialogTitle>
          <DialogDescription>
            Players with a draft that uses a method you turn off will need to switch method before
            submitting.
          </DialogDescription>
        </DialogHeader>
        <form className="flex flex-col gap-4" onSubmit={handleSave} noValidate>
          <CreationMethodsFieldset
            value={draft}
            onChange={setDraft}
            error={error}
            disabled={change.isPending}
            firstCheckboxRef={firstCheckboxRef}
          />
          {change.isError && (
            <p role="alert" className="flex items-center gap-1 text-sm text-destructive">
              <CircleAlert aria-hidden="true" className="size-4 shrink-0" />
              We couldn&apos;t save the creation methods. Try again.
            </p>
          )}
          <DialogFooter className="gap-2">
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" disabled={change.isPending}>
              {change.isPending ? 'Saving…' : 'Save'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
