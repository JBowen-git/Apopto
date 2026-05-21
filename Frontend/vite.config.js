import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

const frontendRoot = path.dirname(fileURLToPath(import.meta.url))
const fallbackProxyTarget = 'https://example.execute-api.us-east-2.amazonaws.com'

export default defineConfig(({ isSsrBuild, mode }) => {
  const env = loadEnv(mode, frontendRoot, '')
  const proxyTarget = env.VITE_DEV_API_PROXY_TARGET ?? fallbackProxyTarget
  const apiProxy = {
    changeOrigin: true,
    secure: true,
    target: proxyTarget,
  }

  return {
    envDir: frontendRoot,
    plugins: [react()],
    build: isSsrBuild
      ? undefined
      : {
          rollupOptions: {
            output: {
              manualChunks(id) {
                if (!id.includes('node_modules')) {
                  return undefined
                }

                if (id.includes('@mui') || id.includes('@emotion')) {
                  return 'vendor-mui'
                }

                if (id.includes('@auth0')) {
                  return 'vendor-auth'
                }

                if (id.includes('@tanstack')) {
                  return 'vendor-query'
                }

                if (id.includes('@hookform') || id.includes('react-hook-form') || id.includes('zod')) {
                  return 'vendor-forms'
                }

                if (id.includes('react') || id.includes('scheduler')) {
                  return 'vendor-react'
                }

                return 'vendor'
              },
            },
          },
        },
    server: {
      port: 5173,
      strictPort: true,
      proxy: {
        '/api': apiProxy,
      },
    },
    preview: {
      proxy: {
        '/api': apiProxy,
      },
    },
    ssr: isSsrBuild
      ? {
          noExternal: true,
        }
      : undefined,
  }
})
