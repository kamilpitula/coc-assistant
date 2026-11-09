// Builds same-origin-relative API URLs into absolute ones when the SPA is hosted
// on a different origin than the API (PBI-DEP-002 D6). When VITE_API_BASE_URL
// is unset, paths stay relative so local development and E2E are unchanged.

export function buildApiUrl(baseUrl: string | undefined, path: string): string {
  const trimmed = baseUrl?.trim() ?? ''
  if (trimmed === '') {
    return path
  }
  return `${trimmed.replace(/\/+$/, '')}${path}`
}

export function apiUrl(path: string): string {
  return buildApiUrl(import.meta.env.VITE_API_BASE_URL, path)
}
