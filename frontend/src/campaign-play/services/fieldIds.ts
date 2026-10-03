/** The DOM id of the control (or group) for a ValidationError field path, so error summary links can focus it. */
export function fieldId(field: string): string {
  return `field-${field.replace(/[^A-Za-z0-9]+/g, '-').replace(/-$/, '')}`
}

/** The DOM id of a field's inline error message, referenced by aria-describedby. */
export function errorId(field: string): string {
  return `${fieldId(field)}-error`
}

/** aria-describedby for a group of inputs that may have an error. */
export function groupDescribedBy(field: string, error?: string): string | undefined {
  return error ? errorId(field) : undefined
}
