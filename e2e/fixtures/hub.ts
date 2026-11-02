import type { Page } from '@playwright/test'

/** The SignalR negotiate request a reconnect attempt makes; aborting it keeps the live connection down. */
export const HUB_NEGOTIATE = '**/hubs/campaign/negotiate**'

/**
 * Records the SignalR frames the server sends to the page's Campaign hub WebSockets, passing every frame through unchanged, so a test
 * can prove which live signals a page did and did not receive (PBI-SPL-002, SPL-UX-28). SignalR frames are JSON texts ended by the
 * record separator, and several can share one WebSocket message.
 */
export async function recordHubFrames(page: Page): Promise<{ dataChangedTopics: () => string[][] }> {
  const frames: string[] = []
  await page.routeWebSocket(/\/hubs\/campaign/, (socket) => {
    const server = socket.connectToServer()
    socket.onMessage((message) => server.send(message))
    server.onMessage((message) => {
      frames.push(typeof message === 'string' ? message : message.toString('utf-8'))
      socket.send(message)
    })
  })

  return {
    dataChangedTopics: () =>
      frames
        .flatMap((message) => message.split(String.fromCharCode(0x1e)))
        .filter((frame) => frame.includes('"CampaignDataChanged"'))
        .map((frame) => (JSON.parse(frame) as { arguments: Array<{ topics: string[] }> }).arguments[0].topics),
  }
}

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
