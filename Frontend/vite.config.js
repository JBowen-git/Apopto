import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const proxyTarget =
  process.env.VITE_DEV_API_PROXY_TARGET ?? 'https://example.execute-api.us-east-2.amazonaws.com'

export default defineConfig(({ isSsrBuild }) => ({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      '/api': {
        changeOrigin: true,
        secure: true,
        target: proxyTarget,
      },
    },
  },
  ssr: isSsrBuild
    ? {
        noExternal: true,
      }
    : undefined,
}))
