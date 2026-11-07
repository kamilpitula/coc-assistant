import { useRef, useState } from 'react'

import { useRevealToInvestigators } from '@/scene-play/hooks/useReveals'
import { RevealConflictError, RevealInvestigatorsRefusedError, RevealSceneFinishedError, RevealSubjectRefusedError } from '@/scene-play/services/revealApi'
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

/** A lost write, mirroring the give-conflict wording (specs/scene-play/ux.md sections 21.7 and 22.3). */
export const revealConflictMessage = (title: string): string => `${title} wasn't revealed: the Scene or the Item changed meanwhile.`

/** The message the dialog shows for a failed Reveal, or null when there is no error. */
export function revealRefusalFor(error: unknown, title: string): string | null {
  if (!error) {
    return null
  }
  if (error instanceof RevealSceneFinishedError) {
    return REVEAL_REFUSALS.finished
  }
  if (error instanceof RevealConflictError) {
    return revealConflictMessage(title)
  }
  if (error instanceof RevealSubjectRefusedError) {
    return REVEAL_REFUSALS.subject
  }
  return error instanceof RevealInvestigatorsRefusedError ? REVEAL_REFUSALS.investigators : revealFailureMessage(title)
}

interface RevealFlowCallbacks {
  /** The page's status message: "{title} revealed to {names}." plus " Moved to Revealed." when the subject completed. */
  onRevealed: (message: string) => void
  /** The Scene was finished meanwhile and the dialog was closed: the page refetches and focuses its heading. */
  onSceneFinished: () => void
  /** A 400 refusal: the page refetches the Active Scene (and its material). */
  onRefetch: () => void
}

/** What the dialog opener knows: the fallback focus chain and the completion baseline (specs/scene-play/ux.md 21.7). */
export interface RevealOpenContext {
  /** Investigators that already received the target when the dialog opened. */
  alreadyRevealedIds: string[]
  /** Element ids to try in order when the trigger is gone: next title, previous title, sub-tab h2. */
  fallbackIds: string[]
}

/**
 * The Keeper's reveal dialog flow (specs/scene-play/ux.md sections 13 and 21.7): which subject is being revealed, the Reveal in flight, the
 * refusal to show, and where focus goes when the dialog closes. A finished-scene 409 leads to the no-Active-Scene state when the dialog
 * is closed; a 400 or a lost-write 409 refetches the Scene and keeps the dialog open.
 */
export function useRevealFlow(campaignId: string, present: InvestigatorPresent[] = [], callbacks: RevealFlowCallbacks) {
  const reveal = useRevealToInvestigators(campaignId)
  const [target, setTarget] = useState<RevealTarget | null>(null)
  const triggerId = useRef<string | null>(null)
  const context = useRef<RevealOpenContext>({ alreadyRevealedIds: [], fallbackIds: [] })

  const open = (next: RevealTarget, nextContext: RevealOpenContext = { alreadyRevealedIds: [], fallbackIds: [] }) => {
    reveal.reset()
    triggerId.current = next.triggerId
    context.current = nextContext
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
    const received = new Set([...context.current.alreadyRevealedIds, ...investigatorIds])
    const completed = present.every((investigator) => received.has(investigator.id))
    reveal.mutate(
      { subjectType: target.subjectType, subjectId: target.subjectId, investigatorIds },
      {
        onSuccess: () => {
          setTarget(null)
          callbacks.onRevealed(completed ? `${target.title} revealed to ${names}. Moved to Revealed.` : `${target.title} revealed to ${names}.`)
        },
        onError: (error) => {
          if (error instanceof RevealSubjectRefusedError || error instanceof RevealInvestigatorsRefusedError || error instanceof RevealConflictError) {
            callbacks.onRefetch()
          }
        },
      },
    )
  }

  /**
   * Focus returns to the "Reveal..." button that opened the dialog; when the subject left its list the trigger is gone, so focus
   * moves to the next entry's title, then the previous one, then the sub-tab h2, and never lands on body (SPL-A11Y-17).
   */
  const returnFocus = (event: Event) => {
    event.preventDefault()
    const ids = [triggerId.current, ...context.current.fallbackIds].filter((id): id is string => id !== null)
    for (const id of ids) {
      const element = document.getElementById(id)
      if (element) {
        element.focus()
        return
      }
    }
  }

  return { target, open, cancel, confirm, returnFocus, pending: reveal.isPending, refusal: target ? revealRefusalFor(reveal.error, target.title) : null }
}
