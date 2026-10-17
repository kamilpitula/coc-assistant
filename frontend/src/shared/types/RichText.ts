/**
 * A rich-text document: Lexical's serialized editor state, stored and sent unchanged (ADR 0015). Only the root is typed;
 * the server validates the nodes inside, and the editor and view parse them with the shared node list.
 */
export interface RichTextDocument {
  root: {
    type: 'root'
    children: unknown[]
    [property: string]: unknown
  }
  [property: string]: unknown
}
