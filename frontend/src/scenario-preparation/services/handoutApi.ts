import { z } from 'zod'

import { authHeaders, bearerHeaders } from '@/campaign-play/services/authHeaders'
import { handoutFileTooLargeMessage, type HandoutFileFamily } from '@/scenario-preparation/services/handoutFile'
import { describeHandoutOwner, type HandoutOwner } from '@/scenario-preparation/services/handoutOwner'
import { handoutSummarySchema, richTextSchema, SceneFinishedError } from '@/scenario-preparation/services/sceneApi'
import { readValidationProblems } from '@/scenario-preparation/services/validationProblem'
import {
  HANDOUT_KIND_FAMILIES,
  isFileInput,
  type FileHandoutInput,
  type FileHandoutKind,
  type Handout,
  type HandoutField,
  type HandoutInput,
  type HandoutSummary,
  type RichTextHandoutInput,
} from '@/scenario-preparation/types/Handout'

/** The messages the server returned for a refused Handout, by field (ADR 0018). */
export type HandoutFieldErrors = Partial<Record<HandoutField, string>>

const fileDetailsSchema = z.strictObject({ name: z.string(), mediaType: z.string(), sizeBytes: z.number() })

// Strict, so a field the contract does not name (such as a position) is rejected instead of silently passed on. Exactly one of
// content and file is present; the other arrives as null and is dropped.
const richTextHandoutSchema = z
  .strictObject({
    id: handoutSummarySchema.shape.id,
    visibility: handoutSummarySchema.shape.visibility,
    title: handoutSummarySchema.shape.title,
    kind: z.enum(['ReadAloud', 'Text']),
    content: richTextSchema,
    file: z.null().optional(),
  })
  .transform(({ id, kind, visibility, title, content }) => ({ id, kind, visibility, title, content }))

const fileHandoutSchema = z
  .strictObject({
    id: handoutSummarySchema.shape.id,
    visibility: handoutSummarySchema.shape.visibility,
    title: handoutSummarySchema.shape.title,
    kind: z.enum(['Image', 'Document', 'Map']),
    content: z.null(),
    file: fileDetailsSchema,
  })
  .transform(({ id, kind, visibility, title, file }) => ({ id, kind, visibility, title, file }))

const handoutSchema = z.union([richTextHandoutSchema, fileHandoutSchema])

const handoutListSchema = z.strictObject({ handouts: z.array(handoutSummarySchema) })

export const handoutQueryKeys = {
  /** One Handout, keyed under its owner so that reloading the owner reaches it. */
  detail: (owner: HandoutOwner, handoutId: string) => [...describeHandoutOwner(owner).handoutsKey, handoutId] as const,
  /** The stored file of a file Handout, under the Handout so that a write to the Handout can invalidate it. */
  file: (owner: HandoutOwner, handoutId: string) => [...describeHandoutOwner(owner).handoutsKey, handoutId, 'file'] as const,
}

/** The API answered 404: the Handout, or its owner, is outside the caller's visibility or gone. */
export class HandoutNotFoundError extends Error {
  constructor() {
    super('The Handout was not found')
    this.name = 'HandoutNotFoundError'
  }
}

/** The API answered 400 with the server's message for each refused field. */
export class HandoutValidationError extends Error {
  readonly fieldErrors: HandoutFieldErrors

  constructor(fieldErrors: HandoutFieldErrors) {
    super('The Handout was refused')
    this.name = 'HandoutValidationError'
    this.fieldErrors = fieldErrors
  }
}

/** The API answered 409 to a delete: only a Handout on a Prepared Scene, or of an Item that is not in play, can be deleted. */
export class HandoutNotDeletableError extends Error {
  constructor() {
    super('The Handout can not be deleted now')
    this.name = 'HandoutNotDeletableError'
  }
}

/** The API answered 409 to a reorder: the requested order is not the owner's current set of Handouts. */
export class StaleHandoutOrderError extends Error {
  constructor() {
    super('The Handout order is stale')
    this.name = 'StaleHandoutOrderError'
  }
}

const FIELDS: Record<string, HandoutField> = {
  title: 'title',
  kind: 'kind',
  visibility: 'visibility',
  content: 'content',
  file: 'file',
}

const handoutsUrl = (owner: HandoutOwner): string => describeHandoutOwner(owner).handoutsUrl

async function readFieldErrors(response: Response): Promise<HandoutFieldErrors> {
  const errors: HandoutFieldErrors = {}
  for (const problem of await readValidationProblems(response)) {
    const field = FIELDS[problem.path]
    if (field && problem.messages[0]) {
      errors[field] = problem.messages[0]
    }
  }
  return errors
}

// For Handout writes other than delete and reorder, a 409 only means the Scene is Finished; an Item is never Finished.
async function failWrite(response: Response, description: string): Promise<never> {
  if (response.status === 404) {
    throw new HandoutNotFoundError()
  }
  if (response.status === 400) {
    throw new HandoutValidationError(await readFieldErrors(response))
  }
  if (response.status === 409) {
    throw new SceneFinishedError()
  }
  throw new Error(`Failed to ${description} (${response.status})`)
}

// A 413 is a body over the server's limit: the file is too large, shown at the file field like the server's own message.
async function failFileWrite(response: Response, description: string, kind: FileHandoutKind): Promise<never> {
  if (response.status === 413) {
    throw new HandoutValidationError({ file: handoutFileTooLargeMessage(HANDOUT_KIND_FAMILIES[kind] as HandoutFileFamily) })
  }
  return failWrite(response, description)
}

const toBody = (input: RichTextHandoutInput): string =>
  JSON.stringify({ kind: input.kind, visibility: input.visibility, title: input.title, content: input.content })

