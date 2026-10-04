import { LogIn } from 'lucide-react'

import { Button } from '@/shared/components/ui/button'
import { useSignIn } from '@/shared/hooks/useSignIn'

interface SignInPromptProps {
  /** The page's own heading, so a signed-out visitor still sees where they are. */
  heading: string
}

/** Asks a signed-out visitor to sign in, in place of a page that needs an Account (specs/campaign-list/ux.md section 4). */
export function SignInPrompt({ heading }: SignInPromptProps) {
  const signIn = useSignIn()

  return (
    <section className="flex max-w-3xl flex-col items-start gap-4">
      <h1 className="text-2xl font-semibold">{heading}</h1>
      <p className="text-sm">Sign in to see your campaigns.</p>
      <Button type="button" onClick={() => void signIn()}>
        <LogIn aria-hidden="true" />
        Sign in
      </Button>
    </section>
  )
}
