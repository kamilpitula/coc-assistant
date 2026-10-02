import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'

import type { CreationMethod } from '@/campaign-play/types/Campaign'

import { RulesOptionsCollapsible } from './rules-options-collapsible'

function Harness({ initialOpen = false }: { initialOpen?: boolean }) {
  const [open, setOpen] = useState(initialOpen)
  const [methods, setMethods] = useState<CreationMethod[]>(['StandardRolling', 'PointBuy', 'QuickFire'])
  return (
    <RulesOptionsCollapsible
      open={open}
      onOpenChange={setOpen}
      allowedCreationMethods={methods}
      onAllowedCreationMethodsChange={setMethods}
    />
  )
}

/** specs/character-sheet/ux.md section 2 and A11Y-11. */
describe('RulesOptionsCollapsible', () => {
  it('is collapsed by default and names the trigger with the rules options summary', () => {
    render(<Harness />)

    const trigger = screen.getByRole('button', {
      name: 'Rules options 1920s - Standard rolling, Point buy, Quick fire',
    })
    expect(trigger).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument()
  })

  it('shows the read-only Era and the creation methods when expanded', async () => {
    const user = userEvent.setup()
    render(<Harness />)

    await user.click(screen.getByRole('button', { name: /^rules options/i }))

    expect(screen.getByRole('button', { name: /^rules options/i })).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByText('1920s', { selector: 'dd' })).toBeInTheDocument()
    expect(screen.getByText("The era can't be changed after the Campaign is created.")).toBeInTheDocument()
    expect(screen.getAllByRole('checkbox')).toHaveLength(3)
    screen.getAllByRole('checkbox').forEach((checkbox) => expect(checkbox).toBeChecked())
  })

  it('updates the summary when a creation method is unchecked', async () => {
    const user = userEvent.setup()
    render(<Harness initialOpen />)

    await user.click(screen.getByRole('checkbox', { name: /^quick fire/i }))

    expect(
      screen.getByRole('button', { name: 'Rules options 1920s - Standard rolling, Point buy' }),
    ).toBeInTheDocument()
  })

  it('shows the validation error inside the expanded section', () => {
    render(
      <RulesOptionsCollapsible
        open
        onOpenChange={vi.fn()}
        allowedCreationMethods={[]}
        onAllowedCreationMethodsChange={vi.fn()}
        error="Choose at least one creation method."
      />,
    )

    expect(screen.getByRole('alert')).toHaveTextContent('Choose at least one creation method.')
  })
})
