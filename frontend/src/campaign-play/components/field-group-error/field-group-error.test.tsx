import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { groupDescribedBy } from '@/campaign-play/services/fieldIds'

import { FieldGroupError } from './field-group-error'

describe('FieldGroupError', () => {
  it('renders the error with the id its group refers to', () => {
    render(
      <fieldset aria-describedby={groupDescribedBy('characteristics', 'Add up to 460.')}>
        <legend>Characteristics</legend>
        <FieldGroupError field="characteristics" error="Add up to 460." />
      </fieldset>,
    )

    expect(screen.getByRole('group', { name: 'Characteristics' })).toHaveAccessibleDescription('Add up to 460.')
  })

  it('renders nothing without an error', () => {
    const { container } = render(<FieldGroupError field="characteristics" />)

    expect(container).toBeEmptyDOMElement()
    expect(groupDescribedBy('characteristics')).toBeUndefined()
  })
})
