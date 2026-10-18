import { SECTION_LABELS, addSectionButtonId, type SectionName } from '@/scenario-preparation/services/humanNpcForm'
import { Button } from '@/shared/components/ui/button'

interface AddSectionGroupProps {
  /** The sections not added yet, in their fixed order. */
  available: SectionName[]
  onAdd: (section: SectionName) => void
}

/** The "Add a section" group (specs/scenario-preparation/ux.md section 25.2); not rendered when every section is added. */
export function AddSectionGroup({ available, onAdd }: AddSectionGroupProps) {
  if (available.length === 0) {
    return null
  }

  return (
    <div role="group" aria-label="Add a section" className="flex flex-wrap items-center gap-2">
      <span aria-hidden="true" className="text-sm font-medium">
        Add a section
      </span>
      {available.map((section) => (
        <Button key={section} id={addSectionButtonId(section)} type="button" variant="outline" onClick={() => onAdd(section)}>
          Add {SECTION_LABELS[section]}
        </Button>
      ))}
    </div>
  )
}
