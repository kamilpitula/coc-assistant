import { fileURLToPath, URL } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import { tanstackRouter } from '@tanstack/router-plugin/vite'
import react from '@vitejs/plugin-react'
import { loadEnv } from 'vite'
import { defineConfig } from 'vitest/config'

import { resolveViteProxyTarget } from './src/shared/services/resolveViteProxyTarget.ts'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const proxyTarget = resolveViteProxyTarget(env)
  const proxyIsHttps = proxyTarget.startsWith('https://')

  return {
    plugins: [
      tanstackRouter({ target: 'react', autoCodeSplitting: true }),
      tailwindcss(),
      react(),
    ],
    server: {
      proxy: {
        '/api': {
          target: proxyTarget,
          changeOrigin: false,
          secure: !proxyIsHttps ? undefined : false,
        },
      },
    },
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    test: {
      environment: 'jsdom',
      globals: true,
      setupFiles: ['./src/setupTests.ts'],
      // The first test in each file also pays for cold jsdom and module transforms, which exceeds the 5s default
      // when many component suites run in parallel workers; individual tests stay well under a second.
      testTimeout: 20_000,
    },
  }
})
