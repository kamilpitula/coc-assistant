import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/components/ui/table'

interface StatTableProps {
  /** The column headings; the first names the row. */
  columns: string[]
  /** One entry per row, one string per column. */
  rows: string[][]
  /** Names the table for assistive technology. */
  label: string
}

/**
 * Stat values as a `Table` from 640px and as a `dl` per row below it, so nothing scrolls sideways at 320px
 * (specs/scenario-preparation/ux.md section 25.1; SP-A11Y-26).
 */
export function StatTable({ columns, rows, label }: StatTableProps) {
  return (
    <>
      <div className="hidden sm:block">
        <Table aria-label={label}>
          <TableHeader>
            <TableRow>
              {columns.map((column) => (
                <TableHead key={column} scope="col">
                  {column}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row, rowIndex) => (
              <TableRow key={`${row[0]}-${rowIndex}`}>
                {row.map((cell, cellIndex) => (
                  <TableCell key={columns[cellIndex]} className="break-words whitespace-normal">
                    {cell}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <ul className="flex flex-col gap-3 sm:hidden" aria-label={label}>
        {rows.map((row, rowIndex) => (
          <li key={`${row[0]}-${rowIndex}`}>
            <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
              {row.map((cell, cellIndex) => (
                <div key={columns[cellIndex]} className="contents">
                  <dt className="font-medium">{columns[cellIndex]}</dt>
                  <dd className="break-words">{cell}</dd>
                </div>
              ))}
            </dl>
          </li>
        ))}
      </ul>
    </>
  )
}
