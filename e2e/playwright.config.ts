import { defineConfig, devices } from '@playwright/test'
import { existsSync, mkdirSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { e2ePort } from './e2eServers.ts'
import { resolveReuseServers, resolveWorkerCount } from './runSettings.ts'
import { resolveE2eConnectionString } from './sqlServerConnection.ts'

const E2E_DIR = dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = resolve(E2E_DIR, '..')
const PFX_PATH = resolve(E2E_DIR, '.certs/dev-cert.pfx')
const PFX_PASSWORD_FILE = resolve(E2E_DIR, '.certs/dev-cert.password')
const LOGS_DIR = resolve(E2E_DIR, 'logs')
const E2E_CONNECTION_STRING = resolveE2eConnectionString()
// Handout files go to a temporary directory, so the suite needs no Azure Storage (PBI-SP-007 D7).
const E2E_HANDOUT_FILES_DIRECTORY = resolve(tmpdir(), 'coc-e2e-handout-files')

// Server output goes through the shell into e2e/logs (outside test-results/, which Playwright
// clears at the start of a run), so the console shows only test progress. Every command in a
// chain appends to the same file: the first redirect creates it, later ones append. The syntax
// (&&, >, >>, 2>&1, double-quoted paths) works in both cmd and sh.
mkdirSync(LOGS_DIR, { recursive: true })

function logRedirect(name: string, append: boolean): string {
  const operator = append ? '>>' : '>'
  return `${operator} "${resolve(LOGS_DIR, `${name}.log`)}" 2>&1`
}

const reuseServers = resolveReuseServers()

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
  // Worker count comes from E2E_WORKERS (1 locally, 2 on CI by default): a full suite
  // against LocalDB saturates early, so local runs stay serial unless asked otherwise.
  workers: resolveWorkerCount(),
  // Locally the list reporter shows progress and the HTML report opens only on failure
  // (agents set PLAYWRIGHT_HTML_OPEN=never so it never blocks). On CI the list reporter
  // keeps the step log readable and each shard writes a blob report for merge-reports.
  reporter: process.env.CI ? [['list'], ['blob']] : [['list'], ['html', { open: 'on-failure' }]],
  globalSetup: './globalSetup.ts',
  use: {
    baseURL: process.env.BASE_URL ?? `http://localhost:${e2ePort('vite')}`,
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
      command: `docker compose -f docker/docker-compose.e2e.yml up ${logRedirect('mock-oauth2', false)}`,
      cwd: E2E_DIR,
      env: {
        COC_E2E_CERT_PASSWORD: certPassword,
      },
      // Port-probe for the same self-signed-TLS reason as the API. Once Netty binds 8443,
      // mock-oauth2-server is ready. See docs/e2e/authenticated-harness.md.
      port: e2ePort('mock-oauth2'),
      reuseExistingServer: reuseServers,
      stdout: 'pipe',
      stderr: 'pipe',
      timeout: 120_000,
    },
    {
      name: 'api',
      command:
        `dotnet build --disable-build-servers -v q -nologo backend/src/CocAssistant.Api ${logRedirect('api', false)}` +
        ` && dotnet backend/src/CocAssistant.Api/bin/Debug/net10.0/CocAssistant.Api.dll ${logRedirect('api', true)}`,
      cwd: REPO_ROOT,
      env: {
        ASPNETCORE_ENVIRONMENT: 'E2E',
        ASPNETCORE_URLS: `https://localhost:${e2ePort('api')}`,
        ConnectionStrings__IdentityDb: E2E_CONNECTION_STRING,
        ConnectionStrings__CampaignPlayDb: E2E_CONNECTION_STRING,
        ConnectionStrings__ScenarioPreparationDb: E2E_CONNECTION_STRING,
        HandoutFiles__LocalDirectory: E2E_HANDOUT_FILES_DIRECTORY,
        ASPNETCORE_Kestrel__Certificates__Default__Path: PFX_PATH,
        ASPNETCORE_Kestrel__Certificates__Default__Password: certPassword,
      },
      // The TCP port is the readiness probe (not url): Playwright's HTTP probe does not
      // reliably ignore self-signed TLS, so port-availability is used instead. Once Kestrel
      // is bound, the API is ready to serve.
      port: e2ePort('api'),
      ignoreHTTPSErrors: true,
      reuseExistingServer: reuseServers,
      stdout: 'pipe',
      stderr: 'pipe',
      timeout: 240_000,
    },
    {
      name: 'vite',
      command: `npm run dev -- --mode e2e --port ${e2ePort('vite')} --strictPort ${logRedirect('vite', false)}`,
      cwd: resolve(REPO_ROOT, 'frontend'),
      url: `http://localhost:${e2ePort('vite')}`,
      reuseExistingServer: reuseServers,
      stdout: 'pipe',
      stderr: 'pipe',
      timeout: 120_000,
    },
  ],
})
