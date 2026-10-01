import { execSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const E2E_DIR = dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = resolve(E2E_DIR, '..')
const CERTS_DIR = resolve(REPO_ROOT, 'e2e/.certs')
const PFX_PATH = resolve(CERTS_DIR, 'dev-cert.pfx')
const PFX_PASSWORD_FILE = resolve(CERTS_DIR, 'dev-cert.password')

const E2E_CONNECTION_STRING =
  'Server=(localdb)\\mssqllocaldb;Database=CocAssistantE2E;Trusted_Connection=True;MultipleActiveResultSets=true'

function abortWithGuidance(message: string): never {
  const guidance =
    'See docs/e2e/authenticated-harness.md for how to export the ASP.NET dev certificate and start Docker Desktop.'
  throw new Error(`${message}\n${guidance}`)
}

function readPfxPasswordOrAbort(): string {
  const fromEnv = process.env.COC_E2E_CERT_PASSWORD?.trim()
  if (fromEnv) {
    return fromEnv
  }
  if (!existsSync(PFX_PASSWORD_FILE)) {
    abortWithGuidance(
      `COC_E2E_CERT_PASSWORD is unset and ${PFX_PASSWORD_FILE} does not exist.`,
    )
  }
  const fromFile = readFileSync(PFX_PASSWORD_FILE, 'utf-8').trim()
  if (!fromFile) {
    abortWithGuidance(`${PFX_PASSWORD_FILE} is empty.`)
  }
  return fromFile
}

function run(command: string, env: NodeJS.ProcessEnv = {}): void {
  execSync(command, {
    cwd: REPO_ROOT,
    stdio: 'inherit',
    env: { ...process.env, ...env },
  })
}

export default async function globalSetup(): Promise<void> {
  if (!existsSync(PFX_PATH)) {
    abortWithGuidance(`Dev certificate PFX not found at ${PFX_PATH}.`)
  }

  const password = readPfxPasswordOrAbort()
  // Expose for the webServer entries that need it (mock-oauth2-server + Kestrel).
  process.env.COC_E2E_CERT_PASSWORD = password
  process.env.COC_E2E_CERT_PATH = PFX_PATH
  process.env.COC_E2E_CS = E2E_CONNECTION_STRING

  const migrationEnv = {
    ConnectionStrings__IdentityDb: E2E_CONNECTION_STRING,
    ConnectionStrings__CampaignPlayDb: E2E_CONNECTION_STRING,
    ASPNETCORE_ENVIRONMENT: 'E2E',
  }

  run('dotnet tool restore')
  run(
    'dotnet ef database update --project backend/src/Identity/CocAssistant.Identity.Infrastructure ' +
      '--startup-project backend/src/CocAssistant.Api --context IdentityDbContext',
    migrationEnv,
  )
  run(
    'dotnet ef database update --project backend/src/CampaignPlay/CocAssistant.CampaignPlay.Infrastructure ' +
      '--startup-project backend/src/CocAssistant.Api --context CampaignPlayDbContext',
    migrationEnv,
  )
}
