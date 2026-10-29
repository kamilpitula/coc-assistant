/** The part of a file query a file view needs (D8 of PBI-SPL-002): the Blob and the load state. A TanStack Query result fits it. */
export interface FileQuery {
  data: Blob | undefined
  isError: boolean
  errorUpdatedAt: number
  isFetching: boolean
  refetch: () => unknown
}
