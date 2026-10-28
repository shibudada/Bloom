import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const useHttpDevServer = process.env.BLOOM_DEV_HTTP === '1'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
  server: {
    https: useHttpDevServer
      ? undefined
      : {
          cert: readFileSync('../photon.health/certs/localhost-cert.pem'),
          key: readFileSync('../photon.health/certs/localhost-key.pem'),
        },
    host: 'localhost',
    port: 3000,
    proxy: {
      '/api': 'http://127.0.0.1:8787',
    },
  },
})
