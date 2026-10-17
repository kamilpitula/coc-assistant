import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

import { RICH_TEXT_MAX_BYTES, RICH_TEXT_NODE_TYPES } from '@/shared/services/richText'
import { createTestEditor, loadDocument, serialize } from '@/shared/test-support/richTextEditor'

// The shared definition both stacks satisfy (ADR 0015 amendment); the backend reads the same file in RichTextDocumentTests.
interface FixtureCase {
  name: string
  expected: 'accepted' | 'refused'
  document: unknown
}

const fixtures = JSON.parse(
  readFileSync(resolve(process.cwd(), '../specs/scenario-preparation/rich-text-fixtures.json'), 'utf-8'),
) as { maxBytes: number; cases: FixtureCase[] }

const accepted = fixtures.cases.filter((fixtureCase) => fixtureCase.expected === 'accepted')
const everyNode = fixtures.cases.find((fixtureCase) => fixtureCase.name === 'every allowed node')

describe('rich-text fixtures', () => {
  it('agree with the frontend byte limit', () => {
    expect(fixtures.maxBytes).toBe(RICH_TEXT_MAX_BYTES)
  })

  it('has an every-node case that uses every allowed node type', () => {
    const types = new Set<string>()
    const walk = (node: unknown) => {
      const { type, children } = node as { type: string; children?: unknown[] }
      types.add(type)
      children?.forEach(walk)
    }
    walk((everyNode?.document as { root: unknown }).root)

    expect([...types].sort()).toEqual([...RICH_TEXT_NODE_TYPES].sort())
  })

  it.each(accepted.map((fixtureCase) => [fixtureCase.name, fixtureCase.document] as const))(
    'parses the accepted document "%s" into the editor',
    (_name, document) => {
      const editor = createTestEditor()

      expect(() => loadDocument(editor, document)).not.toThrow()
    },
  )

  it('serializes every allowed node exactly as the every-node fixture does, which catches a Lexical upgrade that changes the JSON', () => {
    const editor = createTestEditor()

    loadDocument(editor, everyNode?.document)

    expect(serialize(editor)).toEqual(everyNode?.document)
  })
})
