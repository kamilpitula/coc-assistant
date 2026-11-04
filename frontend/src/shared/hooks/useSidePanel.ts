import { useNavigate, useRouter, useSearch } from '@tanstack/react-router'

import { closePanelNavigation, openPanelNavigation } from '@/shared/components/side-panel/sidePanelHistory'
import { sidePanelSearchSchema, toOpenPanel, type OpenPanel } from '@/shared/components/side-panel/sidePanelParams'
import { useSidePanelScope } from '@/shared/components/side-panel/side-panel-scope-context'

/**
 * The open panel of a host page and the controls to open and close it (PBI-NAV-002 design record D1 and D2): the panel
 * comes from the host route's `validateSearch` params, opening pushes an entry with the history-state marker (or
 * replaces the open panel's entry), and closing goes back with the marker or replaces without it. Neither direction
 * resets the scroll or remounts the page, and the current navigation state (e.g. a status message) is carried forward.
 */
export function useSidePanel() {
  const navigate = useNavigate()
  const router = useRouter()
  const { triggerRef } = useSidePanelScope()
  const search = useSearch({ strict: false })
  const panel = toOpenPanel(sidePanelSearchSchema.parse(search))

  const open = (next: OpenPanel, trigger?: HTMLElement | null) => {
    triggerRef.current = trigger ?? null
    const navigation = openPanelNavigation(next, router.state.location.state, panel !== null)
    void navigate({
      search: (previous) => ({ ...previous, ...navigation.search }),
      state: navigation.state,
      replace: navigation.replace,
      resetScroll: false,
    })
  }

  const close = () => {
    const navigation = closePanelNavigation(router.state.location.search, router.state.location.state)
    if (navigation.back) {
      router.history.back()
    } else {
      void navigate({ search: navigation.search, state: navigation.state, replace: navigation.replace, resetScroll: false })
    }
  }

  return { panel, open, close }
}
