import { Button } from '@/shared/components/ui/button'

interface RevealTriggerProps {
  /** The button id: the dialog's focus fallback chain starts here (specs/scene-play/ux.md section 21.7). */
  triggerId: string
  title: string
  onReveal: () => void
}

/**
 * The "Reveal..." trigger opening the reveal dialog (specs/scene-play/ux.md sections 13 and 21.7): the same button on
 * the "To reveal" entries and in the `handout` and `entity` panel footers.
 */
export function RevealTrigger({ triggerId, title, onReveal }: RevealTriggerProps) {
  return (
    <Button id={triggerId} type="button" variant="outline" size="sm" aria-label={`Reveal ${title}`} onClick={onReveal}>
      Reveal...
    </Button>
  )
}
