import { useId, type ReactNode } from 'react'

import type { MoneyAmount, Wealth } from '@/campaign-play/types/CharacterSheet'

interface SheetWealthSectionProps {
  /** Computed by the server from Credit Rating and the Era (docs/game-rules section 11); null until calculable. */
  wealth: Wealth | null
}

function formatMoney(money: MoneyAmount, currency: string): string {
  const digits = Number.isInteger(money.amount) ? 0 : 2
  const amount = new Intl.NumberFormat('en-US', { style: 'currency', currency, minimumFractionDigits: digits, maximumFractionDigits: digits }).format(money.amount)
  return money.orMore ? `${amount} or more` : amount
}

const notYetCalculated = (
  <>
    <span aria-hidden="true">&mdash;</span>
    <span className="sr-only">not yet calculated</span>
  </>
)

/** The read-only Wealth (specs/character-sheet/ux.md section 6.7 item 6). */
export function SheetWealthSection({ wealth }: SheetWealthSectionProps) {
  const headingId = useId()
  const rows: [string, ReactNode][] = wealth
    ? [
        ['Spending level', formatMoney(wealth.spendingLevel, wealth.currency)],
        ['Cash', formatMoney(wealth.cash, wealth.currency)],
        ['Assets', wealth.assets ? formatMoney(wealth.assets, wealth.currency) : 'None'],
      ]
    : [
        ['Spending level', notYetCalculated],
        ['Cash', notYetCalculated],
        ['Assets', notYetCalculated],
      ]

  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-3">
      <h2 id={headingId} className="text-xl font-semibold">
        Wealth
      </h2>
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
        {rows.map(([label, value]) => (
          <div key={label} className="contents">
            <dt className="text-muted-foreground">{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}
