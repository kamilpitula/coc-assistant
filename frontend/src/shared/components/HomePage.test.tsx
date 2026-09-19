import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { HomePage } from '@/shared/components/HomePage'

describe('HomePage', () => {
  it('renders the header, description, and illustration', () => {
    render(<HomePage />)

    expect(screen.getByText('CoC Assistant')).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: /call of cthulhu campaign assistant/i }),
    ).toBeInTheDocument()
    expect(screen.getByText(/prepare and run your call of cthulhu/i)).toBeInTheDocument()
    expect(document.querySelector('svg[aria-hidden="true"]')).toBeInTheDocument()
  })
})
