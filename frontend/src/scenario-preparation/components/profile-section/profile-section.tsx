import type { ReactNode } from 'react'

import { Button } from '@/shared/components/ui/button'

interface ProfileSectionProps {
  /** The section heading ("Skills"); also names the Remove button. */
  title: string
  mode: 'view' | 'edit'
  /** Edit mode only: adds an outline "Remove section" button; omit for sections that are always present. */
  onRemove?: () => void
  /** Edit mode only: the id of the Remove button, so focus can return to it. */
  removeButtonId?: string
  children: ReactNode
}

/**
 * One section of a profile (specs/scenario-preparation/ux.md sections 25.1 and 25.2): an `h2` in view and a `fieldset`
 * whose legend is styled like that `h2` in edit, with "Remove section" for sections the Keeper added.
 */
export function ProfileSection({ title, mode, onRemove, removeButtonId, children }: ProfileSectionProps) {
  if (mode === 'view') {
    return (
      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold">{title}</h2>
        {children}
      </section>
    )
  }

  return (
    <fieldset className="relative flex min-w-0 flex-col gap-3">
      <legend className="text-lg font-semibold">{title}</legend>
      {onRemove && (
        <Button id={removeButtonId} type="button" variant="outline" size="sm" className="absolute top-0 right-0" onClick={onRemove}>
          <span aria-hidden="true">Remove section</span>
          <span className="sr-only">Remove {title} section</span>
        </Button>
      )}
      {children}
    </fieldset>
  )
}
