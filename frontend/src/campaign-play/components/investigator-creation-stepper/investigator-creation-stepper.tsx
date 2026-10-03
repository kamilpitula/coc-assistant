import { CircleCheck, TriangleAlert } from 'lucide-react'

import { WIZARD_STEPS, type StepState, type WizardStep } from '@/campaign-play/services/wizardProgress'

interface InvestigatorCreationStepperProps {
  campaignId: string
  current: WizardStep
  states: Record<WizardStep, StepState>
  /** Called when the Player picks a step; the wizard saves before it navigates (ux.md section 5.1). */
  onSelect: (step: WizardStep) => void
}

const statusText: Record<StepState, string> = {
  completed: ', completed',
  needsAttention: ', needs attention',
  notStarted: ', not started',
}

/** The creation steps (specs/character-sheet/ux.md section 4.1; A11Y-2). Not-started steps can't be opened (UX-6). */
export function InvestigatorCreationStepper({ campaignId, current, states, onSelect }: InvestigatorCreationStepperProps) {
  return (
    <nav aria-label="Investigator creation steps">
      <ol className="flex gap-2 overflow-x-auto pb-1 text-sm">
        {WIZARD_STEPS.map((step) => {
          const state = states[step.id]
          return (
            <li key={step.id} className="flex min-h-6 shrink-0 items-center rounded-md border px-3 py-1.5">
              {step.id === current ? (
                <span aria-current="step" className="font-semibold">
                  {step.label}
                </span>
              ) : state === 'notStarted' ? (
                <span className="text-muted-foreground">
                  {step.label}
                  <span className="sr-only">{statusText.notStarted}</span>
                </span>
              ) : (
                <a
                  href={`/campaigns/${campaignId}/investigator/${step.id}`}
                  data-wizard-action
                  className="flex items-center gap-1 underline underline-offset-4"
                  onClick={(event) => {
                    event.preventDefault()
                    onSelect(step.id)
                  }}
                >
                  {state === 'completed' ? (
                    <CircleCheck aria-hidden="true" className="size-4" />
                  ) : (
                    <TriangleAlert aria-hidden="true" className="size-4 text-warning" />
                  )}
                  {step.label}
                  <span className="sr-only">{statusText[state]}</span>
                </a>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
