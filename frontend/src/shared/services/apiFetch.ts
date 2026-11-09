import { apiUrl } from './apiUrl'

// Same signature as fetch, but resolves a relative URL against
// VITE_API_BASE_URL so the SPA can call a cross-origin API (PBI-DEP-002 D5).
export function apiFetch(input: string, init?: RequestInit): Promise<Response> {
  return fetch(apiUrl(input), init)
}
