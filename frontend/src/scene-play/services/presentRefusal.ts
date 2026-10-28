import { InvestigatorsRefusedError, NoActiveSceneError } from '@/scene-play/services/activeSceneApi'

export type PresentRefusalKind = 'finished' | 'investigators' | 'failed'

export interface PresentRefusal {
  kind: PresentRefusalKind
  message: string
}

const messages: Record<PresentRefusalKind, string> = {
  finished: "This Scene has been finished, so who is present can't be changed.",
  investigators: "One of these Investigators can't be present. Check the list and try again.",
  failed: "We couldn't save who is present. Try again.",
}

function kindOf(error: Error): PresentRefusalKind {
  if (error instanceof NoActiveSceneError) {
    return 'finished'
  }
  return error instanceof InvestigatorsRefusedError ? 'investigators' : 'failed'
}

/** The message for a failed change of who is present, or null when nothing failed. */
export function presentRefusalFor(error: Error | null): PresentRefusal | null {
  if (!error) {
    return null
  }

  const kind = kindOf(error)
  return { kind, message: messages[kind] }
}
