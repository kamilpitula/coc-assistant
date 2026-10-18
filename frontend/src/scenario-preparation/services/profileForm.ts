import { fieldId } from '@/campaign-play/services/fieldIds'
import type { ValidationProblem } from '@/scenario-preparation/types/ValidationProblem'

/** The most rows a list holds (specs/scenario-preparation/spec.md, Constraints). */
export const MAX_ROWS = 100

/** The path of a row's field in the request, for example skills[2].value. */
export const rowPath = (list: string, index: number, field: string): string => `${list}[${index}].${field}`

/** The message of a field from the server's problems, matched in any letter case. */
export function messageFor(problems: ValidationProblem[], path: string): string | undefined {
  return problems.find((problem) => problem.path === path.toLowerCase())?.messages[0]
}

/** True when a server problem sits on one of these paths. */
export function hasProblemOn(problems: ValidationProblem[], paths: string[]): boolean {
  const wanted = new Set(paths.map((path) => path.toLowerCase()))
  return problems.some((problem) => wanted.has(problem.path))
}

export function replaceAt<T>(rows: T[], index: number, change: Partial<T>): T[] {
  return rows.map((row, position) => (position === index ? { ...row, ...change } : row))
}

/** After removing a row: the next row's first field, else the previous row's, else the list's Add button. */
export function focusAfterRemoval(list: string, remaining: number, index: number, firstField: string, addButtonId: string): string {
  if (remaining === 0) {
    return addButtonId
  }
  return fieldId(rowPath(list, Math.min(index, remaining - 1), firstField))
}
