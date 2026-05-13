import crypto from 'node:crypto'
import { createToken, parseAdmins } from './_auth.js'

function base64Url(value) {
  return Buffer.from(value).toString('base64url')
}

function hasGoogleSheetConfig() {
  return Boolean(
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL &&
      process.env.GOOGLE_PRIVATE_KEY &&
      process.env.GOOGLE_SHEET_ID,
  )
}

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

async function getGoogleAccessToken() {
  const now = Math.floor(Date.now() / 1000)
  const header = base64Url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))
  const claim = base64Url(
    JSON.stringify({
      iss: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      scope: 'https://www.googleapis.com/auth/spreadsheets.readonly',
      aud: 'https://oauth2.googleapis.com/token',
      exp: now + 3600,
      iat: now,
    }),
  )
  const privateKey = process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n')
  const unsignedToken = `${header}.${claim}`
  const signature = crypto
    .createSign('RSA-SHA256')
    .update(unsignedToken)
    .sign(privateKey, 'base64url')

  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: `${unsignedToken}.${signature}`,
    }),
  })

  const tokenResult = await tokenResponse.json()
  if (!tokenResponse.ok) {
    throw new Error(tokenResult.error_description || 'Could not connect to Google Sheets')
  }

  return tokenResult.access_token
}

async function findApprovedSheetAdmin(username, password) {
  if (!hasGoogleSheetConfig()) {
    return null
  }

  const accessToken = await getGoogleAccessToken()
  const range = encodeURIComponent(process.env.GOOGLE_ADMIN_SHEET_RANGE || 'Admins!A:H')
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${process.env.GOOGLE_SHEET_ID}/values/${range}`

  const sheetResponse = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  })
  const sheetResult = await sheetResponse.json()

  if (!sheetResponse.ok) {
    throw new Error(sheetResult.error?.message || 'Could not read admin approvals')
  }

  const rows = sheetResult.values || []
  const adminRow = rows.slice(1).find((row) => {
    const rowUsername = String(row[4] || '').trim()
    const status = String(row[7] || '').trim().toLowerCase()
    return rowUsername === username && status === 'approved'
  })

  if (!adminRow || !verifyPassword(password, String(adminRow[6] || '').trim())) {
    return null
  }

  return { username: String(adminRow[4] || '').trim() }
}

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    return response.status(405).json({ message: 'Method not allowed' })
  }

  const { username = '', password = '' } = request.body || {}
  const cleanUsername = username.trim()
  const envAdmin = parseAdmins().find((item) => item.username === cleanUsername)
  const sheetAdmin = await findApprovedSheetAdmin(cleanUsername, password)
  const admin =
    sheetAdmin || (envAdmin && verifyPassword(password, envAdmin.password) ? envAdmin : null)

  if (!admin) {
    return response.status(401).json({ message: 'Invalid username or password' })
  }

  return response.status(200).json({
    username: admin.username,
    token: createToken(admin.username),
  })
}
