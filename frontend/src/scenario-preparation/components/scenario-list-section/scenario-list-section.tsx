import { Link } from '@tanstack/react-router'
import { useId, useRef } from 'react'

import { MoveControls } from '@/scenario-preparation/components/move-controls/move-controls'
import { usePreparedOrderReordering } from '@/scenario-preparation/hooks/usePreparedOrderReordering'
import { useReorderScenarios, useScenarios } from '@/scenario-preparation/hooks/useScenarios'
import type { MoveDirection } from '@/scenario-preparation/services/preparedOrder'
import { StaleScenarioOrderError } from '@/scenario-preparation/services/scenarioApi'
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
  const reordering = usePreparedOrderReordering({
    items: list.data,
    dataUpdatedAt: list.dataUpdatedAt,
    headingRef,
    reorder: useReorderScenarios(campaignId),
    isStale: (error) => error instanceof StaleScenarioOrderError,
    staleMessage: 'The Scenarios changed in another window. Check the order and try again.',
    buttonIdPrefix: 'scenario',
  })

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
                  itemId={scenario.id}
                  title={scenario.title}
                  isFirst={index === 0}
                  isLast={index === scenarios.length - 1}
                  saving={saving}
                  buttonIdPrefix="scenario"
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
