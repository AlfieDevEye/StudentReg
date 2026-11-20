import crypto from 'node:crypto'

const tokenDurationMs = 8 * 60 * 60 * 1000

function base64Url(value) {
  return Buffer.from(value).toString('base64url')
}

function getSessionSecret() {
  return process.env.ADMIN_SESSION_SECRET || 'local-development-secret'
}

function sign(value) {
  return crypto.createHmac('sha256', getSessionSecret()).update(value).digest('base64url')
}

export function parseAdmins() {
  const rawAdmins = process.env.ADMIN_USERS

  if (!rawAdmins) {
    if (process.env.NODE_ENV === 'development') {
      return [{ username: 'admin', password: 'admin123' }]
    }

    return []
  }

  try {
    const admins = JSON.parse(rawAdmins)
    if (!Array.isArray(admins)) {
      return []
    }

    return admins.filter((admin) => admin?.username && admin?.password)
  } catch {
    return []
  }
}

export function createToken(username) {
  const payload = {
    username,
    expiresAt: Date.now() + tokenDurationMs,
  }
  const encodedPayload = base64Url(JSON.stringify(payload))
  return `${encodedPayload}.${sign(encodedPayload)}`
}

export function verifyToken(authHeader = '') {
  const [, token] = authHeader.split(' ')
  if (!token) {
    throw new Error('Missing login token')
  }

  const [encodedPayload, signature] = token.split('.')
  if (!encodedPayload || !signature || signature !== sign(encodedPayload)) {
    throw new Error('Invalid login token')
  }

  const payload = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf8'))
  if (!payload.username || Date.now() > payload.expiresAt) {
    throw new Error('Login expired')
  }

  return payload
}
