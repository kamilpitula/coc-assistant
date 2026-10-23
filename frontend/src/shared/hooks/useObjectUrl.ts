import { useEffect, useState } from 'react'

interface CreatedUrl {
  blob: Blob
  url: string
}

/**
 * An object URL for a Blob or File, created in an effect and revoked when the blob changes or the component unmounts, so a
 * preview or a downloaded image never leaks its memory. Null while there is no blob, or before its URL exists.
 */
export function useObjectUrl(blob: Blob | null | undefined): string | null {
  const [created, setCreated] = useState<CreatedUrl | null>(null)

  useEffect(() => {
    if (!blob) {
      return undefined
    }

    const url = URL.createObjectURL(blob)
    // The URL is an external resource that only exists after mounting, so it must be published from the effect.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCreated({ blob, url })
    return () => URL.revokeObjectURL(url)
  }, [blob])

  return blob && created?.blob === blob ? created.url : null
}
