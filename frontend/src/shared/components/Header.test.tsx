import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import { Header } from '@/shared/components/Header'

describe('Header', () => {
  it('renders the brand text', () => {
    render(<Header />)
    expect(screen.getByText('CoC Assistant')).toBeInTheDocument()
  })

  it('renders Sign In and Sign Up buttons that are clickable', async () => {
    const user = userEvent.setup()
    render(<Header />)

    const signIn = screen.getByRole('button', { name: /sign in/i })
    const signUp = screen.getByRole('button', { name: /sign up/i })

    expect(signIn).toBeEnabled()
    expect(signUp).toBeEnabled()

    await user.click(signIn)
    await user.click(signUp)
  })
})
