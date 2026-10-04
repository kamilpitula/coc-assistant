import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { SignInPrompt } from './sign-in-prompt'

// specs/campaign-list/ux.md section 4, Signed out (CL-UX-9).

const { mockSignIn } = vi.hoisted(() => ({ mockSignIn: vi.fn() }))

vi.mock('@/shared/hooks/useSignIn', () => ({ useSignIn: () => mockSignIn }))

describe('SignInPrompt', () => {
  it('shows the page heading, the explanation, and a Sign in button that starts sign-in', async () => {
    render(<SignInPrompt heading="Your campaigns" />)

    expect(screen.getByRole('heading', { level: 1, name: 'Your campaigns' })).toBeInTheDocument()
    expect(screen.getByText('Sign in to see your campaigns.')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }))
    expect(mockSignIn).toHaveBeenCalledOnce()
  })
})
