import { z } from 'zod'

/** The panel types of specs/navigation/ux.md section 3: the only values a host route accepts in `panel`. */
export const PANEL_TYPES = ['clues', 'entity', 'handout', 'reveal'] as const

export type PanelType = (typeof PANEL_TYPES)[number]

/**
 * The search params of a panel host route (specs/navigation/ux.md section 3): the panel type plus one identifier per type.
 * Every key is optional with a `.catch(undefined)` fallback, so schemas never throw and existing Links need no `search` prop.
 */
export const sidePanelSearchSchema = z.object({
  panel: z.enum(PANEL_TYPES).optional().catch(undefined),
  investigator: z.string().optional().catch(undefined),
  link: z.string().optional().catch(undefined),
  handout: z.string().optional().catch(undefined),
  reveal: z.string().optional().catch(undefined),
})

export type SidePanelSearch = z.infer<typeof sidePanelSearchSchema>

/** An open panel: the type plus its identifier. The clues panel of a Player carries no investigator. */
export type OpenPanel =
  | { type: 'clues'; investigatorId?: string }
  | { type: 'entity'; linkId: string }
  | { type: 'handout'; handoutId: string }
  | { type: 'reveal'; revealId: string }

/** The panel the search params describe, or null when they are incomplete or unknown (which opens no panel, silently). */
export function toOpenPanel(search: SidePanelSearch): OpenPanel | null {
  switch (search.panel) {
    case 'clues':
      return search.investigator === undefined ? { type: 'clues' } : { type: 'clues', investigatorId: search.investigator }
    case 'entity':
      return search.link === undefined ? null : { type: 'entity', linkId: search.link }
    case 'handout':
      return search.handout === undefined ? null : { type: 'handout', handoutId: search.handout }
    case 'reveal':
      return search.reveal === undefined ? null : { type: 'reveal', revealId: search.reveal }
    default:
      return null
  }
}

/** The search params that open the panel, carrying identifiers only. */
export function toPanelSearch(panel: OpenPanel): Record<string, string> {
  switch (panel.type) {
    case 'clues':
      return panel.investigatorId === undefined ? { panel: 'clues' } : { panel: 'clues', investigator: panel.investigatorId }
    case 'entity':
      return { panel: 'entity', link: panel.linkId }
    case 'handout':
      return { panel: 'handout', handout: panel.handoutId }
    case 'reveal':
      return { panel: 'reveal', reveal: panel.revealId }
  }
}
