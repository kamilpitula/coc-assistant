import { Link } from '@tanstack/react-router'
import { ArrowLeft } from 'lucide-react'
import { useEffect, useId, useMemo, useRef, useState } from 'react'

import { useCampaign } from '@/campaign-play/hooks/useCampaign'
import { NonPlayerEntityNotFound } from '@/scenario-preparation/components/non-player-entity-not-found/non-player-entity-not-found'
import { useNonPlayerEntities } from '@/scenario-preparation/hooks/useNonPlayerEntities'
import { filterNonPlayerEntities } from '@/scenario-preparation/services/nonPlayerEntityFilter'
import {
  NON_PLAYER_ENTITY_TYPE_LABELS,
  type NonPlayerEntitySummary,
  type NonPlayerEntityTypeFilter,
} from '@/scenario-preparation/types/NonPlayerEntity'
import { Button, buttonVariants } from '@/shared/components/ui/button'
import { Card } from '@/shared/components/ui/card'
import { Input } from '@/shared/components/ui/input'
import { Label } from '@/shared/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/shared/components/ui/radio-group'
import { Skeleton } from '@/shared/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/components/ui/table'

const ANNOUNCEMENT_DELAY_MS = 500

const TYPE_OPTIONS: { value: NonPlayerEntityTypeFilter; label: string }[] = [
  { value: 'All', label: 'All' },
  { value: 'HumanNpc', label: 'Human NPCs' },
  { value: 'MythosCreature', label: 'Mythos Creatures' },
]

interface NonPlayerEntityListPageProps {
  campaignId: string
}

/**
 * The Campaign's Non-Player Entity list for its Keeper (specs/scenario-preparation/ux.md section 23). Search and the
 * type filter work on the loaded list and are local state. A Player sees the not-found page and no request is made.
 */
export function NonPlayerEntityListPage({ campaignId }: NonPlayerEntityListPageProps) {
  const campaign = useCampaign(campaignId)
  const isKeeper = campaign.data?.role === 'Keeper'
  const list = useNonPlayerEntities(campaignId, isKeeper)

  if (!isKeeper) {
    return <NonPlayerEntityNotFound campaignId={campaignId} />
  }

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <Link to="/campaigns/$campaignId" params={{ campaignId }} className={buttonVariants({ variant: 'link', className: 'self-start px-0' })}>
        <ArrowLeft aria-hidden="true" />
        Back to the Overview
      </Link>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Non-Player Entities</h1>
        <CreateLink campaignId={campaignId} />
      </div>
      <ListBody
        campaignId={campaignId}
        items={list.data}
        isPending={list.isPending}
        isError={list.isError}
        onRetry={() => void list.refetch()}
      />
    </div>
  )
}

function CreateLink({ campaignId }: { campaignId: string }) {
  return (
    <Link to="/campaigns/$campaignId/non-player-entities/new" params={{ campaignId }} className={buttonVariants({ size: 'sm' })}>
      Create <span className="sr-only">Non-Player Entity</span>
    </Link>
  )
}

interface ListBodyProps {
  campaignId: string
  items: NonPlayerEntitySummary[] | undefined
  isPending: boolean
  isError: boolean
  onRetry: () => void
}

function ListBody({ campaignId, items, isPending, isError, onRetry }: ListBodyProps) {
  if (isPending) {
    return (
      <Card aria-busy="true" className="flex flex-col gap-3 p-4">
        <Skeleton className="h-5 w-full max-w-sm" />
        <Skeleton className="h-5 w-full max-w-xs" />
        <Skeleton className="h-5 w-full max-w-sm" />
      </Card>
    )
  }

  if (isError || !items) {
    return (
      <div className="flex flex-wrap items-center gap-3">
        <p className="text-sm">We couldn&apos;t load the Non-Player Entities.</p>
        <Button type="button" variant="outline" size="sm" onClick={onRetry}>
          Try again
        </Button>
      </div>
    )
  }

  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground">No Non-Player Entities yet.</p>
  }

  return <FilteredList campaignId={campaignId} items={items} />
}

