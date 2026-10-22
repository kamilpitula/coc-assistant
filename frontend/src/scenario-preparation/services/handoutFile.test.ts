import { describe, expect, it } from 'vitest'

import { formatFileSize, HANDOUT_FILE_MAX_BYTES, validateHandoutFile } from './handoutFile'

// specs/scenario-preparation/ux.md sections 51 and 55; SP-UX-79.

const fileOf = (type: string, size: number, name = 'plan') => {
  const file = new File(['x'], name, { type })
  Object.defineProperty(file, 'size', { value: size })
  return file
}

describe('formatFileSize', () => {
  it.each([
    [0, '0 KB'],
    [1, '1 KB'],
    [870_400, '850 KB'],
    [870_401, '851 KB'],
    [1_048_575, '1024 KB'],
    [1_048_576, '1.0 MB'],
    [1_258_291, '1.2 MB'],
    [20_971_520, '20.0 MB'],
  ])('shows %i bytes as %s', (bytes, expected) => {
    expect(formatFileSize(bytes)).toBe(expected)
  })
})

describe('validateHandoutFile', () => {
  it('accepts a PNG, JPEG, WebP, or GIF image of up to 20 MB for a picture', () => {
    for (const type of ['image/png', 'image/jpeg', 'image/webp', 'image/gif']) {
      expect(validateHandoutFile('picture', fileOf(type, 1000))).toBeUndefined()
    }
    expect(validateHandoutFile('picture', fileOf('image/png', HANDOUT_FILE_MAX_BYTES))).toBeUndefined()
  })

  it('accepts a PDF of up to 20 MB for a document', () => {
    expect(validateHandoutFile('document', fileOf('application/pdf', HANDOUT_FILE_MAX_BYTES))).toBeUndefined()
  })

  it('asks for an image or a PDF when none is chosen', () => {
    expect(validateHandoutFile('picture', null)).toBe('Choose an image.')
    expect(validateHandoutFile('document', null)).toBe('Choose a PDF.')
  })

  it('refuses the wrong type for each family', () => {
    expect(validateHandoutFile('picture', fileOf('image/svg+xml', 10))).toBe('Choose a PNG, JPEG, WebP, or GIF image.')
    expect(validateHandoutFile('picture', fileOf('application/pdf', 10))).toBe('Choose a PNG, JPEG, WebP, or GIF image.')
    expect(validateHandoutFile('picture', fileOf('', 10))).toBe('Choose a PNG, JPEG, WebP, or GIF image.')
    expect(validateHandoutFile('document', fileOf('image/gif', 10))).toBe("This isn't a PDF. Choose a PDF.")
  })

  it('refuses a file over 20 MB for each family, after the type check', () => {
    expect(validateHandoutFile('picture', fileOf('image/png', HANDOUT_FILE_MAX_BYTES + 1))).toBe('The image is larger than 20 MB. Choose a smaller one.')
    expect(validateHandoutFile('document', fileOf('application/pdf', HANDOUT_FILE_MAX_BYTES + 1))).toBe('The PDF is larger than 20 MB. Choose a smaller one.')
    expect(validateHandoutFile('document', fileOf('image/png', HANDOUT_FILE_MAX_BYTES + 1))).toBe("This isn't a PDF. Choose a PDF.")
  })
})
