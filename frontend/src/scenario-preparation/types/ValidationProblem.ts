/** One refused value from a 400: the lower-cased request path and the server's messages. */
export interface ValidationProblem {
  path: string
  messages: string[]
}
