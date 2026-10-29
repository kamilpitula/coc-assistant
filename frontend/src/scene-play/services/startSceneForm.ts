import { AnotherSceneActiveError, InvestigatorsRefusedError, SceneNotPreparedError } from '@/scene-play/services/activeSceneApi'

export const EMPTY_SELECTION_MESSAGE = 'Choose at least one Investigator present.'

export interface StartErrors {
  present?: string
  finish?: string
}

/** The client checks of the start page (specs/scene-play/ux.md section 2); `activeTitle` is set while another Scene is Active. */
export function validateStart(selection: string[], activeTitle: string | null, finishChecked: boolean): StartErrors {
  const errors: StartErrors = {}
  if (activeTitle !== null && !finishChecked) {
    errors.finish = `Choose to finish ${activeTitle} first, or cancel.`
  }
  if (selection.length === 0) {
    errors.present = EMPTY_SELECTION_MESSAGE
  }
  return errors
}

export type StartRefusalKind = 'not-prepared' | 'another-active' | 'investigators' | 'failed'

export interface StartRefusal {
  kind: StartRefusalKind
  message: string
}

const refusals: Record<StartRefusalKind, string> = {
  'not-prepared': "This Scene has already been started, so it can't be started again.",
  'another-active': 'Another Scene was started meanwhile. Choose whether to finish it first.',
  investigators: "One of these Investigators can't be present. Check the list and try again.",
  failed: "We couldn't start the Scene. Try again.",
}

function kindOf(error: Error): StartRefusalKind {
  if (error instanceof SceneNotPreparedError) {
    return 'not-prepared'
  }
  if (error instanceof AnotherSceneActiveError) {
    return 'another-active'
  }
  return error instanceof InvestigatorsRefusedError ? 'investigators' : 'failed'
}

/** The message for a failed start, or null when nothing failed. */
export function refusalFor(error: Error | null): StartRefusal | null {
  if (!error) {
    return null
  }

  const kind = kindOf(error)
  return { kind, message: refusals[kind] }
}
