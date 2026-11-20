import crypto from 'node:crypto'
import { createToken, parseAdmins } from './_auth.js'

function verifyPassword(password, storedPassword) {
  if (!storedPassword.includes(':')) {
    return password === storedPassword
  }

  const [salt, storedHash] = storedPassword.split(':')
  if (!salt || !storedHash) {
    return false
  }

  const hash = crypto.scryptSync(password, salt, 64).toString('hex')
  if (hash.length !== storedHash.length) {
    return false
  }

  return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(storedHash, 'hex'))
}

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    return response.status(405).json({ message: 'Method not allowed' })
  }

  const { username = '', password = '' } = request.body || {}
  const cleanUsername = username.trim()
  const envAdmin = parseAdmins().find((item) => item.username === cleanUsername)

  if (envAdmin && verifyPassword(password, envAdmin.password)) {
    return response.status(200).json({
      username: envAdmin.username,
      token: createToken(envAdmin.username),
    })
  }

  return response.status(401).json({ message: 'Invalid username or password' })
}
