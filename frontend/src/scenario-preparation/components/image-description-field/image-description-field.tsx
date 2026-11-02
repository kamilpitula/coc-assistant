import { Label } from '@/shared/components/ui/label'
import { Textarea } from '@/shared/components/ui/textarea'

interface ImageDescriptionFieldProps {
  value: string
  onChange: (value: string) => void
  error?: string
  inputId: string
  hintId: string
  errorId: string
}

/**
 * The optional image description of an Image or Map Handout (specs/scenario-preparation/ux.md section 71): a visible label, a hint
 * that says who receives it, and a textarea with no maxLength. The hint and the error are connected with aria-describedby.
 */
export function ImageDescriptionField({ value, onChange, error, inputId, hintId, errorId }: ImageDescriptionFieldProps) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={inputId}>Image description (optional)</Label>
      <p id={hintId} className="text-sm text-muted-foreground">
        Describe the image for Players who use a screen reader. Players receive it when you reveal the Handout.
      </p>
      <Textarea
        id={inputId}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${hintId} ${errorId}` : hintId}
      />
      {error && (
        <p id={errorId} className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  )
}
