import { Link } from '@tanstack/react-router'
import { useId, useImperativeHandle, useMemo, useRef, useState, type Ref } from 'react'

import { useFilterAnnouncement } from '@/scenario-preparation/hooks/useFilterAnnouncement'
import { filterItems } from '@/scenario-preparation/services/itemFilter'
import type { ItemSummary } from '@/scenario-preparation/types/Item'
import { Button, buttonVariants } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { Label } from '@/shared/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/shared/components/ui/radio-group'
import { Skeleton } from '@/shared/components/ui/skeleton'

/** What the form needs to move focus into the picker after a refused submit (SP-A11Y-55). */
export interface ItemPickerHandle {
  focus: () => void
}

interface ItemPickerProps {
  campaignId: string
  /** The Campaign's Items, once loaded. */
  items: ItemSummary[] | undefined
  isPending: boolean
  isError: boolean
  onRetry: () => void
  /** The ids of the Items this Scene already links; they are still listed, but can not be chosen. */
  linkedIds: ReadonlyArray<string>
  /** The id of the chosen Item. */
  value: string | null
  onChange: (itemId: string) => void
  error?: string
  errorId: string
  ref?: Ref<ItemPickerHandle>
}

/**
 * Chooses one Item of the Campaign (specs/scenario-preparation/ux.md section 64.2): search by name and a radio list sorted by name.
 * An Item the Scene already links is a disabled radio marked "Already in this Scene". The choice stays when the search hides it, and
 * the "Selected:" line always names it.
 */
export function ItemPicker({ campaignId, items, isPending, isError, onRetry, linkedIds, value, onChange, error, errorId, ref }: ItemPickerProps) {
  const fieldsetRef = useRef<HTMLFieldSetElement>(null)

  // The checked radio, else the first enabled radio, else the search field.
  useImperativeHandle(ref, () => ({
    focus: () => {
      const target =
        fieldsetRef.current?.querySelector<HTMLElement>('[data-item-choice][aria-checked="true"]') ??
        fieldsetRef.current?.querySelector<HTMLElement>('[data-item-choice]:not([disabled])') ??
        fieldsetRef.current?.querySelector<HTMLElement>('[data-item-search]')
      target?.focus()
    },
  }))

  return (
    <fieldset ref={fieldsetRef} aria-describedby={error ? errorId : undefined} className="flex min-w-0 flex-col gap-3">
      <legend className="text-sm font-medium">Item</legend>
      <PickerBody
        campaignId={campaignId}
        items={items}
        isPending={isPending}
        isError={isError}
        onRetry={onRetry}
        linkedIds={new Set(linkedIds)}
        value={value}
        onChange={onChange}
      />
      {error && (
        <p id={errorId} className="text-sm text-destructive">
          {error}
        </p>
      )}
    </fieldset>
  )
}

interface PickerBodyProps {
  campaignId: string
  items: ItemSummary[] | undefined
  isPending: boolean
  isError: boolean
  onRetry: () => void
  linkedIds: ReadonlySet<string>
  value: string | null
  onChange: (itemId: string) => void
}

function PickerBody({ campaignId, items, isPending, isError, onRetry, linkedIds, value, onChange }: PickerBodyProps) {
  if (isPending) {
    return (
      <div aria-busy="true" className="flex flex-col gap-3">
        <Skeleton className="h-5 w-full max-w-sm" />
        <Skeleton className="h-5 w-full max-w-xs" />
        <Skeleton className="h-5 w-full max-w-sm" />
      </div>
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
    return (
      <div className="flex flex-col items-start gap-2">
        <p className="text-sm text-muted-foreground">No Items yet.</p>
        <Link to="/campaigns/$campaignId/items/new" params={{ campaignId }} className={buttonVariants({ variant: 'outline', size: 'sm' })}>
          Create Item
        </Link>
      </div>
    )
  }

  return <FilteredChoices items={items} linkedIds={linkedIds} value={value} onChange={onChange} />
}

interface FilteredChoicesProps {
  items: ItemSummary[]
  linkedIds: ReadonlySet<string>
  value: string | null
  onChange: (itemId: string) => void
}

function FilteredChoices({ items, linkedIds, value, onChange }: FilteredChoicesProps) {
  const idPrefix = useId()
  const searchRef = useRef<HTMLInputElement>(null)
  const [search, setSearch] = useState('')
  const shown = useMemo(() => filterItems(items, search), [items, search])
  const announcement = useFilterAnnouncement(shown.length, search)
  const selected = value ? items.find((item) => item.id === value) : undefined

  const clearSearch = () => {
    setSearch('')
    searchRef.current?.focus()
  }

  return (
    <>
      <div className="flex flex-col gap-2">
        <Label htmlFor={`${idPrefix}-search`}>Search by name</Label>
        <Input ref={searchRef} data-item-search id={`${idPrefix}-search`} value={search} onChange={(event) => setSearch(event.target.value)} className="max-w-sm" />
      </div>
      {selected && <p className="text-sm break-words text-muted-foreground">Selected: {selected.name}</p>}
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
        <RadioGroup aria-label="Items" value={value ?? ''} onValueChange={onChange} className="flex flex-col gap-2">
          {shown.map((item) => (
            <Choice key={item.id} item={item} idPrefix={idPrefix} alreadyLinked={linkedIds.has(item.id)} />
          ))}
        </RadioGroup>
      )}
    </>
  )
}

function Choice({ item, idPrefix, alreadyLinked }: { item: ItemSummary; idPrefix: string; alreadyLinked: boolean }) {
  const itemId = `${idPrefix}-choice-${item.id}`
  const descriptionId = `${itemId}-description`

  return (
    <div className="flex items-start gap-2">
      <RadioGroupItem
        value={item.id}
        id={itemId}
        disabled={alreadyLinked}
        aria-describedby={alreadyLinked ? descriptionId : undefined}
        data-item-choice
        className="mt-0.5"
      />
      <div className="flex min-w-0 flex-col">
        <Label htmlFor={itemId} className="break-words">
          {item.name}
        </Label>
        {alreadyLinked && (
          <span id={descriptionId} className="text-sm text-muted-foreground">
            <span aria-hidden="true">&middot;</span> Already in this Scene
          </span>
        )}
      </div>
    </div>
  )
}
