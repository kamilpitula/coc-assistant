import { defineConfig, devices } from '@playwright/test'
import { existsSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { resolveE2eConnectionString } from './sqlServerConnection'

const E2E_DIR = dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = resolve(E2E_DIR, '..')
const PFX_PATH = resolve(E2E_DIR, '.certs/dev-cert.pfx')
const PFX_PASSWORD_FILE = resolve(E2E_DIR, '.certs/dev-cert.password')
const E2E_CONNECTION_STRING = resolveE2eConnectionString()

/**
 * Resolves the dev-cert PFX password at config load time so the webServer env captures the
 * right value when it spawns the mock container and the API process. `globalSetup.ts`
 * additionally validates the artifacts and runs EF migrations.
 */
function resolveCertPassword(): string {
  const fromEnv = process.env.COC_E2E_CERT_PASSWORD?.trim()
  if (fromEnv) {
    return fromEnv
  }
  if (existsSync(PFX_PASSWORD_FILE)) {
    return readFileSync(PFX_PASSWORD_FILE, 'utf-8').trim()
  }
  return ''
}

const certPassword = resolveCertPassword()

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  // The authenticated flows chain many sign-ins across isolated contexts; the real
  // MSAL + mock OIDC + API round-trip pushes each one past the Playwright default of 30s.
  timeout: 90_000,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1,
  // Capping workers keeps the ASP.NET LocalDB connection pool, Vite HMR, and the mock
  // container's thread pool from saturating under full-suite load; 2 is the sweet spot
  // between parallelism and stability on a typical dev workstation.
  workers: process.env.CI ? 2 : 2,
  // CI keeps the line output for logs and writes the HTML report for the failure artifact.
  reporter: process.env.CI ? [['line'], ['html', { open: 'never' }]] : 'html',
  globalSetup: './globalSetup.ts',
  use: {
    baseURL: process.env.BASE_URL ?? 'http://localhost:5174',
    ignoreHTTPSErrors: true,
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: [
    {
      name: 'mock-oauth2',
      command: 'docker compose -f docker/docker-compose.e2e.yml up',
      cwd: E2E_DIR,
      env: {
        COC_E2E_CERT_PASSWORD: certPassword,
      },
      // Port-probe for the same self-signed-TLS reason as the API. Once Netty binds 8443,
      // mock-oauth2-server is ready. See docs/e2e/authenticated-harness.md.
      port: 8443,
      reuseExistingServer: !process.env.CI,
      stdout: 'pipe',
      stderr: 'pipe',
      timeout: 120_000,
    },
    {
      name: 'api',
      command:
        'dotnet run --project backend/src/CocAssistant.Api --no-launch-profile',
      cwd: REPO_ROOT,
      env: {
        ASPNETCORE_ENVIRONMENT: 'E2E',
        ASPNETCORE_URLS: 'https://localhost:5059',
        ConnectionStrings__IdentityDb: E2E_CONNECTION_STRING,
        ConnectionStrings__CampaignPlayDb: E2E_CONNECTION_STRING,
        ConnectionStrings__ScenarioPreparationDb: E2E_CONNECTION_STRING,
        ASPNETCORE_Kestrel__Certificates__Default__Path: PFX_PATH,
        ASPNETCORE_Kestrel__Certificates__Default__Password: certPassword,
      },
      // The TCP port is the readiness probe (not url): Playwright's HTTP probe does not
      // reliably ignore self-signed TLS, so port-availability is used instead. Once Kestrel
      // is bound, the API is ready to serve.
      port: 5059,
      ignoreHTTPSErrors: true,
      reuseExistingServer: !process.env.CI,
      stdout: 'pipe',
      stderr: 'pipe',
      timeout: 240_000,
    },
    {
      name: 'vite',
      command: 'npm run dev -- --mode e2e --port 5174 --strictPort',
      cwd: resolve(REPO_ROOT, 'frontend'),
      url: 'http://localhost:5174',
      reuseExistingServer: !process.env.CI,
      stdout: 'pipe',
      stderr: 'pipe',
      timeout: 120_000,
    },
  ],
})
