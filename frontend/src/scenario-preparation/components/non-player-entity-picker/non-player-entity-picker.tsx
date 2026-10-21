import { Link } from '@tanstack/react-router'
import { useId, useImperativeHandle, useMemo, useRef, useState, type Ref } from 'react'

import { useFilterAnnouncement } from '@/scenario-preparation/hooks/useFilterAnnouncement'
import { filterNonPlayerEntities } from '@/scenario-preparation/services/nonPlayerEntityFilter'
import {
  NON_PLAYER_ENTITY_TYPE_LABELS,
  type NonPlayerEntitySummary,
  type NonPlayerEntityTypeFilter,
} from '@/scenario-preparation/types/NonPlayerEntity'
import type { NonPlayerEntityReference } from '@/scenario-preparation/types/Scene'
import { Button, buttonVariants } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { Label } from '@/shared/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/shared/components/ui/radio-group'
import { Skeleton } from '@/shared/components/ui/skeleton'

const TYPE_OPTIONS: { value: NonPlayerEntityTypeFilter; label: string }[] = [
  { value: 'All', label: 'All' },
  { value: 'HumanNpc', label: 'Human NPCs' },
  { value: 'MythosCreature', label: 'Mythos Creatures' },
]

/** What the form needs to move focus into the picker after a refused submit (SP-A11Y-33). */
export interface NonPlayerEntityPickerHandle {
  focus: () => void
}

const keyOf = (entity: { type: string; id: string }): string => `${entity.type}:${entity.id}`

interface NonPlayerEntityPickerProps {
  campaignId: string
  /** The Campaign's Non-Player Entities, once loaded. */
  entities: NonPlayerEntitySummary[] | undefined
  isPending: boolean
  isError: boolean
  onRetry: () => void
  /** The entities this Scene already links; they are still offered, marked "Already in this Scene". */
  linked: ReadonlyArray<NonPlayerEntityReference>
  value: NonPlayerEntityReference | null
  onChange: (value: NonPlayerEntityReference) => void
  error?: string
  errorId: string
  ref?: Ref<NonPlayerEntityPickerHandle>
}

/**
 * Chooses one Non-Player Entity of the Campaign (specs/scenario-preparation/ux.md section 33): search by name, a type filter,
 * and a radio list. The choice stays when the filters hide it, and the "Selected:" line always names it.
 */
