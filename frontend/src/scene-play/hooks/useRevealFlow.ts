import { useRef, useState } from 'react'

import { useRevealToInvestigators } from '@/scene-play/hooks/useReveals'
import { RevealInvestigatorsRefusedError, RevealSceneFinishedError, RevealSubjectRefusedError } from '@/scene-play/services/revealApi'
import { joinNames } from '@/scene-play/services/revealPresentation'
import type { InvestigatorPresent } from '@/scene-play/types/ActiveScene'
import type { RevealSubjectType } from '@/scene-play/types/Reveal'

/** What the Keeper is revealing: the subject, its title and summary line, and the id of the button that opened the dialog. */
export interface RevealTarget {
  subjectType: RevealSubjectType
  subjectId: string
  title: string
  /** "Read-aloud . Player-facing" style line for the dialog. */
  summary: string
  triggerId: string
}

export const REVEAL_REFUSALS = {
  finished: 'This Scene has been finished, so nothing more can be revealed.',
  subject: "This can't be revealed any more. It may have been changed or removed.",
  investigators: 'One of these Investigators is no longer present. Check the list and try again.',
} as const

export const revealFailureMessage = (title: string): string => `We couldn't reveal ${title}. Try again.`

/** The message the dialog shows for a failed Reveal, or null when there is no error. */
export function revealRefusalFor(error: unknown, title: string): string | null {
  if (!error) {
    return null
  }
  if (error instanceof RevealSceneFinishedError) {
    return REVEAL_REFUSALS.finished
  }
  if (error instanceof RevealSubjectRefusedError) {
    return REVEAL_REFUSALS.subject
  }
  return error instanceof RevealInvestigatorsRefusedError ? REVEAL_REFUSALS.investigators : revealFailureMessage(title)
}

interface RevealFlowCallbacks {
  /** The page's status message: "{title} revealed to {names}.". */
  onRevealed: (message: string) => void
  /** The Scene was finished meanwhile and the dialog was closed: the page refetches and focuses its heading. */
  onSceneFinished: () => void
  /** A 400 refusal: the page refetches the Active Scene (and its material). */
  onRefetch: () => void
}

/**
 * The Keeper's reveal dialog flow (specs/scene-play/ux.md section 13): which subject is being revealed, the Reveal in flight, the
 * refusal to show, and where focus goes when the dialog closes. A 409 leads to the no-Active-Scene state when the dialog is closed;
 * a 400 refetches the Scene and keeps the dialog open.
 */
export function useRevealFlow(campaignId: string, present: InvestigatorPresent[], callbacks: RevealFlowCallbacks) {
  const reveal = useRevealToInvestigators(campaignId)
  const [target, setTarget] = useState<RevealTarget | null>(null)
  const triggerId = useRef<string | null>(null)

  const open = (next: RevealTarget) => {
    reveal.reset()
    triggerId.current = next.triggerId
    setTarget(next)
  }

  const cancel = () => {
    const finished = reveal.error instanceof RevealSceneFinishedError
    reveal.reset()
    setTarget(null)
    if (finished) {
      triggerId.current = null
      callbacks.onSceneFinished()
    }
  }

  const confirm = (investigatorIds: string[]) => {
    if (!target) {
      return
    }
    const names = joinNames(present.filter((investigator) => investigatorIds.includes(investigator.id)).map((investigator) => investigator.name))
    reveal.mutate(
      { subjectType: target.subjectType, subjectId: target.subjectId, investigatorIds },
      {
        onSuccess: () => {
          setTarget(null)
          callbacks.onRevealed(`${target.title} revealed to ${names}.`)
        },
        onError: (error) => {
          if (error instanceof RevealSubjectRefusedError || error instanceof RevealInvestigatorsRefusedError) {
            callbacks.onRefetch()
          }
        },
      },
    )
  }

  /** Focus returns to the "Reveal..." button that opened the dialog, unless the Scene is gone. */
  const returnFocus = (event: Event) => {
    event.preventDefault()
    if (triggerId.current) {
      document.getElementById(triggerId.current)?.focus()
    }
  }

  return { target, open, cancel, confirm, returnFocus, pending: reveal.isPending, refusal: target ? revealRefusalFor(reveal.error, target.title) : null }
}
