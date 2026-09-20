import { test, expect, type Route } from '@playwright/test'

const TENANT_ID = '00000000-0000-0000-0000-000000000000'
const AUTHORITY_HOST = 'cocassistant.ciamlogin.com'

/** Stubs Entra's OIDC discovery + authorize endpoints so MSAL can redirect without a real tenant. */
async function stubEntraAuthority(route: Route) {
  const url = route.request().url()

  if (url.includes('openid-configuration')) {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        issuer: `https://${AUTHORITY_HOST}/${TENANT_ID}/v2.0`,
        authorization_endpoint: `https://${AUTHORITY_HOST}/${TENANT_ID}/oauth2/v2.0/authorize`,
        token_endpoint: `https://${AUTHORITY_HOST}/${TENANT_ID}/oauth2/v2.0/token`,
        jwks_uri: `https://${AUTHORITY_HOST}/${TENANT_ID}/discovery/v2.0/keys`,
        response_types_supported: ['code'],
      }),
    })
    return
  }

  await route.fulfill({ status: 200, contentType: 'text/plain', body: 'stubbed authorize endpoint' })
}

test('home page shows header actions and two-column content', async ({ page }) => {
  await test.step('navigate to the home page', async () => {
    await page.goto('/')
    await expect(page.getByText('CoC Assistant')).toBeVisible()
  })

  await test.step('header shows Sign In and Sign Up actions', async () => {
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /sign up/i })).toBeVisible()
  })

  await test.step('content area shows description and illustration', async () => {
    await expect(
      page.getByRole('heading', { name: /call of cthulhu campaign assistant/i }),
    ).toBeVisible()
    await expect(page.getByRole('main').locator('svg[role="presentation"]')).toBeVisible()
  })
})

test('Sign In initiates the Entra redirect', async ({ page }) => {
  await page.route(`**/${AUTHORITY_HOST}/**`, stubEntraAuthority)
  await page.goto('/')

  const authorizeRequest = page.waitForRequest(/\.ciamlogin\.com\/.*\/oauth2\/v2\.0\/authorize/)
  await page.getByRole('button', { name: /sign in/i }).click()
  const request = await authorizeRequest

  expect(request.url()).toContain('client_id=')
})

test('Sign Up initiates the Entra redirect', async ({ page }) => {
  await page.route(`**/${AUTHORITY_HOST}/**`, stubEntraAuthority)
  await page.goto('/')

  const authorizeRequest = page.waitForRequest(/\.ciamlogin\.com\/.*\/oauth2\/v2\.0\/authorize/)
  await page.getByRole('button', { name: /sign up/i }).click()
  const request = await authorizeRequest

  expect(request.url()).toContain('client_id=')
})
