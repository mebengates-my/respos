import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import provisionStaffHandler from './api/provision-staff.js'
import storeApplicationsHandler from './api/store-applications.js'

async function readJsonBody(req) {
  try {
    const chunks = []
    for await (const chunk of req) chunks.push(chunk)
    if (chunks.length) req.body = JSON.parse(Buffer.concat(chunks).toString('utf8'))
  } catch {
    // Invalid JSON is reported by the route itself.
  }
}

function addResponseHelpers(res) {
  res.status = (code) => {
    res.statusCode = code
    return res
  }
  res.json = (payload) => {
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify(payload))
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Server-side env for API routes (read from .env.local at config time).
  // None of these values are exposed to browser code.
  const env = loadEnv(mode, process.cwd(), '')
  const apiEnv = {
    SUPABASE_URL: env.SUPABASE_URL || env.VITE_SUPABASE_URL || '',
    SUPABASE_SERVICE_ROLE_KEY: env.SUPABASE_SERVICE_ROLE_KEY || '',
    TURNSTILE_SECRET_KEY: env.TURNSTILE_SECRET_KEY || '',
    CAPTCHA_PROOF_SECRET: env.CAPTCHA_PROOF_SECRET || '',
    SUPER_ADMIN_EMAILS: env.SUPER_ADMIN_EMAILS || '',
  }

  const serveHandler = (path, handler) => ({
    name: `serve-${path.replace(/\W+/g, '-')}`,
    configureServer(server) {
      server.middlewares.use(path, async (req, res) => {
        await readJsonBody(req)
        addResponseHelpers(res)

        const previous = Object.fromEntries(
          Object.keys(apiEnv).map((key) => [key, process.env[key]])
        )
        Object.assign(process.env, apiEnv)
        try {
          await handler(req, res)
        } catch (error) {
          console.error(`${path} dev handler failed:`, error)
          if (!res.writableEnded) res.status(500).json({ error: 'Internal server error' })
        } finally {
          for (const [key, value] of Object.entries(previous)) {
            if (value === undefined) delete process.env[key]
            else process.env[key] = value
          }
        }
      })
    },
  })

  return {
    plugins: [
      react(),
      serveHandler('/api/provision-staff', provisionStaffHandler),
      serveHandler('/api/store-applications', storeApplicationsHandler),
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
