import type { ReactNode } from 'react'

import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from '@/shared/components/ui/table'

export interface SkillAllocationRow {
  key: string
  /** The skill's display name, for example "Language (Other): Latin". */
  name: string
  /** A hint under the name, for example the Credit Rating range. */
  hint?: string
  base: number | null
  total: number | null
  /** The Player's control for the row: points, a Quick fire value, or a personal interest Checkbox. */
  control: ReactNode
}

interface SkillAllocationTableProps {
  caption: string
  /** The heading of the control column, for example "Points". */
  controlHeading: string
  rows: SkillAllocationRow[]
}

function Value({ value }: { value: number | null }) {
  return value === null ? (
    <>
      <span aria-hidden="true">&mdash;</span>
      <span className="sr-only">not yet calculated</span>
    </>
  ) : (
    <>{value}</>
  )
}

/** Skill, Base, the Player's control, and Total per skill (specs/character-sheet/ux.md sections 6.5 and 6.6). */
export function SkillAllocationTable({ caption, controlHeading, rows }: SkillAllocationTableProps) {
  return (
    <Table>
      <TableCaption className="sr-only">{caption}</TableCaption>
      <TableHeader>
        <TableRow>
          <TableHead>Skill</TableHead>
          <TableHead>Base</TableHead>
          <TableHead>{controlHeading}</TableHead>
          <TableHead>Total</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.key}>
            <TableCell>
              <span className="font-medium">{row.name}</span>
              {row.hint && <span className="block text-sm text-muted-foreground">{row.hint}</span>}
            </TableCell>
            <TableCell>
              <Value value={row.base} />
            </TableCell>
            <TableCell>{row.control}</TableCell>
            <TableCell>
              <Value value={row.total} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
