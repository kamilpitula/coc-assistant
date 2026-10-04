import { createFileRoute } from '@tanstack/react-router'

import { HomeRedirect } from '@/shared/components/home-redirect/home-redirect'

export const Route = createFileRoute('/')({
  component: HomeRedirect,
})
