import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { HeadingOffsetProvider } from './heading-offset'
import { headingTag, useHeadingTag } from './heading-offset-context'

// PBI-NAV-002 design record D5: a context shifts the headings of an extracted body inside a panel;
// pages without a provider render their levels unchanged.
describe('headingTag', () => {
  it('shifts a level by the offset', () => {
    expect(headingTag(1, 3)).toBe('h4')
    expect(headingTag(2, 1)).toBe('h3')
    expect(headingTag(3, -1)).toBe('h2')
  })

  it('clamps to h1 at the top and h6 at the bottom', () => {
    expect(headingTag(1, -2)).toBe('h1')
    expect(headingTag(5, 3)).toBe('h6')
    expect(headingTag(6, 3)).toBe('h6')
    expect(headingTag(2, 0)).toBe('h2')
  })
})

function Probe({ level }: { level: 1 | 2 | 3 }) {
  const tag = useHeadingTag(level)

  return (
    <span data-testid="probe" data-tag={tag}>
      Heading
    </span>
  )
}

describe('HeadingOffsetProvider', () => {
  it('leaves levels unchanged with no provider', () => {
    render(<Probe level={2} />)

    expect(screen.getByTestId('probe').getAttribute('data-tag')).toBe('h2')
  })

  it('shifts levels inside the provider', () => {
    render(
      <HeadingOffsetProvider value={3}>
        <Probe level={1} />
      </HeadingOffsetProvider>,
    )

    expect(screen.getByTestId('probe').getAttribute('data-tag')).toBe('h4')
  })
})
