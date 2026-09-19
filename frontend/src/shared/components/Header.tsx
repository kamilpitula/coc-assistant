import { LogIn, UserPlus } from 'lucide-react'

import { Button } from '@/shared/components/ui/button'

export function Header() {
  return (
    <header className="flex items-center justify-between border-b border-border px-6 py-4">
      <span className="text-lg font-semibold">CoC Assistant</span>
      <div className="flex items-center gap-3">
        <Button variant="outline" onClick={() => {}}>
          <LogIn aria-hidden="true" />
          Sign In
        </Button>
        <Button onClick={() => {}}>
          <UserPlus aria-hidden="true" />
          Sign Up
        </Button>
      </div>
    </header>
  )
}
