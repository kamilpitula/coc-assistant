/**
 * Picks the HTTP target the Vite dev server should proxy `/api/*` requests to.
 *
 * Defaults to the local dev API (`http://localhost:5058`); `.env.e2e` overrides it to the
 * HTTPS E2E API port via `VITE_API_PROXY_TARGET` so Playwright can drive the real auth stack.
 */
export function resolveViteProxyTarget(
  env: Record<string, string | undefined>,
): string {
  const configured = env.VITE_API_PROXY_TARGET?.trim()
  if (configured) {
    return configured
  }
  return 'http://localhost:5058'
}
