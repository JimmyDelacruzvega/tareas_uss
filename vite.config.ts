import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv, type Plugin } from 'vite'
import { dbEnvFrom } from './server/env.ts'
import { handleApi } from './server/http.ts'

function lumenApi(source: Record<string, string>): Plugin {
  const env = dbEnvFrom(source)
  return {
    name: 'lumen-api',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (!req.url?.startsWith('/api')) {
          next()
          return
        }
        void handleApi(req, res, env)
      })
    },
    configurePreviewServer(server) {
      server.middlewares.use((req, res, next) => {
        if (!req.url?.startsWith('/api')) {
          next()
          return
        }
        void handleApi(req, res, env)
      })
    },
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    plugins: [react(), lumenApi(env)],
  }
})
