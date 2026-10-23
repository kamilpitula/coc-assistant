import { Link, useRouterState } from '@tanstack/react-router'
import { ArrowLeft } from 'lucide-react'
import { useId, useMemo, useRef, useState } from 'react'

import { useCampaign } from '@/campaign-play/hooks/useCampaign'
import '@/campaign-play/types/navigationState'
import { ItemNotFound } from '@/scenario-preparation/components/item-not-found/item-not-found'
import { useFilterAnnouncement } from '@/scenario-preparation/hooks/useFilterAnnouncement'
import { useItems } from '@/scenario-preparation/hooks/useItems'
import { describeSceneCount, filterItems } from '@/scenario-preparation/services/itemFilter'
import type { ItemSummary } from '@/scenario-preparation/types/Item'
import { Button, buttonVariants } from '@/shared/components/ui/button'
import { Card } from '@/shared/components/ui/card'
import { Input } from '@/shared/components/ui/input'
import { Label } from '@/shared/components/ui/label'
import { Skeleton } from '@/shared/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/components/ui/table'

interface ItemListPageProps {
  campaignId: string
}

/**
 * The Campaign's Items for its Keeper (specs/scenario-preparation/ux.md section 61). Search works on the loaded list and is local
 * state. A Player sees the not-found page and no request is made.
 */
export function ItemListPage({ campaignId }: ItemListPageProps) {
  const campaign = useCampaign(campaignId)
  const isKeeper = campaign.data?.role === 'Keeper'
  const list = useItems(campaignId, isKeeper)
  const navigationMessage = useRouterState({ select: (state) => state.location.state.statusMessage })

  if (!isKeeper) {
    return <ItemNotFound campaignId={campaignId} />
  }

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <Link to="/campaigns/$campaignId" params={{ campaignId }} className={buttonVariants({ variant: 'link', className: 'self-start px-0' })}>
        <ArrowLeft aria-hidden="true" />
        Back to the Overview
      </Link>
      <p role="status" className="text-sm empty:hidden">
        {navigationMessage}
      </p>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Items</h1>
        <Link to="/campaigns/$campaignId/items/new" params={{ campaignId }} className={buttonVariants({ size: 'sm' })}>
          Create <span className="sr-only">Item</span>
        </Link>
      </div>
      <ListBody campaignId={campaignId} items={list.data} isPending={list.isPending} isError={list.isError} onRetry={() => void list.refetch()} />
    </div>
  )
}

interface ListBodyProps {
  campaignId: string
  items: ItemSummary[] | undefined
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
        <p className="text-sm">We couldn&apos;t load the Items.</p>
        <Button type="button" variant="outline" size="sm" onClick={onRetry}>
          Try again
        </Button>
      </div>
    )
  }

  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground">No Items yet.</p>
  }

  return <SearchableList campaignId={campaignId} items={items} />
}

function SearchableList({ campaignId, items }: { campaignId: string; items: ItemSummary[] }) {
  const searchId = useId()
  const searchRef = useRef<HTMLInputElement>(null)
  const [search, setSearch] = useState('')
  const shown = useMemo(() => filterItems(items, search), [items, search])
  const announcement = useFilterAnnouncement(shown.length, search)

  const clearSearch = () => {
    setSearch('')
    searchRef.current?.focus()
  }

  return (
    <>
      <div className="flex flex-col gap-2">
        <Label htmlFor={searchId}>Search by name</Label>
        <Input ref={searchRef} id={searchId} value={search} onChange={(event) => setSearch(event.target.value)} className="max-w-sm" />
      </div>
      <p aria-live="polite" className="text-sm empty:hidden">
        {announcement}
      </p>
      {shown.length === 0 ? (
        <div className="flex flex-col items-start gap-2">
          <p className="text-sm">No Items match this search.</p>
          <Button type="button" variant="outline" size="sm" onClick={clearSearch}>
            Clear search
          </Button>
        </div>
      ) : (
        <ItemRows campaignId={campaignId} items={shown} />
      )}
    </>
  )
}

const ITEM_LINK_CLASS = 'inline-flex min-h-6 items-center font-medium break-words underline-offset-4 hover:underline'

function ItemLink({ campaignId, item }: { campaignId: string; item: ItemSummary }) {
  return (
    <Link to="/campaigns/$campaignId/items/$itemId" params={{ campaignId, itemId: item.id }} className={ITEM_LINK_CLASS}>
      {item.name}
    </Link>
  )
}

function ItemRows({ campaignId, items }: { campaignId: string; items: ItemSummary[] }) {
  return (
    <>
      <Card className="hidden sm:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead scope="col">Name</TableHead>
              <TableHead scope="col">Scenes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => (
              <TableRow key={item.id}>
                <TableCell>
                  <ItemLink campaignId={campaignId} item={item} />
                </TableCell>
                <TableCell>{item.sceneCount}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
      <Card className="sm:hidden">
        <ul className="divide-y">
          {items.map((item) => (
            <li key={item.id} className="flex flex-col gap-1 px-4 py-3">
              <ItemLink campaignId={campaignId} item={item} />
              <span className="text-sm text-muted-foreground">{describeSceneCount(item.sceneCount)}</span>
            </li>
          ))}
        </ul>
      </Card>
    </>
  )
}
