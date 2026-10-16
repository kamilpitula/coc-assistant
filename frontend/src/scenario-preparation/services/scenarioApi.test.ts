import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  createScenario,
  editScenario,
  getScenario,
  getScenarios,
  reorderScenarios,
  ScenarioNotFoundError,
  ScenarioValidationError,
  scenarioQueryKeys,
  StaleScenarioOrderError,
} from './scenarioApi'

// specs/scenario-preparation/spec.md and the design record D3, D5, D10: /api/campaigns/{campaignId}/scenarios.
function jsonResponse(status: number, body?: unknown): Response {
  return new Response(body === undefined ? null : JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

const haunting = { id: 's1', title: 'The Haunting', keeperNotes: '' }
const edge = { id: 's2', title: 'Edge of Darkness', keeperNotes: 'Notes' }

describe('scenario API', () => {
  const fetchMock = vi.fn<typeof fetch>()

  beforeEach(() => vi.stubGlobal('fetch', fetchMock))

  afterEach(() => {
    vi.unstubAllGlobals()
    fetchMock.mockReset()
  })

  it('keys the queries under the Campaign so one invalidation can cover them', () => {
    expect(scenarioQueryKeys.list('c1')).toEqual(['campaigns', 'c1', 'scenarios', 'list'])
    expect(scenarioQueryKeys.detail('c1', 's1')).toEqual(['campaigns', 'c1', 'scenarios', 's1'])
  })

  describe('getScenarios', () => {
    it('returns the Scenarios in the order the server sends them', async () => {
      fetchMock.mockResolvedValue(jsonResponse(200, { scenarios: [haunting, edge] }))

      const scenarios = await getScenarios('token', 'c1')

      expect(scenarios).toEqual([haunting, edge])
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/campaigns/c1/scenarios',
        expect.objectContaining({ headers: expect.objectContaining({ Authorization: 'Bearer token' }) }),
      )
    })

    it('rejects a Scenario with a field beyond the contract, such as a position', async () => {
      fetchMock.mockResolvedValue(jsonResponse(200, { scenarios: [{ ...haunting, position: 1 }] }))

      await expect(getScenarios('token', 'c1')).rejects.toThrow()
    })

    it('rejects a list with a field beyond the contract', async () => {
      fetchMock.mockResolvedValue(jsonResponse(200, { scenarios: [], total: 0 }))

      await expect(getScenarios('token', 'c1')).rejects.toThrow()
    })

    it('maps a 404 to not found and any other failure to an error', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse(404))
      await expect(getScenarios('token', 'c1')).rejects.toBeInstanceOf(ScenarioNotFoundError)

      fetchMock.mockResolvedValueOnce(jsonResponse(500))
      await expect(getScenarios('token', 'c1')).rejects.toThrow('Failed to load the Scenarios (500)')
    })
  })

  describe('getScenario', () => {
    it('returns the Scenario, or null for a 404', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse(200, haunting))
      expect(await getScenario('token', 'c1', 's1')).toEqual(haunting)
      expect(fetchMock.mock.calls[0][0]).toBe('/api/campaigns/c1/scenarios/s1')

      fetchMock.mockResolvedValueOnce(jsonResponse(404))
      expect(await getScenario('token', 'c1', 's9')).toBeNull()
    })

    it('throws for any other failure', async () => {
      fetchMock.mockResolvedValue(jsonResponse(500))

      await expect(getScenario('token', 'c1', 's1')).rejects.toThrow('Failed to load the Scenario (500)')
    })
  })

  describe('createScenario', () => {
    it('posts the title and notes and returns the created Scenario', async () => {
      fetchMock.mockResolvedValue(jsonResponse(201, haunting))

      const created = await createScenario('token', 'c1', { title: 'The Haunting', keeperNotes: '' })

      expect(created).toEqual(haunting)
      const [url, init] = fetchMock.mock.calls[0]
      expect(url).toBe('/api/campaigns/c1/scenarios')
      expect(init).toMatchObject({ method: 'POST', body: JSON.stringify({ title: 'The Haunting', keeperNotes: '' }) })
    })

    it('maps a 400 to field errors with the form messages, whatever the casing of the keys', async () => {
      fetchMock.mockResolvedValue(
        jsonResponse(400, { errors: { Title: ['The title must be between 1 and 200 characters.'], keeperNotes: ['Too long.'] } }),
      )

      const failure = await createScenario('token', 'c1', { title: 'x', keeperNotes: '' }).catch((error: unknown) => error)

      expect(failure).toBeInstanceOf(ScenarioValidationError)
      expect((failure as ScenarioValidationError).fieldErrors).toEqual({
        title: 'Enter a title.',
        keeperNotes: 'Keeper notes must be 10,000 characters or fewer.',
      })
    })

    it('maps a 404 to not found and other failures to an error', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse(404))
      await expect(createScenario('token', 'c1', { title: 'x', keeperNotes: '' })).rejects.toBeInstanceOf(ScenarioNotFoundError)

      fetchMock.mockResolvedValueOnce(jsonResponse(500))
      await expect(createScenario('token', 'c1', { title: 'x', keeperNotes: '' })).rejects.toThrow('Failed to create the Scenario (500)')
    })
  })

  describe('editScenario', () => {
    it('puts the title and notes and returns the saved Scenario', async () => {
      fetchMock.mockResolvedValue(jsonResponse(200, edge))

      const saved = await editScenario('token', 'c1', 's2', { title: 'Edge of Darkness', keeperNotes: 'Notes' })

      expect(saved).toEqual(edge)
      const [url, init] = fetchMock.mock.calls[0]
      expect(url).toBe('/api/campaigns/c1/scenarios/s2')
      expect(init).toMatchObject({ method: 'PUT' })
    })

    it('maps 400 to field errors and 404 to not found', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse(400, { errors: { title: ['x'] } }))
      await expect(editScenario('token', 'c1', 's2', { title: '', keeperNotes: '' })).rejects.toBeInstanceOf(ScenarioValidationError)

      fetchMock.mockResolvedValueOnce(jsonResponse(404))
      await expect(editScenario('token', 'c1', 's2', { title: 'x', keeperNotes: '' })).rejects.toBeInstanceOf(ScenarioNotFoundError)
    })
  })

  describe('reorderScenarios', () => {
    it('puts the full id list and returns the Scenarios in the new order', async () => {
      fetchMock.mockResolvedValue(jsonResponse(200, { scenarios: [edge, haunting] }))

      const scenarios = await reorderScenarios('token', 'c1', ['s2', 's1'])

      expect(scenarios).toEqual([edge, haunting])
      const [url, init] = fetchMock.mock.calls[0]
      expect(url).toBe('/api/campaigns/c1/scenarios/order')
      expect(init).toMatchObject({ method: 'PUT', body: JSON.stringify({ scenarioIds: ['s2', 's1'] }) })
    })

    it('maps a 409 to a stale order, a 404 to not found, and other failures to an error', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse(409, { title: 'The order does not match.' }))
      await expect(reorderScenarios('token', 'c1', ['s1'])).rejects.toBeInstanceOf(StaleScenarioOrderError)

      fetchMock.mockResolvedValueOnce(jsonResponse(404))
      await expect(reorderScenarios('token', 'c1', ['s1'])).rejects.toBeInstanceOf(ScenarioNotFoundError)

      fetchMock.mockResolvedValueOnce(jsonResponse(500))
      await expect(reorderScenarios('token', 'c1', ['s1'])).rejects.toThrow('Failed to change the Scenario order (500)')
    })
  })
})
