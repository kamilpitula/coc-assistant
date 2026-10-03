import { Link } from '@tanstack/react-router'
import { useEffect, useId, useRef, useState, type RefObject } from 'react'

import { useCampaignInvite, useIssueInvite } from '@/campaign-play/hooks/useCampaignInvite'
import { joinLink } from '@/campaign-play/services/joinLink'
import { Button, type buttonVariants } from '@/shared/components/ui/button'
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
import { Input } from '@/shared/components/ui/input'
import { Skeleton } from '@/shared/components/ui/skeleton'

type ButtonVariant = NonNullable<Parameters<typeof buttonVariants>[0]>['variant']

interface InvitePlayersDialogProps {
  campaignId: string
  /** The trigger's look: outline beside "At the table", default in the attention list. */
  variant?: ButtonVariant
}

/**
 * "Invite Players": a shortcut that shows the join link, issuing an Invite first when none is active
 * (specs/campaign-overview/ux.md section 6). Replacing and revoking stay on Settings.
 */
export function InvitePlayersDialog({ campaignId, variant = 'default' }: InvitePlayersDialogProps) {
  const [open, setOpen] = useState(false)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant={variant}>
          Invite Players
        </Button>
      </DialogTrigger>
      {open && <InviteDialogContent campaignId={campaignId} onClose={() => setOpen(false)} />}
    </Dialog>
  )
}

/** Mounted only while open, so opening is what loads the Invite and, when none is active, issues one. */
function InviteDialogContent({ campaignId, onClose }: { campaignId: string; onClose: () => void }) {
  const invite = useCampaignInvite(campaignId)
  const issue = useIssueInvite(campaignId)
  const issueRequested = useRef(false)
  const copyButtonRef = useRef<HTMLButtonElement>(null)
  const busyRef = useRef<HTMLDivElement>(null)
  const token = invite.data?.token ?? issue.data?.token

  useEffect(() => {
    if (invite.isSuccess && invite.data === null && !issueRequested.current) {
      issueRequested.current = true
      issue.mutate()
    }
  }, [invite.isSuccess, invite.data, issue])

  // Once the issued link appears, focus moves from the busy status to "Copy link" (CO-A11Y-6).
  useEffect(() => {
    if (token && !copyButtonRef.current?.contains(document.activeElement)) {
      copyButtonRef.current?.focus()
    }
  }, [token])

  const retry = () => {
    issueRequested.current = false
    issue.reset()
    void invite.refetch()
  }

  return (
    <DialogContent
      onOpenAutoFocus={(event) => {
        event.preventDefault()
        ;(copyButtonRef.current ?? busyRef.current)?.focus()
      }}
    >
      <DialogHeader>
        <DialogTitle>Invite Players</DialogTitle>
        <DialogDescription>Anyone with this link can join until you replace or revoke it.</DialogDescription>
      </DialogHeader>
      <InviteDialogBody
        token={token}
        failed={invite.isError || issue.isError}
        issuing={issue.isPending}
        copyButtonRef={copyButtonRef}
        busyRef={busyRef}
        onRetry={retry}
      />
      <p className="text-sm text-muted-foreground">
        Replace or revoke the link in{' '}
        <Link
          to="/campaigns/$campaignId/settings"
          params={{ campaignId }}
          className="text-foreground underline underline-offset-4"
          onClick={onClose}
        >
          Settings
        </Link>
        .
      </p>
      <DialogFooter>
        <DialogClose asChild>
          <Button type="button" variant="outline">
            Done
          </Button>
        </DialogClose>
      </DialogFooter>
    </DialogContent>
  )
}

interface InviteDialogBodyProps {
  token: string | undefined
  failed: boolean
  issuing: boolean
  copyButtonRef: RefObject<HTMLButtonElement | null>
  busyRef: RefObject<HTMLDivElement | null>
  onRetry: () => void
}

function InviteDialogBody({ token, failed, issuing, copyButtonRef, busyRef, onRetry }: InviteDialogBodyProps) {
  if (token) {
    return <JoinLinkField link={joinLink(token)} copyButtonRef={copyButtonRef} />
  }

  if (failed) {
    return (
      <div className="flex flex-col items-start gap-3">
        <p className="text-sm">We couldn&apos;t create a join link.</p>
        <Button type="button" variant="outline" onClick={onRetry}>
          Try again
        </Button>
      </div>
    )
  }

  if (issuing) {
    return (
      <div ref={busyRef} tabIndex={-1} role="status" aria-busy="true" className="text-sm">
        Creating a join link...
      </div>
    )
  }

  return (
    <div ref={busyRef} tabIndex={-1} aria-busy="true">
      <Skeleton className="h-9 w-full" />
    </div>
  )
}

function JoinLinkField({ link, copyButtonRef }: { link: string; copyButtonRef: RefObject<HTMLButtonElement | null> }) {
  const fieldId = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const [copyResult, setCopyResult] = useState('')

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link)
      setCopyResult('Copied.')
    } catch {
      setCopyResult("Couldn't copy. Select the link and copy it.")
      inputRef.current?.select()
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={fieldId} className="text-sm font-medium">
        Join link
      </label>
      <div className="flex flex-wrap gap-2">
        <Input id={fieldId} ref={inputRef} readOnly value={link} className="min-w-0 flex-1" />
        <Button ref={copyButtonRef} type="button" onClick={() => void copy()}>
          Copy link
        </Button>
      </div>
      <p role="status" className="text-sm empty:hidden">
        {copyResult}
      </p>
    </div>
  )
}
