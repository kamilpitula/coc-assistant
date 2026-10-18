import { addSectionButtonId } from '@/scenario-preparation/services/profileForm'
import { Button } from '@/shared/components/ui/button'

interface AddSectionGroupProps<Section extends string> {
  /** The sections not added yet, in their fixed order. */
  available: Section[]
  /** The label of every section of the profile type, for example "Skills". */
  labels: Record<Section, string>
  onAdd: (section: Section) => void
}

/** The "Add a section" group (specs/scenario-preparation/ux.md section 25.2); not rendered when every section is added. */
export function AddSectionGroup<Section extends string>({ available, labels, onAdd }: AddSectionGroupProps<Section>) {
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
          Add {labels[section]}
        </Button>
      ))}
    </div>
  )
}
