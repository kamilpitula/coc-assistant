import { render, screen } from '@testing-library/react'
import { createRef } from 'react'
import { describe, expect, it } from 'vitest'

import { MythosCreatureHeading } from './mythos-creature-heading'

// specs/scenario-preparation/ux.md section 25.1; SP-A11Y-18.

describe('MythosCreatureHeading', () => {
  it('shows the name as the h1 and the type with the Creature Kind when set', () => {
    render(<MythosCreatureHeading name="Ghoul" creatureKind="Mythos" />)

    expect(screen.getByRole('heading', { level: 1, name: 'Ghoul' })).toBeInTheDocument()
    expect(screen.getByText(/Mythos Creature/)).toHaveTextContent(/Mythos Creature.*, Mythos$/)
  })

  it('shows only the type when no Creature Kind is set', () => {
    render(<MythosCreatureHeading name="Ghoul" creatureKind={null} />)

    expect(screen.getByText('Mythos Creature')).toBeInTheDocument()
  })

  it('can take focus', () => {
    const ref = createRef<HTMLHeadingElement>()
    render(<MythosCreatureHeading ref={ref} name="Ghoul" creatureKind={null} />)

    ref.current?.focus()

    expect(screen.getByRole('heading', { level: 1 })).toHaveFocus()
  })
})
