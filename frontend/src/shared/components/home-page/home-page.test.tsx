import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

import { HomePage } from './home-page'

describe('HomePage', () => {
  it('renders the header, description, and illustration', () => {
    const queryClient = new QueryClient()
    render(
      <QueryClientProvider client={queryClient}>
        <HomePage />
      </QueryClientProvider>,
    )

    expect(screen.getByText('CoC Assistant')).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: /call of cthulhu campaign assistant/i }),
    ).toBeInTheDocument()
    expect(screen.getByText(/prepare and run your call of cthulhu/i)).toBeInTheDocument()
    expect(document.querySelector('svg[aria-hidden="true"]')).toBeInTheDocument()
  })
})