function FilteredList({ campaignId, items }: { campaignId: string; items: NonPlayerEntitySummary[] }) {
  const searchId = useId()
  const searchRef = useRef<HTMLInputElement>(null)
  const [search, setSearch] = useState('')
  const [type, setType] = useState<NonPlayerEntityTypeFilter>('All')
  const shown = useMemo(() => filterNonPlayerEntities(items, search, type), [items, search, type])
  const announcement = useAnnouncement(shown.length, `${search}|${type}`)

  const clearFilters = () => {
    setSearch('')
    setType('All')
    searchRef.current?.focus()
  }

  return (
    <>
      <div className="flex flex-col gap-2">
        <Label htmlFor={searchId}>Search by name</Label>
        <Input ref={searchRef} id={searchId} value={search} onChange={(event) => setSearch(event.target.value)} className="max-w-sm" />
      </div>
      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-medium">Type</legend>
        <RadioGroup value={type} onValueChange={(value) => setType(value as NonPlayerEntityTypeFilter)} className="flex flex-wrap gap-x-6 gap-y-2">
          {TYPE_OPTIONS.map((option) => (
            <div key={option.value} className="flex items-center gap-2">
              <RadioGroupItem value={option.value} id={`${searchId}-${option.value}`} />
              <Label htmlFor={`${searchId}-${option.value}`}>{option.label}</Label>
            </div>
          ))}
        </RadioGroup>
      </fieldset>
      <p role="status" className="text-sm">
        {announcement}
      </p>
      {shown.length === 0 ? (
        <div className="flex flex-col items-start gap-2">
          <p className="text-sm">No Non-Player Entities match these filters.</p>
          <Button type="button" variant="outline" size="sm" onClick={clearFilters}>
            Clear filters
          </Button>
        </div>
      ) : (
        <EntityRows campaignId={campaignId} items={shown} />
      )}
    </>
  )
}

/** "{n} shown." after the search or filter changes, debounced; empty on first load (SP-A11Y-23). */
function useAnnouncement(count: number, filterKey: string): string {
  const [announcement, setAnnouncement] = useState('')
  const previousKey = useRef(filterKey)

  useEffect(() => {
    if (previousKey.current === filterKey) {
      return
    }
    previousKey.current = filterKey
    const timer = setTimeout(() => setAnnouncement(`${count} shown.`), ANNOUNCEMENT_DELAY_MS)
    return () => clearTimeout(timer)
  }, [count, filterKey])

  return announcement
}

function EntityLink({ campaignId, item }: { campaignId: string; item: NonPlayerEntitySummary }) {
  return item.type === 'HumanNpc' ? (
    <Link
      to="/campaigns/$campaignId/human-npcs/$humanNpcId"
      params={{ campaignId, humanNpcId: item.id }}
      className="inline-flex min-h-6 items-center font-medium break-words underline-offset-4 hover:underline"
    >
      {item.name}
    </Link>
  ) : (
    <span className="font-medium break-words">{item.name}</span>
  )
}

function EntityRows({ campaignId, items }: { campaignId: string; items: NonPlayerEntitySummary[] }) {
  return (
    <>
      <Card className="hidden sm:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead scope="col">Name</TableHead>
              <TableHead scope="col">Type</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => (
              <TableRow key={item.id}>
                <TableCell>
                  <EntityLink campaignId={campaignId} item={item} />
                </TableCell>
                <TableCell>{NON_PLAYER_ENTITY_TYPE_LABELS[item.type]}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
      <Card className="sm:hidden">
        <ul className="divide-y">
          {items.map((item) => (
            <li key={item.id} className="flex flex-col gap-1 px-4 py-3">
              <EntityLink campaignId={campaignId} item={item} />
              <span className="text-sm text-muted-foreground">{NON_PLAYER_ENTITY_TYPE_LABELS[item.type]}</span>
            </li>
          ))}
        </ul>
      </Card>
    </>
  )
}
