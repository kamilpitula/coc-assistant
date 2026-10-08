import { describe, expect, it } from 'vitest'

import { findNonAscii } from './findNonAscii.ts'

describe('findNonAscii', () => {
  it('finds nothing in ASCII text', () => {
    expect(findNonAscii('a.md', 'plain text\r\nsecond line\n')).toEqual([])
  })

  it('reports each non-ASCII character with its line, column, and code point', () => {
    const content = 'first line\nLoading\u2026 \u2014 done\n'

    expect(findNonAscii('a.tsx', content)).toEqual([
      { path: 'a.tsx', line: 2, column: 8, codePoint: 'U+2026' },
      { path: 'a.tsx', line: 2, column: 10, codePoint: 'U+2014' },
    ])
  })

  it('counts a character outside the Basic Multilingual Plane as one column', () => {
    expect(findNonAscii('a.md', '\u{1F6A9}x\u00E9')).toEqual([
      { path: 'a.md', line: 1, column: 1, codePoint: 'U+1F6A9' },
      { path: 'a.md', line: 1, column: 3, codePoint: 'U+00E9' },
    ])
  })

  it('allows a byte order mark at the start of the file only', () => {
    expect(findNonAscii('a.cs', '\uFEFFnamespace A;\n')).toEqual([])
    expect(findNonAscii('a.cs', 'a\uFEFF')).toEqual([{ path: 'a.cs', line: 1, column: 2, codePoint: 'U+FEFF' }])
  })
})
