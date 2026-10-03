import { Link } from '@tanstack/react-router'
import type { ReactNode } from 'react'

import type { WizardStep } from '@/campaign-play/services/wizardProgress'
import { CHARACTERISTIC_CODES, type CharacterSheetView as CharacterSheetData } from '@/campaign-play/types/CharacterSheet'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/components/ui/table'

interface CharacterSheetViewProps {
  sheet: CharacterSheetData
  playerName: string | null
  /** In edit mode, the Campaign id the "Change" links open the wizard steps of; omit for read-only. */
  changeLinksFor?: string
  /** Extra read-only sections, such as the Keeper's Dice results. */
  children?: ReactNode
}

function display(value: number | string | null): ReactNode {
  return value ?? (
    <>
      <span aria-hidden="true">&mdash;</span>
      <span className="sr-only">not yet calculated</span>
    </>
  )
}

function ChangeLink({ campaignId, step, label }: { campaignId?: string; step: WizardStep; label: string }) {
  if (!campaignId) {
    return null
  }

  return (
    <Link
      to="/campaigns/$campaignId/investigator/$step"
      params={{ campaignId, step }}
      className="text-sm underline underline-offset-4"
    >
      Change <span className="sr-only">{label}</span>
    </Link>
  )
}

/**
 * The shared Character Sheet view: read-only for the Player's View and the Keeper's review, with "Change" links on the
 * Sheet and submit step (specs/character-sheet/ux.md sections 6.7 and 7; PBI-CP-003 contents in section 9).
 */
export function CharacterSheetView({ sheet, playerName, changeLinksFor, children }: CharacterSheetViewProps) {
  const { identity, derived } = sheet
  const identityRows: [string, ReactNode][] = [
    ['Name', identity.name ?? 'Not named yet'],
    ['Player', playerName ?? 'Unknown Player'],
    ['Age', identity.age],
    ['Gender', identity.gender],
    ['Residence', identity.residence],
    ['Birthplace', identity.birthplace],
  ]
  const derivedRows: [string, ReactNode][] = [
    ['HP', display(derived.hitPoints)],
    ['MP', display(derived.magicPoints)],
    ['SAN', derived.sanity.current === null ? display(null) : `${derived.sanity.current} of ${derived.sanity.maximum}`],
    ['Luck', display(derived.luck)],
    ['MOV', display(derived.movementRate)],
    ['Build', display(derived.build)],
    ['Damage Bonus', display(derived.damageBonus)],
    ['Dodge', display(derived.dodge)],
  ]

  return (
    <div className="flex flex-col gap-6">
      <section aria-labelledby="sheet-summary-heading" className="flex flex-col gap-6">
        <h2 id="sheet-summary-heading" className="text-xl font-semibold">
          Summary
        </h2>

        <div className="flex flex-col gap-2">
          <div className="flex items-baseline justify-between gap-4">
            <h3 className="font-semibold">Identity</h3>
            <ChangeLink campaignId={changeLinksFor} step="identity" label="identity" />
          </div>
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
            {identityRows.map(([label, value]) => (
              <div key={label} className="contents">
                <dt className="text-muted-foreground">{label}</dt>
                <dd>{value ?? '-'}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex items-baseline justify-between gap-4">
            <h3 className="font-semibold">Characteristics</h3>
            <span className="flex gap-4">
              <ChangeLink campaignId={changeLinksFor} step="characteristics" label="characteristics" />
              <ChangeLink campaignId={changeLinksFor} step="age" label="age effects" />
            </span>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead scope="col">Characteristic</TableHead>
                <TableHead scope="col">Point buy</TableHead>
                <TableHead scope="col">After age effects</TableHead>
                <TableHead scope="col">Hard</TableHead>
                <TableHead scope="col">Extreme</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {CHARACTERISTIC_CODES.map((code) => {
                const characteristic = sheet.characteristics[code]
                return (
                  <TableRow key={code}>
                    <TableHead scope="row" className="text-foreground">
                      {code}
                    </TableHead>
                    <TableCell>{display(characteristic.assigned)}</TableCell>
                    <TableCell>{display(characteristic.value)}</TableCell>
                    <TableCell>{display(characteristic.hard)}</TableCell>
                    <TableCell>{display(characteristic.extreme)}</TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>

        <div className="flex flex-col gap-2">
          <h3 className="font-semibold">Derived values</h3>
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
            {derivedRows.map(([label, value]) => (
              <div key={label} className="contents">
                <dt className="text-muted-foreground">{label}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>
      {children}
    </div>
  )
}
