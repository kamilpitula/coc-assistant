import { ChevronDown } from 'lucide-react'
import { useId, type Ref } from 'react'

import { CreationMethodsFieldset } from '@/campaign-play/components/creation-methods-fieldset/creation-methods-fieldset'
import { formatCreationMethods } from '@/campaign-play/components/creation-methods-fieldset/creationMethodLabels'
import { DEFAULT_ERA, type CreationMethod } from '@/campaign-play/types/Campaign'
import { Button } from '@/shared/components/ui/button'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/shared/components/ui/collapsible'

interface RulesOptionsCollapsibleProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  allowedCreationMethods: readonly CreationMethod[]
  onAllowedCreationMethodsChange: (next: CreationMethod[]) => void
  error?: string
  disabled?: boolean
  firstCheckboxRef?: Ref<HTMLButtonElement>
}

/** The collapsed "Rules options" section of the create-campaign form (specs/character-sheet/ux.md section 2). */
export function RulesOptionsCollapsible({
  open,
  onOpenChange,
  allowedCreationMethods,
  onAllowedCreationMethodsChange,
  error,
  disabled,
  firstCheckboxRef,
}: RulesOptionsCollapsibleProps) {
  const eraHelpId = useId()
  const summary = [DEFAULT_ERA, formatCreationMethods(allowedCreationMethods)].filter(Boolean).join(' - ')

  return (
    <Collapsible open={open} onOpenChange={onOpenChange} className="flex flex-col gap-3">
      <CollapsibleTrigger asChild>
        <Button type="button" variant="outline" className="h-auto min-h-9 justify-between whitespace-normal text-left">
          <span className="flex flex-col gap-0.5 sm:flex-row sm:gap-2">
            <span>Rules options</span>{' '}
            <span className="font-normal text-muted-foreground">{summary}</span>
          </span>
          <ChevronDown aria-hidden="true" className={open ? 'rotate-180' : undefined} />
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="flex flex-col gap-4 rounded-md border border-border p-4">
        <dl className="flex flex-col gap-1">
          <dt className="text-sm font-medium">Era</dt>
          <dd className="m-0 text-sm" aria-describedby={eraHelpId}>
            {DEFAULT_ERA}
          </dd>
          <dd id={eraHelpId} className="m-0 text-sm text-muted-foreground">
            The era can&apos;t be changed after the Campaign is created.
          </dd>
        </dl>
        <CreationMethodsFieldset
          value={allowedCreationMethods}
          onChange={onAllowedCreationMethodsChange}
          error={error}
          disabled={disabled}
          firstCheckboxRef={firstCheckboxRef}
        />
      </CollapsibleContent>
    </Collapsible>
  )
}
