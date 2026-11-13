import { ChevronDown } from 'lucide-react'

import { formatWallEntryTime } from '@/campaign-play/services/wallEntryTime'
import type { RollRecord } from '@/campaign-play/types/CharacterSheet'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/shared/components/ui/collapsible'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/components/ui/table'

/** Who rolled (ux.md 6.8, answer 3c): the server for its rolls, the Player's name for typed-in rows. */
function rolledBy(record: RollRecord): string {
  const name = record.rolledByDisplayName ?? 'Unknown'
  return record.source === 'Server' ? `Server, for ${name}` : `${name} (entered)`
}

/** A readable "Rolled for" for a Roll Record purpose (specs/character-sheet/spec.md, Roll Records). */
function rolledFor(purpose: string): string {
  if (purpose === 'Luck') {
    return 'Luck'
  }

  if (purpose === 'Luck:SecondRoll') {
    return 'Luck, second roll'
  }

  const characteristic = /^Characteristic:([A-Z]{3})$/.exec(purpose)
  if (characteristic) {
    return characteristic[1]
  }

  const check = /^EduImprovement\[(\d+)\]\.(Check|Gain)$/.exec(purpose)
  if (check) {
    return check[2] === 'Check' ? `EDU check ${check[1]}` : `EDU check ${check[1]} gain`
  }

  return purpose
}

interface DiceResultsProps {
  rollRecords: RollRecord[]
}

/**
 * The display order for replaced results (specs/character-sheet/ux.md section 7.1): each current row comes first;
 * the replaced rows with the same purpose follow it, newest first; replaced rows whose purpose has no current record
 * go at the end, in stored order.
 */
function orderDiceResults(rollRecords: RollRecord[]): RollRecord[] {
  const current = rollRecords.filter((record) => !record.isReplaced)
  const replaced = rollRecords.filter((record) => record.isReplaced)
  const currentPurposes = new Set(current.map((record) => record.purpose))
  const attached = new Set<RollRecord>()
  const rows: RollRecord[] = []
  for (const record of current) {
    rows.push(record)
    const own = replaced.filter((candidate) => candidate.purpose === record.purpose && !attached.has(candidate)).reverse()
    own.forEach((candidate) => attached.add(candidate))
    rows.push(...own)
  }
  rows.push(...replaced.filter((record) => !currentPurposes.has(record.purpose)))
  return rows
}

/** The Keeper's view of every dice result, collapsed by default (specs/character-sheet/ux.md section 7.1). */
export function DiceResults({ rollRecords }: DiceResultsProps) {
  return (
    <Collapsible className="flex flex-col gap-2">
      <CollapsibleTrigger className="flex min-h-6 items-center gap-2 self-start text-lg font-semibold">
        Dice results
        <ChevronDown aria-hidden="true" className="size-4" />
      </CollapsibleTrigger>
      <CollapsibleContent>
        {rollRecords.length === 0 ? (
          <p className="text-sm">No dice results yet.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead scope="col">Rolled for</TableHead>
                <TableHead scope="col">Dice</TableHead>
                <TableHead scope="col">Faces</TableHead>
                <TableHead scope="col">Result</TableHead>
                <TableHead scope="col">Rolled by</TableHead>
                <TableHead scope="col">When</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orderDiceResults(rollRecords).map((record, index) => (
                <TableRow key={`${record.purpose}-${record.isReplaced ? 'replaced' : 'current'}-${index}`}>
                  <TableCell>{rolledFor(record.purpose)}{record.isReplaced ? ' (replaced)' : ''}</TableCell>
                  <TableCell>{record.dice}</TableCell>
                  <TableCell>{record.faces?.join(', ') ?? 'Not recorded'}</TableCell>
                  <TableCell>{record.result}</TableCell>
                  <TableCell>{rolledBy(record)}</TableCell>
                  <TableCell>{record.rolledAt ? <RolledAt value={record.rolledAt} /> : 'Not recorded'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CollapsibleContent>
    </Collapsible>
  )
}

/** When the roll happened, in the viewer's locale and time zone (the wallEntryTime approach). */
function RolledAt({ value }: { value: string }) {
  const formatted = formatWallEntryTime(value, new Date())
  return (
    <time dateTime={value} title={formatted.label}>
      {formatted.text}
    </time>
  )
}
