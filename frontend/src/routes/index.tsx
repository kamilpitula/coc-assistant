import { createFileRoute } from '@tanstack/react-router'

import { HomePage } from '@/shared/components/home-page/home-page'

export const Route = createFileRoute('/')({
  component: HomePage,
})
