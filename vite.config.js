import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import loginHandler from './api/login.js'
import registerAdminHandler from './api/register-admin.js'
import registerStudentHandler from './api/register-student.js'

function readBody(request) {
  return new Promise((resolve, reject) => {
    let body = ''

    request.on('data', (chunk) => {
      body += chunk
    })

    request.on('end', () => {
      if (!body) {
        resolve({})
        return
      }

      try {
        resolve(JSON.parse(body))
      } catch (error) {
        reject(error)
      }
    })

    request.on('error', reject)
  })
}

function createResponse(response) {
  return {
    status(code) {
      response.statusCode = code
      return this
    },
    json(payload) {
      response.setHeader('Content-Type', 'application/json')
      response.end(JSON.stringify(payload))
    },
  }
}

async function runApiHandler(handler, request, response) {
  try {
    request.body = await readBody(request)
    await handler(request, createResponse(response))
  } catch (error) {
    response.statusCode = 500
    response.setHeader('Content-Type', 'application/json')
    response.end(JSON.stringify({ message: error.message || 'Server error' }))
  }
}

function localApiPlugin() {
  return {
    name: 'local-api-routes',
    configureServer(server) {
      server.middlewares.use('/api/login', (request, response) => {
        runApiHandler(loginHandler, request, response)
      })

      server.middlewares.use('/api/register-student', (request, response) => {
        runApiHandler(registerStudentHandler, request, response)
      })

      server.middlewares.use('/api/register-admin', (request, response) => {
        runApiHandler(registerAdminHandler, request, response)
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  Object.assign(process.env, env)

  return {
    plugins: [localApiPlugin(), react()],
  }
})