// No Content-Type is set by hand: the browser adds the multipart boundary. An absent file part keeps the stored file.
function toFormData(input: FileHandoutInput): FormData {
  const form = new FormData()
  form.set('kind', input.kind)
  form.set('visibility', input.visibility)
  form.set('title', input.title)
  if (input.file) {
    form.set('file', input.file, input.file.name)
  }
  return form
}

/** Calls GET .../handouts/{handoutId}; null when the API answers 404. */
export async function getHandout(
  accessToken: string,
  owner: HandoutOwner,
  handoutId: string,
): Promise<Handout | null> {
  const response = await fetch(`${handoutsUrl(owner)}/${handoutId}`, { headers: authHeaders(accessToken) })

  if (response.status === 404) {
    return null
  }
  if (!response.ok) {
    throw new Error(`Failed to load the Handout (${response.status})`)
  }

  return handoutSchema.parse(await response.json())
}

/** Calls POST .../handouts, which adds a Handout after the owner's others: JSON for text, multipart for a file kind. */
export async function createHandout(
  accessToken: string,
  owner: HandoutOwner,
  input: HandoutInput,
): Promise<Handout> {
  return isFileInput(input)
    ? createFileHandout(accessToken, owner, input)
    : createRichTextHandout(accessToken, owner, input)
}

async function createRichTextHandout(
  accessToken: string,
  owner: HandoutOwner,
  input: RichTextHandoutInput,
): Promise<Handout> {
  const response = await fetch(handoutsUrl(owner), {
    method: 'POST',
    headers: authHeaders(accessToken),
    body: toBody(input),
  })

  if (!response.ok) {
    return failWrite(response, 'create the Handout')
  }

  return handoutSchema.parse(await response.json())
}

/** Calls PUT .../handouts/{handoutId}, which replaces the kind, visibility, title, and content or file. */
export async function editHandout(
  accessToken: string,
  owner: HandoutOwner,
  handoutId: string,
  input: HandoutInput,
): Promise<Handout> {
  return isFileInput(input)
    ? editFileHandout(accessToken, owner, handoutId, input)
    : editRichTextHandout(accessToken, owner, handoutId, input)
}

async function editRichTextHandout(
  accessToken: string,
  owner: HandoutOwner,
  handoutId: string,
  input: RichTextHandoutInput,
): Promise<Handout> {
  const response = await fetch(`${handoutsUrl(owner)}/${handoutId}`, {
    method: 'PUT',
    headers: authHeaders(accessToken),
    body: toBody(input),
  })

  if (!response.ok) {
    return failWrite(response, 'save the Handout')
  }

  return handoutSchema.parse(await response.json())
}

/** Calls POST .../handouts as a multipart form, which adds an Image, Document, or Map Handout. */
export async function createFileHandout(
  accessToken: string,
  owner: HandoutOwner,
  input: FileHandoutInput,
): Promise<Handout> {
  const response = await fetch(handoutsUrl(owner), {
    method: 'POST',
    headers: bearerHeaders(accessToken),
    body: toFormData(input),
  })

  if (!response.ok) {
    return failFileWrite(response, 'create the Handout', input.kind)
  }

  return handoutSchema.parse(await response.json())
}

/** Calls PUT .../handouts/{handoutId} as a multipart form; without a file part the stored file is kept. */
export async function editFileHandout(
  accessToken: string,
  owner: HandoutOwner,
  handoutId: string,
  input: FileHandoutInput,
): Promise<Handout> {
  const response = await fetch(`${handoutsUrl(owner)}/${handoutId}`, {
    method: 'PUT',
    headers: bearerHeaders(accessToken),
    body: toFormData(input),
  })

  if (!response.ok) {
    return failFileWrite(response, 'save the Handout', input.kind)
  }

  return handoutSchema.parse(await response.json())
}

/** Calls GET .../handouts/{handoutId}/file with the bearer token and returns the stored bytes; an img tag cannot send the header. */
export async function getHandoutFile(
  accessToken: string,
  owner: HandoutOwner,
  handoutId: string,
): Promise<Blob> {
  const response = await fetch(`${handoutsUrl(owner)}/${handoutId}/file`, { headers: bearerHeaders(accessToken) })

  if (response.status === 404) {
    throw new HandoutNotFoundError()
  }
  if (!response.ok) {
    throw new Error(`Failed to load the file (${response.status})`)
  }

  return response.blob()
}

/** Calls DELETE .../handouts/{handoutId}. A Handout that is already gone (404) counts as deleted; a 409 is refused. */
export async function deleteHandout(
  accessToken: string,
  owner: HandoutOwner,
  handoutId: string,
): Promise<void> {
  const response = await fetch(`${handoutsUrl(owner)}/${handoutId}`, {
    method: 'DELETE',
    headers: authHeaders(accessToken),
  })

  if (response.status === 409) {
    throw new HandoutNotDeletableError()
  }
  if (!response.ok && response.status !== 404) {
    throw new Error(`Failed to delete the Handout (${response.status})`)
  }
}

/** Calls PUT .../handouts/order with every Handout id; returns the Handouts in the new order. */
export async function reorderHandouts(
  accessToken: string,
  owner: HandoutOwner,
  handoutIds: string[],
): Promise<HandoutSummary[]> {
  const response = await fetch(`${handoutsUrl(owner)}/order`, {
    method: 'PUT',
    headers: authHeaders(accessToken),
    body: JSON.stringify({ handoutIds }),
  })

  if (response.status === 409) {
    throw new StaleHandoutOrderError()
  }
  if (response.status === 404) {
    throw new HandoutNotFoundError()
  }
  if (!response.ok) {
    throw new Error(`Failed to change the Handout order (${response.status})`)
  }

  return handoutListSchema.parse(await response.json()).handouts
}
