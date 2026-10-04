import type { ReactNode } from 'react'

import { SignInPrompt } from '@/shared/components/sign-in-prompt/sign-in-prompt'
import { useAuthStatus } from '@/shared/hooks/useAuthStatus'

interface RequireSignInProps {
  /** The page heading the sign-in prompt shows. */
  heading: string
  children: ReactNode
}

/**
 * Renders its content only for a signed-in Account: the sign-in prompt for a signed-out visitor, and nothing while
 * MSAL resolves, so no request is made and nothing flashes (specs/campaign-list/ux.md section 4).
 */
export function RequireSignIn({ heading, children }: RequireSignInProps) {
  const authStatus = useAuthStatus()

  if (authStatus === 'resolving') {
    return null
  }
  return authStatus === 'signedIn' ? <>{children}</> : <SignInPrompt heading={heading} />
}
