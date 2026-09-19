import { test, expect } from '@playwright/test'

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
