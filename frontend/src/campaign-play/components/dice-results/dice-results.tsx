import { ChevronDown } from 'lucide-react'

import type { RollRecord } from '@/campaign-play/types/CharacterSheet'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/shared/components/ui/collapsible'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/components/ui/table'

const sourceLabels: Record<string, string> = { PlayerEntered: 'Player' }

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
                <TableHead scope="col">Result</TableHead>
                <TableHead scope="col">Entered by</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rollRecords.map((record) => (
                <TableRow key={record.purpose}>
                  <TableCell>{rolledFor(record.purpose)}</TableCell>
                  <TableCell>{record.dice}</TableCell>
                  <TableCell>{record.result}</TableCell>
                  <TableCell>{sourceLabels[record.source] ?? record.source}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CollapsibleContent>
    </Collapsible>
  )
}
