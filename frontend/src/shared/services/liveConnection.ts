import { HubConnectionBuilder, LogLevel } from '@microsoft/signalr'

/**
 * A generic live connection to a SignalR hub (ADR 0009). It holds no feature concepts, so any slice can use it; a
 * slice subscribes to its data in `onConnected` and maps server messages through `on`.
 */
export type LiveConnectionState = 'connecting' | 'connected' | 'reconnecting' | 'failed' | 'stopped'

/** Why the connection is (again) connected: the first time, or after it was lost, so missed changes need a refetch. */
export type ConnectedReason = 'initial' | 'reconnected'

/** The part of a SignalR HubConnection this wrapper uses; tests provide a fake. */
export interface LiveHubConnection {
  start(): Promise<void>
  stop(): Promise<void>
  invoke(method: string, ...args: unknown[]): Promise<unknown>
  on(method: string, handler: (...args: never[]) => void): void
  onreconnecting(callback: () => void): void
  onreconnected(callback: () => void): void
  onclose(callback: (error?: Error) => void): void
}

export interface LiveConnectionOptions {
  url: string
  accessTokenFactory: () => Promise<string>
  onStateChange: (state: LiveConnectionState) => void
  onConnected: (reason: ConnectedReason) => void
  buildConnection?: (url: string, accessTokenFactory: () => Promise<string>) => LiveHubConnection
}

export interface LiveConnection {
  start(): Promise<void>
  /** Starts a new attempt after the connection failed ("Try again"). */
  retry(): Promise<void>
  stop(): Promise<void>
  on<T>(method: string, handler: (payload: T) => void): void
  invoke(method: string, ...args: unknown[]): Promise<unknown>
}

// The token goes in the access_token query string on the hub path only. Automatic reconnect uses the default
// delays of 0, 2, 10, and 30 seconds (specs/campaign-play/spec.md, Live connection contract).
function buildHubConnection(url: string, accessTokenFactory: () => Promise<string>): LiveHubConnection {
  return new HubConnectionBuilder()
    .withUrl(url, { accessTokenFactory })
    .withAutomaticReconnect()
    .configureLogging(LogLevel.Warning)
    .build()
}

export function createLiveConnection(options: LiveConnectionOptions): LiveConnection {
  const { onStateChange, onConnected } = options
  const hub = (options.buildConnection ?? buildHubConnection)(options.url, options.accessTokenFactory)
  let state: LiveConnectionState = 'stopped'

  function setState(next: LiveConnectionState) {
    state = next
    onStateChange(next)
  }

  async function connect(pendingState: LiveConnectionState, reason: ConnectedReason) {
    setState(pendingState)
    try {
      await hub.start()
    } catch {
      if (state !== 'stopped') {
        setState('failed')
      }
      return
    }

    if (state !== 'stopped') {
      setState('connected')
      onConnected(reason)
    }
  }

  hub.onreconnecting(() => setState('reconnecting'))
  hub.onreconnected(() => {
    setState('connected')
    onConnected('reconnected')
  })
  // A close while connected comes from the server (for example an expired token): reconnect with a fresh token.
  // A close while reconnecting means every automatic attempt failed.
  hub.onclose(() => {
    if (state === 'stopped') {
      return
    }

    if (state === 'connected') {
      void connect('reconnecting', 'reconnected')
      return
    }

    setState('failed')
  })

  return {
    start: () => connect('connecting', 'initial'),
    retry: () => connect('reconnecting', 'reconnected'),
    stop: async () => {
      setState('stopped')
      await hub.stop()
    },
    on: (method, handler) => hub.on(method, handler),
    invoke: (method, ...args) => hub.invoke(method, ...args),
  }
}
