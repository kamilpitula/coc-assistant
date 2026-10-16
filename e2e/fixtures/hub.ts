import type { Page } from '@playwright/test'

/** The SignalR negotiate request a reconnect attempt makes; aborting it keeps the live connection down. */
export const HUB_NEGOTIATE = '**/hubs/campaign/negotiate**'

/** Keeps a handle on the page's Campaign hub WebSockets so a test can drop them like a lost network would. */
export async function controlHubSockets(page: Page): Promise<{ dropAll: () => Promise<void> }> {
  const sockets: Array<{ close: () => Promise<void> }> = []
  await page.routeWebSocket(/\/hubs\/campaign/, (socket) => {
    const server = socket.connectToServer()
    sockets.push({
      close: async () => {
        await socket.close()
        await server.close()
      },
    })
  })
  return { dropAll: async () => void (await Promise.all(sockets.splice(0).map((socket) => socket.close()))) }
}
