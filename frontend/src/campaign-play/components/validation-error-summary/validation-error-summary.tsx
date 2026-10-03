import { forwardRef } from 'react'

import { fieldId } from '@/campaign-play/services/fieldIds'

export const ERROR_SUMMARY_ID = 'validation-error-summary'

export interface SummaryError {
  field: string
  message: string
}

interface ValidationErrorSummaryProps {
  errors: SummaryError[]
  /** Called with the field a link points to; the caller focuses it or opens the step that owns it. */
  onSelect: (field: string) => void
}

/** "There's a problem" with one link per error (specs/character-sheet/ux.md section 5.2; A11Y-4). */
export const ValidationErrorSummary = forwardRef<HTMLDivElement, ValidationErrorSummaryProps>(
  function ValidationErrorSummary({ errors, onSelect }, ref) {
    return (
      <div
        ref={ref}
        id={ERROR_SUMMARY_ID}
        role="alert"
        tabIndex={-1}
        className="rounded-lg border-2 border-destructive p-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <h2 className="mb-2 font-semibold">There&apos;s a problem</h2>
        <ul className="flex list-disc flex-col gap-1 pl-5">
          {errors.map((error) => (
            <li key={`${error.field}-${error.message}`}>
              <a
                href={`#${fieldId(error.field)}`}
                className="text-destructive underline underline-offset-4"
                onClick={(event) => {
                  event.preventDefault()
                  onSelect(error.field)
                }}
              >
                {error.message}
              </a>
            </li>
          ))}
        </ul>
      </div>
    )
  },
)
