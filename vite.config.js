import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import provisionStaffHandler from './api/provision-staff.js'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Server-side env for the API route (read from .env.local at config time).
  // Never exposed to the browser — only used by the dev middleware below and
  // by Vite's own server-side env handling.
  const env = loadEnv(mode, process.cwd(), '')
  const apiEnv = {
    SUPABASE_URL: env.SUPABASE_URL || env.VITE_SUPABASE_URL || '',
    SUPABASE_SERVICE_ROLE_KEY: env.SUPABASE_SERVICE_ROLE_KEY || '',
  }

  return {
    plugins: [
      react(),
      {
        // In production (Vercel) `/api/provision-staff` is a native serverless
        // function. In `vite dev` there is no Vercel runtime, so serve the same
        // route with the exact same handler to keep staff provisioning working
        // during local development.
        name: 'serve-api-routes',
        configureServer(server) {
          server.middlewares.use('/api/provision-staff', async (req, res) => {
            try {
              const chunks = []
              for await (const chunk of req) chunks.push(chunk)
              if (chunks.length) {
                req.body = JSON.parse(Buffer.concat(chunks).toString('utf8'))
              }
            } catch {
              // Invalid JSON is reported by the route itself.
            }
            // The Vercel handler relies on these Express-style helpers.
            res.status = (code) => {
              res.statusCode = code
              return res
            }
            res.json = (payload) => {
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify(payload))
            }
            const previous = { ...process.env }
            process.env.SUPABASE_URL = apiEnv.SUPABASE_URL
            process.env.SUPABASE_SERVICE_ROLE_KEY = apiEnv.SUPABASE_SERVICE_ROLE_KEY
            try {
              await provisionStaffHandler(req, res)
            } catch (err) {
              console.error('/api/provision-staff dev handler failed:', err)
              if (!res.writableEnded) {
                res.status(500).json({ error: 'Internal server error' })
              }
            } finally {
              process.env.SUPABASE_URL = previous.SUPABASE_URL
              process.env.SUPABASE_SERVICE_ROLE_KEY = previous.SUPABASE_SERVICE_ROLE_KEY
            }
          })
        },
      },
    ],
    server: {
      host: '0.0.0.0',
      port: 5173,
      allowedHosts: true
    },
    preview: {
      host: '0.0.0.0',
      port: 5173,
      allowedHosts: true
    }
  }
})
