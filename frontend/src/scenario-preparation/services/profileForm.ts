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

/** The id of the "Add {item}" button of a list, for example add-combat-weapons. */
export const addRowButtonId = (list: string): string => `add-${list.replace('.', '-')}`

/** The id of the "Add {section}" button in the "Add a section" group. */
export const addSectionButtonId = (section: string): string => `add-section-${section}`

/** The DOM id of the control for a request path. */
export const controlIdFor = (path: string): string => (path === 'keeperNotes' ? 'keeper-notes' : fieldId(path))

/** One problem to list in the error summary: its message and the canonical path of its field, when it has one. */
export interface SummaryProblem {
  message: string
  /** The path of the field the link focuses; null when no field matches (listed without a link). */
  path: string | null
}

/** Pairs each server message with its field by case-insensitive path (ADR 0018); `fieldPaths` are the paths that have a field on screen. */
export function summaryProblemsFor(fieldPaths: string[], problems: ValidationProblem[]): SummaryProblem[] {
  const known = new Map(fieldPaths.map((path) => [path.toLowerCase(), path]))
  return problems.flatMap((problem) =>
    problem.messages.map((message) => ({ message, path: known.get(problem.path.toLowerCase()) ?? null })),
  )
}
