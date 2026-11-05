import { createElement, type ReactNode } from 'react'

import { useHeadingTag } from '@/shared/providers/heading-offset/heading-offset-context'

import { Button } from '@/shared/components/ui/button'

interface ProfileSectionProps {
  /** The section heading ("Skills"); also names the Remove button. */
  title: string
  mode: 'view' | 'edit'
  /** Edit mode only: adds an outline "Remove section" button; omit for sections that are always present. */
  onRemove?: () => void
  /** Edit mode only: the id of the Remove button, so focus can return to it. */
  removeButtonId?: string
  /** Makes the section a focus target (`tabIndex=-1`), for a link in the section index. */
  id?: string
  children: ReactNode
}

/**
 * One section of a profile (specs/scenario-preparation/ux.md sections 25.1 and 25.2): an `h2` in view and a `fieldset`
 * whose legend is styled like that `h2` in edit, with "Remove section" for sections the Keeper added.
 */
export function ProfileSection({ title, mode, onRemove, removeButtonId, id, children }: ProfileSectionProps) {
  if (mode === 'view') {
    return <ViewSection id={id} title={title} children={children} />
  }

  return (
    <fieldset id={id} tabIndex={id ? -1 : undefined} className="relative flex min-w-0 flex-col gap-3 outline-none">
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

/** A view-mode section: its h2 shifts down inside an offset provider (the entity panel), and is unchanged without one. */
function ViewSection({ id, title, children }: { id?: string; title: string; children: ReactNode }) {
  const tag = useHeadingTag(2)

  return (
    <section id={id} tabIndex={id ? -1 : undefined} className="flex scroll-mt-4 flex-col gap-2 outline-none">
      {createElement(tag, { className: 'text-lg font-semibold' }, title)}
      {children}
    </section>
  )
}
