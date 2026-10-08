import { ChevronDown } from 'lucide-react'
import { useId } from 'react'

import type { DerivedValues } from '@/campaign-play/types/CharacterSheet'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/shared/components/ui/collapsible'

interface InvestigatorSummaryProps {
  derived: DerivedValues
  /** With Quick fire there are no budgets: how many skill values and personal interests are left (ux.md 4.2). */
  quickFireLeft?: { values: number; interests: number }
  /** The number of errors still on the sheet. */
  problemCount: number
  /** Shows and focuses the error summary. */
  onShowProblems: () => void
}

interface SummaryRow {
  label: string
  value: number | string | null
}

function rows(derived: DerivedValues, quickFireLeft?: { values: number; interests: number }): SummaryRow[] {
  const budgets: SummaryRow[] = quickFireLeft
    ? [
        { label: 'Skill values left', value: quickFireLeft.values },
        { label: 'Personal interests left', value: quickFireLeft.interests },
      ]
    : [
        ...(derived.occupationPoints ? [{ label: 'Occupation points left', value: derived.occupationPoints.left }] : []),
        ...(derived.personalInterestPoints ? [{ label: 'Personal interest points left', value: derived.personalInterestPoints.left }] : []),
      ]
  return [
    { label: 'HP', value: derived.hitPoints },
    { label: 'MP', value: derived.magicPoints },
    { label: 'SAN', value: derived.sanity.current },
    { label: 'Luck', value: derived.luck },
    { label: 'MOV', value: derived.movementRate },
    { label: 'Build', value: derived.build },
    { label: 'Damage Bonus', value: derived.damageBonus },
    { label: 'Dodge', value: derived.dodge },
    ...budgets,
  ]
}

function SummaryList({ derived, quickFireLeft, problemCount, onShowProblems }: InvestigatorSummaryProps) {
  return (
    <>
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
        {rows(derived, quickFireLeft).map((row) => (
          <div key={row.label} className="contents">
            <dt className="text-muted-foreground">{row.label}</dt>
            <dd className="font-medium">
              {row.value ?? (
                <>
                  <span aria-hidden="true">&mdash;</span>
                  <span className="sr-only">not yet calculated</span>
                </>
              )}
            </dd>
          </div>
        ))}
      </dl>
      <p className="mt-3 text-sm">
        {problemCount === 0 ? (
          'No problems'
        ) : (
          <a
            href="#validation-error-summary"
            className="text-destructive underline underline-offset-4"
            onClick={(event) => {
              event.preventDefault()
              onShowProblems()
            }}
          >
            {problemCount === 1 ? '1 problem' : `${problemCount} problems`}
          </a>
        )}
      </p>
    </>
  )
}

/**
 * The summary rail (specs/character-sheet/ux.md section 4.2, with the budget lines of PBI-CP-009): a sticky aside
 * from 1024px, and a collapsed summary below that. Values are the server's, from the latest save.
 */
export function InvestigatorSummary(props: InvestigatorSummaryProps) {
  const headingId = useId()
  const { derived } = props
  const toggleParts = [
    derived.hitPoints === null ? null : `HP ${derived.hitPoints}`,
    derived.sanity.current === null ? null : `SAN ${derived.sanity.current}`,
    derived.occupationPoints && !props.quickFireLeft ? `${derived.occupationPoints.left} points left` : null,
  ].filter(Boolean)

  return (
    <>
      <aside aria-labelledby={headingId} className="sticky top-4 hidden w-72 self-start rounded-lg border p-4 lg:block">
        <h2 id={headingId} className="mb-3 font-semibold">
          Your Investigator
        </h2>
        <SummaryList {...props} />
      </aside>
      <Collapsible className="rounded-lg border p-3 lg:hidden">
        <CollapsibleTrigger className="flex w-full min-h-6 items-center justify-between text-left text-sm font-medium">
          {toggleParts.length > 0 ? `Summary: ${toggleParts.join(', ')}` : 'Summary'}
          <ChevronDown aria-hidden="true" className="size-4" />
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-3">
          <SummaryList {...props} />
        </CollapsibleContent>
      </Collapsible>
    </>
  )
}
