import { useId } from 'react'

import { BACKSTORY_TEXT_LENGTH_MAX } from '@/campaign-play/components/sheet-backstory-section/sheet-backstory-section'
import { WizardTextarea } from '@/campaign-play/components/wizard-textarea/wizard-textarea'
import type { WizardStepProps } from '@/campaign-play/types/WizardStepProps'

interface SheetGearSectionProps {
  gear: string | null
  /** On the Sheet and submit step: the wizard's inputs and actions. Omit for the read-only sheet. */
  editing?: WizardStepProps
}

/** Gear and possessions as free text (specs/character-sheet/ux.md section 6.7 item 5; docs/game-rules section 11). */
export function SheetGearSection({ gear, editing }: SheetGearSectionProps) {
  const headingId = useId()
  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-3">
      <h2 id={headingId} className="text-xl font-semibold">
        Gear and possessions
      </h2>
      {editing ? (
        <WizardTextarea
          field="gear"
          label="Gear and possessions"
          hideLabel
          value={editing.inputs.gear}
          maxLength={BACKSTORY_TEXT_LENGTH_MAX}
          error={editing.errors.gear}
          onChange={(value) => editing.onAction({ type: 'gear', value })}
          onBlur={editing.onBlur}
        />
      ) : (
        <p className={gear ? 'whitespace-pre-line text-sm' : 'text-sm text-muted-foreground'}>{gear ?? 'None recorded.'}</p>
      )}
    </section>
  )
}
