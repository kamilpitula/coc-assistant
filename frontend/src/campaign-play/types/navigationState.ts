/** A status message a page passes to the next page through navigation state, for example "Draft saved.". */
declare module '@tanstack/react-router' {
  interface HistoryState {
    statusMessage?: string
    /** Set to put focus on the next page's h1, for example after Duplicate. */
    focusHeading?: boolean
    /** Set to put focus on that Scene link's heading, for example after linking or saving a link. */
    focusLinkId?: string
  }
}

export {}
