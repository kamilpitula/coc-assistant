/** A status message a page passes to the next page through navigation state, for example "Draft saved.". */
declare module '@tanstack/react-router' {
  interface HistoryState {
    statusMessage?: string
  }
}

export {}