export function NonPlayerEntityPicker({
  campaignId,
  entities,
  isPending,
  isError,
  onRetry,
  linked,
  value,
  onChange,
  error,
  errorId,
  ref,
}: NonPlayerEntityPickerProps) {
  const fieldsetRef = useRef<HTMLFieldSetElement>(null)

  // The checked radio, else the first radio, else the search field, else the fieldset itself.
  useImperativeHandle(ref, () => ({
    focus: () => {
      const target =
        fieldsetRef.current?.querySelector<HTMLElement>('[data-entity-choice][aria-checked="true"]') ??
        fieldsetRef.current?.querySelector<HTMLElement>('[data-entity-choice]') ??
        fieldsetRef.current?.querySelector<HTMLElement>('[data-entity-search]')
      target?.focus()
    },
  }))

  return (
    <fieldset ref={fieldsetRef} aria-describedby={error ? errorId : undefined} className="flex min-w-0 flex-col gap-3">
      <legend className="text-sm font-medium">Non-Player Entity</legend>
      <PickerBody
        campaignId={campaignId}
        entities={entities}
        isPending={isPending}
        isError={isError}
        onRetry={onRetry}
        linkedKeys={new Set(linked.map(keyOf))}
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
  entities: NonPlayerEntitySummary[] | undefined
  isPending: boolean
  isError: boolean
  onRetry: () => void
  linkedKeys: ReadonlySet<string>
  value: NonPlayerEntityReference | null
  onChange: (value: NonPlayerEntityReference) => void
}

function PickerBody({ campaignId, entities, isPending, isError, onRetry, linkedKeys, value, onChange }: PickerBodyProps) {
  if (isPending) {
    return (
      <div aria-busy="true" className="flex flex-col gap-3">
        <Skeleton className="h-5 w-full max-w-sm" />
        <Skeleton className="h-5 w-full max-w-xs" />
        <Skeleton className="h-5 w-full max-w-sm" />
      </div>
    )
  }

  if (isError || !entities) {
    return (
      <div className="flex flex-wrap items-center gap-3">
        <p className="text-sm">We couldn&apos;t load the Non-Player Entities.</p>
        <Button type="button" variant="outline" size="sm" onClick={onRetry}>
          Try again
        </Button>
      </div>
    )
  }

  if (entities.length === 0) {
    return (
      <div className="flex flex-col items-start gap-2">
        <p className="text-sm text-muted-foreground">No Non-Player Entities yet.</p>
        <Link to="/campaigns/$campaignId/non-player-entities/new" params={{ campaignId }} className={buttonVariants({ variant: 'outline', size: 'sm' })}>
          Create Non-Player Entity
        </Link>
      </div>
    )
  }

  return <FilteredChoices entities={entities} linkedKeys={linkedKeys} value={value} onChange={onChange} />
}

interface FilteredChoicesProps {
  entities: NonPlayerEntitySummary[]
  linkedKeys: ReadonlySet<string>
  value: NonPlayerEntityReference | null
  onChange: (value: NonPlayerEntityReference) => void
}

function FilteredChoices({ entities, linkedKeys, value, onChange }: FilteredChoicesProps) {
  const idPrefix = useId()
  const searchRef = useRef<HTMLInputElement>(null)
  const [search, setSearch] = useState('')
  const [type, setType] = useState<NonPlayerEntityTypeFilter>('All')
  const shown = useMemo(() => filterNonPlayerEntities(entities, search, type), [entities, search, type])
  const announcement = useFilterAnnouncement(shown.length, `${search}|${type}`)
  const selected = value ? entities.find((entity) => entity.type === value.type && entity.id === value.id) : undefined

  const clearFilters = () => {
    setSearch('')
    setType('All')
    searchRef.current?.focus()
  }

  return (
    <>
      <div className="flex flex-col gap-2">
        <Label htmlFor={`${idPrefix}-search`}>Search by name</Label>
        <Input ref={searchRef} data-entity-search id={`${idPrefix}-search`} value={search} onChange={(event) => setSearch(event.target.value)} className="max-w-sm" />
      </div>
      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-medium">Type</legend>
        <RadioGroup value={type} onValueChange={(next) => setType(next as NonPlayerEntityTypeFilter)} className="flex flex-wrap gap-x-6 gap-y-2">
          {TYPE_OPTIONS.map((option) => (
            <div key={option.value} className="flex items-center gap-2">
              <RadioGroupItem value={option.value} id={`${idPrefix}-type-${option.value}`} />
              <Label htmlFor={`${idPrefix}-type-${option.value}`}>{option.label}</Label>
            </div>
          ))}
        </RadioGroup>
      </fieldset>
      {selected && (
        <p className="text-sm break-words text-muted-foreground">
          Selected: {selected.name}, {NON_PLAYER_ENTITY_TYPE_LABELS[selected.type]}
        </p>
      )}
      <p aria-live="polite" className="text-sm empty:hidden">
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
        <RadioGroup
          aria-label="Non-Player Entities"
          value={value ? keyOf(value) : ''}
          onValueChange={(next) => {
            const chosen = shown.find((entity) => keyOf(entity) === next)
            if (chosen) {
              onChange({ type: chosen.type, id: chosen.id })
            }
          }}
          className="flex flex-col gap-2"
        >
          {shown.map((entity) => (
            <Choice key={keyOf(entity)} entity={entity} idPrefix={idPrefix} alreadyLinked={linkedKeys.has(keyOf(entity))} />
          ))}
        </RadioGroup>
      )}
    </>
  )
}

function Choice({ entity, idPrefix, alreadyLinked }: { entity: NonPlayerEntitySummary; idPrefix: string; alreadyLinked: boolean }) {
  const itemId = `${idPrefix}-choice-${keyOf(entity)}`
  const descriptionId = `${itemId}-description`

  return (
    <div className="flex items-start gap-2">
      <RadioGroupItem value={keyOf(entity)} id={itemId} aria-describedby={descriptionId} data-entity-choice className="mt-0.5" />
      <div className="flex min-w-0 flex-col">
        <Label htmlFor={itemId} className="break-words">
          {entity.name}
        </Label>
        <span id={descriptionId} className="text-sm text-muted-foreground">
          {NON_PLAYER_ENTITY_TYPE_LABELS[entity.type]}
          {alreadyLinked && (
            <>
              {' '}
              <span aria-hidden="true">&middot;</span> Already in this Scene
            </>
          )}
        </span>
      </div>
    </div>
  )
}
