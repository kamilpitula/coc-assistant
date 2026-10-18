import { forwardRef } from 'react'

import { controlIdFor, type SummaryProblem } from '@/scenario-preparation/services/humanNpcForm'

interface FormErrorSummaryProps {
  problems: SummaryProblem[]
  /** Called with the path of the field a link points to; the caller focuses it. */
  onSelect: (path: string) => void
}

/**
 * "There is 1 problem" / "There are {n} problems" with one link per problem to its field; a problem whose path matches no
 * field is listed without a link (specs/scenario-preparation/ux.md section 25.2; ADR 0018; SP-UX-35, SP-A11Y-20).
 */
export const FormErrorSummary = forwardRef<HTMLDivElement, FormErrorSummaryProps>(function FormErrorSummary({ problems, onSelect }, ref) {
  const heading = problems.length === 1 ? 'There is 1 problem' : `There are ${problems.length} problems`

  return (
    <div
      ref={ref}
      role="alert"
      tabIndex={-1}
      className="rounded-lg border-2 border-destructive p-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <h2 className="mb-2 font-semibold">{heading}</h2>
      <ul className="flex list-disc flex-col gap-1 pl-5">
        {problems.map((problem) => (
          <li key={`${problem.path ?? 'none'}-${problem.message}`}>
            {problem.path === null ? (
              problem.message
            ) : (
              <a
                href={`#${controlIdFor(problem.path)}`}
                className="text-destructive underline underline-offset-4"
                onClick={(event) => {
                  event.preventDefault()
                  onSelect(problem.path as string)
                }}
              >
                {problem.message}
              </a>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
})
