import { InteractionStatus, Logger } from '@azure/msal-browser'
import type { AccountInfo, IPublicClientApplication } from '@azure/msal-browser'
import { MsalContext } from '@azure/msal-react'
import type { ReactNode } from 'react'

const storyAccount = { homeAccountId: 'story-account', localAccountId: 'story-account', username: 'keeper' } as AccountInfo

interface StoryMsalProps {
  tokens?: 'pending' | 'failing' | 'granted'
  /** The session state: signed in (default), signed out, or MSAL still starting up. */
  session?: 'signedIn' | 'signedOut' | 'resolving'
  children: ReactNode
}

function storyToken(tokens: 'pending' | 'failing' | 'granted') {
  if (tokens === 'granted') {
    return Promise.resolve({ accessToken: 'story-token' })
  }
  return tokens === 'pending' ? new Promise(() => {}) : Promise.reject(new Error('Story: no token'))
}

/**
 * Story-only MSAL context for components that request tokens themselves. Token requests either never settle (so the
 * API is never called and the component stays busy), fail (so the component shows its error state), or succeed with a
 * placeholder token (for stories that stub fetch). Sign-in does
 * nothing.
 */
export function StoryMsal({ tokens = 'pending', session = 'signedIn', children }: StoryMsalProps) {
  const instance = {
    acquireTokenSilent: () => storyToken(tokens),
    loginRedirect: () => Promise.resolve(),
  } as unknown as IPublicClientApplication
  const inProgress = session === 'resolving' ? InteractionStatus.Startup : InteractionStatus.None
  const accounts = session === 'signedIn' ? [storyAccount] : []

  return (
    <MsalContext.Provider value={{ instance, inProgress, accounts, logger: new Logger({}) }}>
      {children}
    </MsalContext.Provider>
  )
}
