import { Link } from '@tanstack/react-router'

import { InvestigatorStatusBadge } from '@/campaign-play/components/investigator-status-badge/investigator-status-badge'
import { useInvestigatorList } from '@/campaign-play/hooks/useKeeperInvestigators'
import { inReviewOrder } from '@/campaign-play/services/reviewOrder'
import type { InvestigatorListItem } from '@/campaign-play/types/Investigator'
import { Card, CardContent } from '@/shared/components/ui/card'
import { Skeleton } from '@/shared/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/components/ui/table'

const HIDDEN_DRAFT_NAME = 'Not shown until submitted'

interface InvestigatorListProps {
  campaignId: string
}

/**
 * The Keeper's Investigators (specs/character-sheet/ux.md section 3.1): a table from 640px and stacked cards below.
 * A Draft shows only the Player's name and "In progress".
 */
export function InvestigatorList({ campaignId }: InvestigatorListProps) {
  const list = useInvestigatorList(campaignId)

  return (
    <section aria-labelledby="investigators-heading" className="flex flex-col gap-3">
      <h2 id="investigators-heading" className="text-xl font-semibold">
        Investigators
      </h2>
      <ListContent campaignId={campaignId} list={list} />
    </section>
  )
}

function ListContent({ campaignId, list }: { campaignId: string; list: ReturnType<typeof useInvestigatorList> }) {
  if (list.isPending) {
    return <Skeleton aria-busy="true" className="h-24 w-full max-w-3xl" />
  }

  if (list.isError || !list.data) {
    return <p className="text-sm">We couldn&apos;t load the Investigators.</p>
  }

  if (list.data.length === 0) {
    return <p className="text-sm">No Investigators yet. Players create theirs after joining.</p>
  }

  const rows = inReviewOrder(list.data)
  return (
    <>
      <div className="hidden max-w-3xl sm:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead scope="col">Player</TableHead>
              <TableHead scope="col">Investigator</TableHead>
              <TableHead scope="col">Status</TableHead>
              <TableHead scope="col">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.playerAccountId}>
                <TableCell>{row.playerName ?? 'Unknown Player'}</TableCell>
                <TableCell>{investigatorName(row)}</TableCell>
                <TableCell>
                  <InvestigatorStatusBadge status={row.status} audience="Keeper" />
                </TableCell>
                <TableCell>
                  <RowAction campaignId={campaignId} row={row} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <ul className="flex flex-col gap-3 sm:hidden">
        {rows.map((row) => (
          <li key={row.playerAccountId}>
            <Card>
              <CardContent className="flex flex-col gap-2 pt-6 text-sm">
                <span className="font-medium">{row.playerName ?? 'Unknown Player'}</span>
                <span>{investigatorName(row)}</span>
                <InvestigatorStatusBadge status={row.status} audience="Keeper" />
                <RowAction campaignId={campaignId} row={row} />
              </CardContent>
            </Card>
          </li>
        ))}
      </ul>
    </>
  )
}

function investigatorName(row: InvestigatorListItem): string {
  return row.status === 'Draft' ? HIDDEN_DRAFT_NAME : (row.investigatorName ?? 'Not named yet')
}

function RowAction({ campaignId, row }: { campaignId: string; row: InvestigatorListItem }) {
  if (row.status === 'Draft' || row.investigatorId === null) {
    return null
  }

  const action = row.status === 'Submitted' ? 'Review' : 'View'
  return (
    <Link
      to="/campaigns/$campaignId/investigators/$investigatorId"
      params={{ campaignId, investigatorId: row.investigatorId }}
      className="underline underline-offset-4"
    >
      {action} <span className="sr-only">{row.investigatorName ?? 'Investigator'}</span>
    </Link>
  )
}
