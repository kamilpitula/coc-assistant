import { useId } from 'react'

import type { SectionIndexEntry } from '@/scenario-preparation/services/mythosCreatureSections'

interface ProfileSectionIndexProps {
  /** One entry per present section in the fixed order; each target carries the entry's id and `tabIndex=-1`. */
  sections: SectionIndexEntry[]
}

/**
 * The "On this page" section index of a Monster Profile (specs/scenario-preparation/ux.md section 25.5; SP-UX-45,
 * SP-A11Y-28): a `nav` of links that scroll to a section and move focus to it. It is not sticky.
 */
export function ProfileSectionIndex({ sections }: ProfileSectionIndexProps) {
  const labelId = useId()

  const goTo = (id: string) => {
    const target = document.getElementById(id)
    target?.focus()
    target?.scrollIntoView?.({ block: 'start' })
  }

  return (
    <div className="flex flex-col gap-1">
      <p id={labelId} className="text-sm text-muted-foreground">
        On this page
      </p>
      <nav aria-labelledby={labelId}>
        <ul className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
          {sections.map((section, index) => (
            <li key={section.id} className="flex items-center gap-2">
              {index > 0 && <span aria-hidden="true">&middot;</span>}
              <a
                href={`#${section.id}`}
                className="inline-flex min-h-6 items-center underline underline-offset-4"
                onClick={(event) => {
                  event.preventDefault()
                  goTo(section.id)
                }}
              >
                {section.label}
              </a>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  )
}
