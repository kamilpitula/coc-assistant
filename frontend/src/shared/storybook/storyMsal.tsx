import { InteractionStatus, Logger } from '@azure/msal-browser'
import type { AccountInfo, IPublicClientApplication } from '@azure/msal-browser'
import { MsalContext } from '@azure/msal-react'
import type { ReactNode } from 'react'

const storyAccount = { homeAccountId: 'story-account', localAccountId: 'story-account', username: 'keeper' } as AccountInfo

/**
 * Story-only MSAL context for components that request tokens themselves. Token requests either never settle (so the
 * API is never called and the component stays busy) or fail (so the component shows its error state).
 */
export function StoryMsal({ tokens = 'pending', children }: { tokens?: 'pending' | 'failing'; children: ReactNode }) {
  const instance = {
    acquireTokenSilent: () => (tokens === 'pending' ? new Promise(() => {}) : Promise.reject(new Error('Story: no token'))),
  } as unknown as IPublicClientApplication

  return (
    <MsalContext.Provider value={{ instance, inProgress: InteractionStatus.None, accounts: [storyAccount], logger: new Logger({}) }}>
      {children}
    </MsalContext.Provider>
  )
}
