import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { sceneOwner } from '@/scenario-preparation/test-support/handoutOwnerFixtures'
import type { RichTextDocument } from '@/shared/types/RichText'

import {
  createFileHandout,
  createHandout,
  deleteHandout,
  editFileHandout,
  editHandout,
  getHandout,
  getHandoutFile,
  HandoutNotDeletableError,
  HandoutNotFoundError,
  handoutQueryKeys,
  HandoutValidationError,
  reorderHandouts,
  StaleHandoutOrderError,
} from './handoutApi'
import { SceneFinishedError } from './sceneApi'

// specs/scenario-preparation/spec.md (Scene API, Handouts) and the design record: .../scenes/{a}/handouts[/{handoutId}].
function jsonResponse(status: number, body?: unknown): Response {
  return new Response(body === undefined ? null : JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

const content: RichTextDocument = { root: { type: 'root', children: [{ type: 'paragraph', children: [] }] } }
const handout = { id: 'h1', kind: 'ReadAloud', visibility: 'PlayerFacing', title: 'The front door', content }
const input = { kind: 'ReadAloud' as const, visibility: 'PlayerFacing' as const, title: 'The front door', content }
const baseUrl = '/api/campaigns/c1/scenarios/s1/scenes/a1/handouts'

describe('Handout API', () => {
  const fetchMock = vi.fn<typeof fetch>()

  beforeEach(() => vi.stubGlobal('fetch', fetchMock))

  afterEach(() => {
    vi.unstubAllGlobals()
    fetchMock.mockReset()
  })

  it('keys a Handout under its Scene, so invalidating the Scene also reaches its Handouts', () => {
    expect(handoutQueryKeys.detail(sceneOwner, 'h1')).toEqual(['campaigns', 'c1', 'scenarios', 's1', 'scenes', 'a1', 'handouts', 'h1'])
  })

  describe('getHandout', () => {
    it('returns the Handout with its content', async () => {
      fetchMock.mockResolvedValue(jsonResponse(200, handout))

      expect(await getHandout('token', sceneOwner, 'h1')).toEqual(handout)
      const [url, init] = fetchMock.mock.calls[0]
      expect(url).toBe(`${baseUrl}/h1`)
      expect(init?.headers).toEqual(expect.objectContaining({ Authorization: 'Bearer token' }))
    })

    it('returns null on 404 and rejects a field beyond the contract, such as a position', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse(404))
      expect(await getHandout('token', sceneOwner, 'h1')).toBeNull()

      fetchMock.mockResolvedValueOnce(jsonResponse(200, { ...handout, position: 2 }))
      await expect(getHandout('token', sceneOwner, 'h1')).rejects.toThrow()

      fetchMock.mockResolvedValueOnce(jsonResponse(200, { ...handout, kind: 'Image' }))
      await expect(getHandout('token', sceneOwner, 'h1')).rejects.toThrow()
    })

    it('fails on any other status', async () => {
      fetchMock.mockResolvedValue(jsonResponse(500))

      await expect(getHandout('token', sceneOwner, 'h1')).rejects.toThrow('Failed to load the Handout (500)')
    })
  })

  describe('createHandout', () => {
    it('posts the kind, visibility, title, and content and returns the Handout', async () => {
      fetchMock.mockResolvedValue(jsonResponse(201, handout))

      expect(await createHandout('token', sceneOwner, input)).toEqual(handout)
      const [url, init] = fetchMock.mock.calls[0]
      expect(url).toBe(baseUrl)
      expect(init?.method).toBe('POST')
      expect(JSON.parse(String(init?.body))).toEqual(input)
    })

    it('maps a 400 by request path to the server message of each field, a 409 to finished, and a 404 to not found', async () => {
      fetchMock.mockResolvedValueOnce(
        jsonResponse(400, {
          errors: {
            title: ['Enter a title.'],
            Kind: ['Choose Read-aloud or Text.'],
            visibility: ['Choose who can see this Handout.'],
            content: ["This text can't be saved. Shorten it or remove unsupported content."],
            unknown: ['ignored'],
          },
        }),
      )
      const refused = await createHandout('token', sceneOwner, input).catch((error: unknown) => error)
      expect(refused).toBeInstanceOf(HandoutValidationError)
      expect((refused as HandoutValidationError).fieldErrors).toEqual({
        title: 'Enter a title.',
        kind: 'Choose Read-aloud or Text.',
        visibility: 'Choose who can see this Handout.',
        content: "This text can't be saved. Shorten it or remove unsupported content.",
      })

      fetchMock.mockResolvedValueOnce(jsonResponse(409))
      await expect(createHandout('token', sceneOwner, input)).rejects.toBeInstanceOf(SceneFinishedError)

      fetchMock.mockResolvedValueOnce(jsonResponse(404))
      await expect(createHandout('token', sceneOwner, input)).rejects.toBeInstanceOf(HandoutNotFoundError)

      fetchMock.mockResolvedValueOnce(jsonResponse(500))
      await expect(createHandout('token', sceneOwner, input)).rejects.toThrow('Failed to create the Handout (500)')
    })
  })

  describe('editHandout', () => {
    it('puts the same fields to the Handout and returns it', async () => {
      fetchMock.mockResolvedValue(jsonResponse(200, { ...handout, kind: 'Text' }))

      const saved = await editHandout('token', sceneOwner, 'h1', { ...input, kind: 'Text' })

      expect(saved.kind).toBe('Text')
      const [url, init] = fetchMock.mock.calls[0]
      expect(url).toBe(`${baseUrl}/h1`)
      expect(init?.method).toBe('PUT')
      expect(JSON.parse(String(init?.body))).toEqual({ ...input, kind: 'Text' })
    })

    it('maps 400, 404, and 409 like a create', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse(400, { errors: { title: ['Enter a title.'] } }))
      await expect(editHandout('token', sceneOwner, 'h1', input)).rejects.toBeInstanceOf(HandoutValidationError)
      fetchMock.mockResolvedValueOnce(jsonResponse(404))
      await expect(editHandout('token', sceneOwner, 'h1', input)).rejects.toBeInstanceOf(HandoutNotFoundError)
      fetchMock.mockResolvedValueOnce(jsonResponse(409))
      await expect(editHandout('token', sceneOwner, 'h1', input)).rejects.toBeInstanceOf(SceneFinishedError)
    })
  })

  describe('deleteHandout', () => {
    it('deletes the Handout, and a Handout that is already gone (404) counts as deleted', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse(204))
      await expect(deleteHandout('token', sceneOwner, 'h1')).resolves.toBeUndefined()
      expect(fetchMock.mock.calls[0][1]?.method).toBe('DELETE')
      expect(fetchMock.mock.calls[0][0]).toBe(`${baseUrl}/h1`)

      fetchMock.mockResolvedValueOnce(jsonResponse(404))
      await expect(deleteHandout('token', sceneOwner, 'h1')).resolves.toBeUndefined()
    })

    it('maps a 409 to not deletable, which covers Active and Finished Scenes, and fails on other statuses', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse(409))
      await expect(deleteHandout('token', sceneOwner, 'h1')).rejects.toBeInstanceOf(HandoutNotDeletableError)

      fetchMock.mockResolvedValueOnce(jsonResponse(500))
      await expect(deleteHandout('token', sceneOwner, 'h1')).rejects.toThrow('Failed to delete the Handout (500)')
    })
  })

  describe('reorderHandouts', () => {
    const summaries = [
      { id: 'h2', kind: 'Text', visibility: 'KeeperFacing', title: 'Second' },
      { id: 'h1', kind: 'ReadAloud', visibility: 'PlayerFacing', title: 'First' },
    ]

    it('puts every Handout id and returns the Handouts in the new order', async () => {
      fetchMock.mockResolvedValue(jsonResponse(200, { handouts: summaries }))

      expect(await reorderHandouts('token', sceneOwner, ['h2', 'h1'])).toEqual(summaries)
      const [url, init] = fetchMock.mock.calls[0]
      expect(url).toBe(`${baseUrl}/order`)
      expect(init?.method).toBe('PUT')
      expect(JSON.parse(String(init?.body))).toEqual({ handoutIds: ['h2', 'h1'] })
    })

    it('maps a 409 to a stale order and a 404 to not found', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse(409))
      await expect(reorderHandouts('token', sceneOwner, ['h1'])).rejects.toBeInstanceOf(StaleHandoutOrderError)

      fetchMock.mockResolvedValueOnce(jsonResponse(404))
      await expect(reorderHandouts('token', sceneOwner, ['h1'])).rejects.toBeInstanceOf(HandoutNotFoundError)

      fetchMock.mockResolvedValueOnce(jsonResponse(500))
      await expect(reorderHandouts('token', sceneOwner, ['h1'])).rejects.toThrow('Failed to change the Handout order (500)')
    })
  })

  describe('file Handouts', () => {
    const file = { name: 'plan.png', mediaType: 'image/png', sizeBytes: 68 }
    const fileHandout = { id: 'h2', kind: 'Map', visibility: 'PlayerFacing', title: 'Arkham', content: null, file }
    const parsedFileHandout = { id: 'h2', kind: 'Map', visibility: 'PlayerFacing', title: 'Arkham', file }
    const png = new File(['png'], 'plan.png', { type: 'image/png' })
    const fileInput = { kind: 'Map' as const, visibility: 'PlayerFacing' as const, title: 'Arkham', file: png }

    it('reads a file Handout without its null content, and a rich-text Handout without its null file', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse(200, fileHandout))
      expect(await getHandout('token', sceneOwner, 'h2')).toEqual(parsedFileHandout)

      fetchMock.mockResolvedValueOnce(jsonResponse(200, { ...handout, file: null }))
      expect(await getHandout('token', sceneOwner, 'h1')).toEqual(handout)
    })

    it('rejects a Handout with both or neither of content and file, or a file on a rich-text kind', async () => {
      for (const body of [
        { ...fileHandout, content },
        { ...fileHandout, file: null },
        { ...handout, file },
        { ...handout, content: null, file: null },
        { ...fileHandout, kind: 'ReadAloud' },
      ]) {
        fetchMock.mockResolvedValueOnce(jsonResponse(200, body))
        await expect(getHandout('token', sceneOwner, 'h2')).rejects.toThrow()
      }
    })

    it('keys the file under its Handout, so a Handout write can invalidate it', () => {
      expect(handoutQueryKeys.file(sceneOwner, 'h2')).toEqual([...handoutQueryKeys.detail(sceneOwner, 'h2'), 'file'])
    })

    it('sends a multipart form with the bearer token only, so the browser sets the boundary (SP-UX-78)', async () => {
      fetchMock.mockResolvedValue(jsonResponse(201, fileHandout))

      expect(await createFileHandout('token', sceneOwner, fileInput)).toEqual(parsedFileHandout)

      const [url, init] = fetchMock.mock.calls[0]
      expect(url).toBe(baseUrl)
      expect(init?.method).toBe('POST')
      expect(init?.headers).toEqual({ Authorization: 'Bearer token' })
      const form = init?.body as FormData
      expect(form).toBeInstanceOf(FormData)
      expect([form.get('kind'), form.get('visibility'), form.get('title')]).toEqual(['Map', 'PlayerFacing', 'Arkham'])
      expect((form.get('file') as File).name).toBe('plan.png')
    })

    it('sends no file part when an edit keeps the stored file (SP-UX-84)', async () => {
      fetchMock.mockResolvedValue(jsonResponse(200, fileHandout))

      await editFileHandout('token', sceneOwner, 'h2', { ...fileInput, file: null })

      const [url, init] = fetchMock.mock.calls[0]
      expect(url).toBe(`${baseUrl}/h2`)
      expect(init?.method).toBe('PUT')
      expect((init?.body as FormData).has('file')).toBe(false)
    })

    it('sends a file input through createHandout and editHandout as a multipart form', async () => {
      fetchMock.mockImplementation(async () => jsonResponse(201, fileHandout))

      await createHandout('token', sceneOwner, fileInput)
      await editHandout('token', sceneOwner, 'h2', fileInput)

      expect(fetchMock.mock.calls.map(([, init]) => init?.body instanceof FormData)).toEqual([true, true])
    })

    it('maps the server messages at file and kind to the form fields', async () => {
      fetchMock.mockResolvedValue(
        jsonResponse(400, { errors: { file: ['Choose a PDF.'], kind: ['Choose Image, Document, or Map.'], title: ['Enter a title.'] } }),
      )

      const error = await createFileHandout('token', sceneOwner, fileInput).catch((caught: unknown) => caught)

      expect(error).toBeInstanceOf(HandoutValidationError)
      expect((error as HandoutValidationError).fieldErrors).toEqual({
        file: 'Choose a PDF.',
        kind: 'Choose Image, Document, or Map.',
        title: 'Enter a title.',
      })
    })

    it('shows a 413 as the too-large message of the family at the file field (SP-UX-79)', async () => {
      fetchMock.mockResolvedValue(jsonResponse(413))

      const image = await createFileHandout('token', sceneOwner, fileInput).catch((caught: unknown) => caught)
      const pdf = await editFileHandout('token', sceneOwner, 'h2', { ...fileInput, kind: 'Document' }).catch((caught: unknown) => caught)

      expect((image as HandoutValidationError).fieldErrors).toEqual({ file: 'The image is larger than 20 MB. Choose a smaller one.' })
      expect((pdf as HandoutValidationError).fieldErrors).toEqual({ file: 'The PDF is larger than 20 MB. Choose a smaller one.' })
    })

    it('maps 404 to a missing Handout, 409 to a Finished Scene, and anything else to a plain failure', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse(404))
      await expect(createFileHandout('token', sceneOwner, fileInput)).rejects.toBeInstanceOf(HandoutNotFoundError)

      fetchMock.mockResolvedValueOnce(jsonResponse(409))
      await expect(editFileHandout('token', sceneOwner, 'h2', fileInput)).rejects.toBeInstanceOf(SceneFinishedError)

      fetchMock.mockResolvedValueOnce(jsonResponse(503))
      await expect(createFileHandout('token', sceneOwner, fileInput)).rejects.toThrow('Failed to create the Handout (503)')
    })

    it('fetches the file as a Blob with the bearer header, and maps 404 and other failures', async () => {
      fetchMock.mockResolvedValueOnce(new Response('png-bytes', { status: 200, headers: { 'Content-Type': 'image/png' } }))
      const blob = await getHandoutFile('token', sceneOwner, 'h2')
      expect(await blob.text()).toBe('png-bytes')
      const [url, init] = fetchMock.mock.calls[0]
      expect(url).toBe(`${baseUrl}/h2/file`)
      expect(init?.headers).toEqual({ Authorization: 'Bearer token' })

      fetchMock.mockResolvedValueOnce(jsonResponse(404))
      await expect(getHandoutFile('token', sceneOwner, 'h2')).rejects.toBeInstanceOf(HandoutNotFoundError)

      fetchMock.mockResolvedValueOnce(jsonResponse(503))
      await expect(getHandoutFile('token', sceneOwner, 'h2')).rejects.toThrow('Failed to load the file (503)')
    })
  })
})
