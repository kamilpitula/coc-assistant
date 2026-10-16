import { Link } from '@tanstack/react-router'
import { ArrowDown, ArrowUp } from 'lucide-react'
import { useId, useRef } from 'react'

import { useScenarioReordering } from '@/scenario-preparation/hooks/useScenarioReordering'
import { useScenarios } from '@/scenario-preparation/hooks/useScenarios'
import { moveScenarioButtonId, type MoveDirection } from '@/scenario-preparation/services/scenarioOrder'
import type { Scenario } from '@/scenario-preparation/types/Scenario'
import { Alert } from '@/shared/components/ui/alert'
import { Button, buttonVariants } from '@/shared/components/ui/button'
import { Card } from '@/shared/components/ui/card'
import { Skeleton } from '@/shared/components/ui/skeleton'

interface ScenarioListSectionProps {
  campaignId: string
}

/**
 * The Keeper's "Scenarios" section on the Overview: the Campaign's Scenarios in order, each a link to its page, with
 * Move up / Move down per row (specs/scenario-preparation/ux.md sections 2 and 2.1). Mounted for the Keeper only.
 */
export function ScenarioListSection({ campaignId }: ScenarioListSectionProps) {
  const headingId = useId()
  const headingRef = useRef<HTMLHeadingElement>(null)
  const list = useScenarios(campaignId, true)
  const reordering = useScenarioReordering(campaignId, list.data, list.dataUpdatedAt, headingRef)

  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id={headingId} ref={headingRef} tabIndex={-1} className="text-lg font-semibold outline-none">
          Scenarios
        </h2>
        <Link to="/campaigns/$campaignId/scenarios/new" params={{ campaignId }} className={buttonVariants({ size: 'sm' })}>
          Create Scenario
        </Link>
      </div>
      <p role="status" className="sr-only">
        {reordering.announcement}
      </p>
      {reordering.alert && (
        <Alert variant="destructive" role="alert">
          {reordering.alert}
        </Alert>
      )}
      <ScenarioListBody
        campaignId={campaignId}
        scenarios={list.data}
        isPending={list.isPending}
        isError={list.isError}
        onRetry={() => void list.refetch()}
        saving={reordering.pending}
        onMove={reordering.move}
      />
    </section>
  )
}

interface ScenarioListBodyProps {
  campaignId: string
  scenarios: Scenario[] | undefined
  isPending: boolean
  isError: boolean
  onRetry: () => void
  saving: boolean
  onMove: (scenarioId: string, direction: MoveDirection) => void
}

function ScenarioListBody({ campaignId, scenarios, isPending, isError, onRetry, saving, onMove }: ScenarioListBodyProps) {
  if (isPending) {
    return (
      <Card aria-busy="true" className="flex flex-col gap-3 p-4">
        <Skeleton className="h-5 w-full max-w-sm" />
        <Skeleton className="h-5 w-full max-w-xs" />
      </Card>
    )
  }

  if (isError || !scenarios) {
    return (
      <div className="flex flex-wrap items-center gap-3">
        <p className="text-sm">We couldn&apos;t load the Scenarios.</p>
        <Button type="button" variant="outline" size="sm" onClick={onRetry}>
          Try again
        </Button>
      </div>
    )
  }

  if (scenarios.length === 0) {
    return <p className="text-sm text-muted-foreground">No Scenarios yet.</p>
  }

  return (
    <Card>
      <ol className="list-decimal divide-y pr-2 pl-10">
        {scenarios.map((scenario, index) => (
          <li key={scenario.id} className="py-1 pl-1">
            <div className="flex items-center gap-2">
              <Link
                to="/campaigns/$campaignId/scenarios/$scenarioId"
                params={{ campaignId, scenarioId: scenario.id }}
                className="flex min-h-10 min-w-0 flex-1 items-center text-sm font-medium break-words hover:underline"
              >
                {scenario.title}
              </Link>
              {scenarios.length > 1 && (
                <MoveControls
                  scenario={scenario}
                  isFirst={index === 0}
                  isLast={index === scenarios.length - 1}
                  saving={saving}
                  onMove={onMove}
                />
              )}
            </div>
          </li>
        ))}
      </ol>
    </Card>
  )
}

interface MoveControlsProps {
  scenario: Scenario
  isFirst: boolean
  isLast: boolean
  saving: boolean
  onMove: (scenarioId: string, direction: MoveDirection) => void
}

function MoveControls({ scenario, isFirst, isLast, saving, onMove }: MoveControlsProps) {
  return (
    <div className="flex shrink-0 items-center">
      {isFirst ? (
        <span aria-hidden="true" className="size-10" />
      ) : (
        <MoveButton scenario={scenario} direction="up" saving={saving} onMove={onMove} />
      )}
      {isLast ? (
        <span aria-hidden="true" className="size-10" />
      ) : (
        <MoveButton scenario={scenario} direction="down" saving={saving} onMove={onMove} />
      )}
    </div>
  )
}

interface MoveButtonProps {
  scenario: Scenario
  direction: MoveDirection
  saving: boolean
  onMove: (scenarioId: string, direction: MoveDirection) => void
}

/** aria-disabled, never disabled, while saving, so focus is kept (SP-A11Y-9). */
function MoveButton({ scenario, direction, saving, onMove }: MoveButtonProps) {
  const Icon = direction === 'up' ? ArrowUp : ArrowDown

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      id={moveScenarioButtonId(scenario.id, direction)}
      className="size-10 aria-disabled:opacity-50"
      aria-disabled={saving || undefined}
      onClick={() => onMove(scenario.id, direction)}
    >
      <Icon aria-hidden="true" />
      <span className="sr-only">
        Move {scenario.title} {direction}
      </span>
    </Button>
  )
}
