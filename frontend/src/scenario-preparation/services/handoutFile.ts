/** What an Image, Document, or Map Handout holds (specs/scenario-preparation/ux.md sections 51 and 55): a picture or a PDF. */
export type HandoutFileFamily = 'picture' | 'document'

/** The largest file a Handout may hold: 20 MB (specs/scenario-preparation/spec.md, Constraints). */
export const HANDOUT_FILE_MAX_BYTES = 20 * 1024 * 1024

const BYTES_PER_KB = 1024
const BYTES_PER_MB = 1024 * 1024

export const HANDOUT_PICTURE_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif']
export const HANDOUT_DOCUMENT_TYPES = ['application/pdf']

/** The `accept` attribute of the native input for each family. */
export const HANDOUT_FILE_ACCEPT: Record<HandoutFileFamily, string> = {
  picture: HANDOUT_PICTURE_TYPES.join(','),
  document: HANDOUT_DOCUMENT_TYPES.join(','),
}

const MESSAGES: Record<HandoutFileFamily, { missing: string; wrongType: string; tooLarge: string }> = {
  picture: {
    missing: 'Choose an image.',
    wrongType: 'Choose a PNG, JPEG, WebP, or GIF image.',
    tooLarge: 'The image is larger than 20 MB. Choose a smaller one.',
  },
  document: {
    missing: 'Choose a PDF.',
    wrongType: "This isn't a PDF. Choose a PDF.",
    tooLarge: 'The PDF is larger than 20 MB. Choose a smaller one.',
  },
}

/** The message for a file the server refused as too large (a 413), by family. */
export const handoutFileTooLargeMessage = (family: HandoutFileFamily): string => MESSAGES[family].tooLarge

/** "{n} KB" (whole, rounded up) below 1 MB, otherwise "{n.n} MB" (1 MB = 1,048,576 bytes). */
export function formatFileSize(bytes: number): string {
  return bytes < BYTES_PER_MB ? `${Math.ceil(bytes / BYTES_PER_KB)} KB` : `${(bytes / BYTES_PER_MB).toFixed(1)} MB`
}

/** The message for an unusable choice (missing, wrong browser type, over 20 MB), or undefined when the file can be sent. */
export function validateHandoutFile(family: HandoutFileFamily, file: File | null): string | undefined {
  const messages = MESSAGES[family]
  if (file === null) {
    return messages.missing
  }
  const accepted = family === 'picture' ? HANDOUT_PICTURE_TYPES : HANDOUT_DOCUMENT_TYPES
  if (!accepted.includes(file.type)) {
    return messages.wrongType
  }
  return file.size > HANDOUT_FILE_MAX_BYTES ? messages.tooLarge : undefined
}
