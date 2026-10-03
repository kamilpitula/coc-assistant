import type { Locator, Page } from '@playwright/test'

/**
 * Locators for the Campaign overview (specs/campaign-overview/ux.md sections 2 to 5). "At the table" is a table at
 * the desktop viewport the suite runs at; its narrow-screen list is hidden, so rows are found by role.
 */
export function campaignNav(page: Page): Locator {
  return page.getByRole('navigation', { name: 'Campaign' })
}

export function attentionList(page: Page): Locator {
  return page.getByRole('region', { name: 'Needs your attention' })
}

export function atTheTable(page: Page): Locator {
  return page.getByRole('region', { name: 'At the table' })
}

/** The member rows of "At the table", without the header row. */
export function memberRows(page: Page): Locator {
  return atTheTable(page).getByRole('row').filter({ has: page.getByRole('cell') })
}

/** The "At the table" row of the member with this display name. */
export function memberRow(page: Page, displayName: string): Locator {
  return memberRows(page).filter({ hasText: displayName })
}

/** The viewer's own "At the table" row. */
export function ownRow(page: Page): Locator {
  return memberRows(page).filter({ hasText: '(you)' })
}
