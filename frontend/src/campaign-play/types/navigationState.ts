/** A status message a page passes to the next page through navigation state, for example "Draft saved.". */
declare module '@tanstack/react-router' {
  interface HistoryState {
    statusMessage?: string
    /** Set to put focus on the next page's h1, for example after Duplicate. */
    focusHeading?: boolean
    /** Set to put focus on that Scene link's heading, for example after linking or saving a link. */
    focusLinkId?: string
    /** Set to put focus on that Item link in the Scene page's Items section, for example after linking an Item. */
    focusItemLinkId?: string
    /** Set to put focus on that Handout's link in the Scene page's list, for example after adding it. */
    focusHandoutId?: string
    /** Set to put focus on the Scene page's Handouts heading, for example after deleting a Handout. */
    focusHandoutsHeading?: boolean
  }
}

export {}
