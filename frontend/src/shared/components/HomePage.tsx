import { Header } from '@/shared/components/Header'
import { HeroIllustration } from '@/shared/components/HeroIllustration'

export function HomePage() {
  return (
    <div className="flex min-h-svh flex-col">
      <Header />
      <main className="grid flex-1 grid-cols-1 items-center gap-10 px-6 py-12 md:grid-cols-2 md:px-16">
        <div className="space-y-4">
          <h1 className="text-3xl font-semibold">Call of Cthulhu Campaign Assistant</h1>
          <p className="text-muted-foreground">
            Prepare and run your Call of Cthulhu 7th Edition campaigns in one place.
            Keep scenarios, investigators, and the shared play record organized for
            every Keeper and Player at the table.
          </p>
        </div>
        <div className="flex justify-center">
          <HeroIllustration />
        </div>
      </main>
    </div>
  )
}
