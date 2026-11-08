import { useId, useState } from 'react'

import { creationMethodLabels, inCanonicalOrder } from '@/campaign-play/components/creation-methods-fieldset/creationMethodLabels'
import { fieldId } from '@/campaign-play/services/fieldIds'
import type { CreationMethod } from '@/campaign-play/types/Campaign'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/shared/components/ui/alert-dialog'
import { RadioGroup, RadioGroupItem } from '@/shared/components/ui/radio-group'

interface CreationMethodChoiceProps {
  /** The Campaign's allowed Creation Methods. */
  allowed: CreationMethod[]
  value: CreationMethod | null
  /** True when a characteristic already has a Roll Record: the method shows as text with the lock reason (ux.md 6.2). */
  locked?: boolean
  /** True in Draft, where starting over is the way to another method once locked. */
  canStartOver?: boolean
  /** True when values have been entered, so switching asks for confirmation first. */
  needsConfirmation: boolean
  /** True when switching to the method also clears skill values (Quick fire versus the point methods). */
  clearsSkills: (method: CreationMethod) => boolean
  error?: string
  onChange: (method: CreationMethod) => void
}

/**
 * The locked creation method text (UX-32): the method name plus the lock reason.
 */
function LockedCreationMethod({ value, canStartOver }: { value: CreationMethod; canStartOver: boolean }) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm">Creation method: {creationMethodLabels[value].name}</p>
      <p className="text-sm text-muted-foreground">
        Locked because your characteristics are rolled.{canStartOver ? ' To use another method, start over.' : ''}
      </p>
    </div>
  )
}

/** True when switching to the next method must ask for confirmation first (UX-8). */
function needsSwitchConfirmation(next: CreationMethod, value: CreationMethod | null, needsConfirmation: boolean) {
  return needsConfirmation && value !== null && next !== value
}

/**
 * The switch confirmation dialog (UX-8): warns that values will be cleared, and cancelling returns focus to the
 * radio that opened the dialog (A11Y-8).
 */
function SwitchConfirmationDialog({
  pending,
  clearsSkills,
  onDismiss,
  onConfirm,
  returnFocus,
}: {
  pending: CreationMethod | null
  clearsSkills: (method: CreationMethod) => boolean
  onDismiss: () => void
  onConfirm: (method: CreationMethod) => void
  returnFocus: (event: Event) => void
}) {
  return (
    <AlertDialog open={pending !== null} onOpenChange={(open) => !open && onDismiss()}>
      <AlertDialogContent onCloseAutoFocus={returnFocus}>
        <AlertDialogHeader>
          <AlertDialogTitle>Switch to {pending ? creationMethodLabels[pending].name : ''}?</AlertDialogTitle>
          <AlertDialogDescription>
            Your characteristic values will be cleared.
            {pending && clearsSkills(pending) ? ' Your skill values will be cleared too.' : ''}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Keep current method</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive text-white hover:bg-destructive/90"
            onClick={() => {
              if (pending) {
                onConfirm(pending)
              }
            }}
          >
            Switch and clear
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
/**
 * The creation method choice (specs/character-sheet/ux.md sections 5.5 and 6.2): text when the Campaign allows one
 * method (UX-10), otherwise a RadioGroup; switching after values were entered needs confirmation (UX-8), and
 * cancelling keeps the method and returns focus to the radio that opened the dialog (A11Y-8). Once characteristics
 * are rolled the method is locked and shows as text with the reason (UX-32).
 */
export function CreationMethodChoice({ allowed, value, locked = false, canStartOver = false, needsConfirmation, clearsSkills, error, onChange }: CreationMethodChoiceProps) {
  const labelId = useId()
  const [pending, setPending] = useState<CreationMethod | null>(null)
  const methods = inCanonicalOrder(allowed)

  if (methods.length === 1 && !locked) {
    return <p className="text-sm">Creation method: {creationMethodLabels[methods[0]].name}</p>
  }

  if (locked && value !== null) {
    return <LockedCreationMethod value={value} canStartOver={canStartOver} />
  }

  const choose = (method: string) => {
    const next = method as CreationMethod
    if (needsSwitchConfirmation(next, value, needsConfirmation)) {
      setPending(next)
    } else {
      onChange(next)
    }
  }

  const returnFocus = (event: Event) => {
    event.preventDefault()
    document.getElementById(radioId(value))?.focus()
  }

  return (
    <div className="flex flex-col gap-2">
      <span id={labelId} className="font-medium">
        Creation method
      </span>
      <RadioGroup id={fieldId('creationMethod')} aria-labelledby={labelId} value={value ?? ''} onValueChange={choose} className="flex flex-col gap-2">
        {methods.map((method) => (
          <div key={method} className="flex items-center gap-2">
            <RadioGroupItem id={radioId(method)} value={method} className="size-5" />
            <label htmlFor={radioId(method)} className="text-sm">
              {creationMethodLabels[method].name}
            </label>
          </div>
        ))}
      </RadioGroup>
      {error && <p className="text-sm text-destructive">{error}</p>}

      <SwitchConfirmationDialog
        pending={pending}
        clearsSkills={clearsSkills}
        onDismiss={() => setPending(null)}
        onConfirm={onChange}
        returnFocus={returnFocus}
      />
    </div>
  )
}

function radioId(method: CreationMethod | null): string {
  return `creation-method-${method ?? 'none'}`
}
