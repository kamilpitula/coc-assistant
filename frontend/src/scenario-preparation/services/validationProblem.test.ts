import { describe, expect, it } from 'vitest'

import { readErrorKeys, readValidationProblems } from './validationProblem'

const jsonResponse = (body: unknown) => new Response(JSON.stringify(body), { status: 400 })

describe('readErrorKeys', () => {
  it('returns the error keys lower-cased, whatever the casing', async () => {
    const keys = await readErrorKeys(jsonResponse({ errors: { Title: ['x'], keeperNotes: ['y'] } }))

    expect(keys).toEqual(['title', 'keepernotes'])
  })

  it('returns nothing for a body without errors or one that is not JSON', async () => {
    expect(await readErrorKeys(jsonResponse({ title: 'Bad' }))).toEqual([])
    expect(await readErrorKeys(new Response('not json', { status: 400 }))).toEqual([])
  })
})

describe('readValidationProblems', () => {
  it('returns each request path lower-cased with the server messages, whatever the casing (ADR 0018)', async () => {
    const problems = await readValidationProblems(
      jsonResponse({ errors: { 'Characteristics.STR': ['Enter STR from 0 to 100.'], 'skills[2].value': ['a', 'b'], skills: ['Add at most 100 skills.'] } }),
    )

    expect(problems).toEqual([
      { path: 'characteristics.str', messages: ['Enter STR from 0 to 100.'] },
      { path: 'skills[2].value', messages: ['a', 'b'] },
      { path: 'skills', messages: ['Add at most 100 skills.'] },
    ])
  })

  it('drops non-text messages and returns nothing for another body or invalid JSON', async () => {
    expect(await readValidationProblems(jsonResponse({ errors: { name: [1, 'Enter a name.'], age: 'x' } }))).toEqual([
      { path: 'name', messages: ['Enter a name.'] },
      { path: 'age', messages: [] },
    ])
    expect(await readValidationProblems(jsonResponse({ title: 'Bad' }))).toEqual([])
    expect(await readValidationProblems(new Response('not json', { status: 400 }))).toEqual([])
  })
})
