import crypto from 'node:crypto'

const requiredFields = [
  'firstName',
  'lastName',
  'phoneNumber',
  'username',
  'email',
  'password',
  'confirmPassword',
]

const adminHeaders = [
  'Submitted At',
  'First Name',
  'Last Name',
  'Phone Number',
  'Username',
  'Email',
  'Password Hash',
  'Status',
]

function base64Url(value) {
  return Buffer.from(value).toString('base64url')
}

function hasGoogleSheetConfig() {
  return Boolean(
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL &&
      process.env.GOOGLE_PRIVATE_KEY &&
      getAdminSpreadsheetId(),
  )
}

function getAdminSpreadsheetId() {
  return normalizeSpreadsheetId(process.env.GOOGLE_ADMIN_SHEET_ID || process.env.GOOGLE_SHEET_ID)
}

function normalizeSpreadsheetId(spreadsheetId) {
  const value = String(spreadsheetId || '').trim()
  const urlMatch = value.match(/\/spreadsheets\/d\/([^/]+)/)

  return urlMatch ? urlMatch[1] : value
}

function describeSheetError(sheetResult) {
  if (sheetResult.error?.status === 'NOT_FOUND') {
    return 'Admin spreadsheet was not found. Check GOOGLE_ADMIN_SHEET_ID and make sure the sheet is shared with the Google service account email.'
  }

  if (isUnableToParseRange(sheetResult)) {
    return `Admin sheet tab "${getAdminSheetName()}" was not found. Create that tab in the admin spreadsheet or update GOOGLE_ADMIN_SHEET_RANGE.`
  }

  return sheetResult.error?.message || 'Could not save admin registration'
}

function isUnableToParseRange(sheetResult) {
  return /Unable to parse range/i.test(sheetResult.error?.message || '')
}

function quoteSheetName(sheetName) {
  return `'${sheetName.replaceAll("'", "''")}'`
}

function getAdminSheetName() {
  const range = String(process.env.GOOGLE_ADMIN_SHEET_RANGE || 'Admins!A:H').trim()
  const quotedRangeMatch = range.match(/^'((?:''|[^'])+)'!/)

  if (quotedRangeMatch) {
    return quotedRangeMatch[1].replaceAll("''", "'").trim()
  }

  const rangeSeparatorIndex = range.lastIndexOf('!')
  if (rangeSeparatorIndex > -1) {
    return range.slice(0, rangeSeparatorIndex).replace(/^'|'$/g, '').trim()
  }

  return range.replace(/^'|'$/g, '').trim() || 'Admins'
}

function getAdminSheetRange() {
  return `${quoteSheetName(getAdminSheetName())}!A:H`
}

function formatSubmittedDate(date = new Date()) {
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const year = date.getFullYear()

  return `${month}/${day}/${year}`
}

function getCellValue(source, field) {
  return String(source[field] || '').trim()
}

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex')
  const hash = crypto.scryptSync(password, salt, 64).toString('hex')

  return `${salt}:${hash}`
}

async function getGoogleAccessToken() {
  const now = Math.floor(Date.now() / 1000)
  const header = base64Url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))
  const claim = base64Url(
    JSON.stringify({
      iss: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      scope: 'https://www.googleapis.com/auth/spreadsheets',
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

async function appendAdminRequest(row) {
  const accessToken = await getGoogleAccessToken()
  await appendAdminRequestWithRetry(row, accessToken)
}

async function appendAdminRequestWithRetry(row, accessToken, hasCreatedSheet = false) {
  const range = encodeURIComponent(getAdminSheetRange())
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${getAdminSpreadsheetId()}/values/${range}:append?valueInputOption=USER_ENTERED`

  const sheetResponse = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ values: [row] }),
  })

  const sheetResult = await sheetResponse.json()
  if (!sheetResponse.ok) {
    if (!hasCreatedSheet && isUnableToParseRange(sheetResult)) {
      await createAdminSheet(accessToken)
      return appendAdminRequestWithRetry(row, accessToken, true)
    }

    throw new Error(describeSheetError(sheetResult))
  }
}

async function createAdminSheet(accessToken) {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${getAdminSpreadsheetId()}:batchUpdate`
  const sheetResponse = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      requests: [
        {
          addSheet: {
            properties: {
              title: getAdminSheetName(),
            },
          },
        },
      ],
    }),
  })

  const sheetResult = await sheetResponse.json()
  if (!sheetResponse.ok && !/already exists/i.test(sheetResult.error?.message || '')) {
    throw new Error(describeSheetError(sheetResult))
  }

  await writeAdminHeaders(accessToken)
}

async function writeAdminHeaders(accessToken) {
  const range = encodeURIComponent(`${quoteSheetName(getAdminSheetName())}!A1:H1`)
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${getAdminSpreadsheetId()}/values/${range}?valueInputOption=USER_ENTERED`
  const sheetResponse = await fetch(url, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ values: [adminHeaders] }),
  })

  const sheetResult = await sheetResponse.json()
  if (!sheetResponse.ok) {
    throw new Error(describeSheetError(sheetResult))
  }
}

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    return response.status(405).json({ message: 'Method not allowed' })
  }

  const admin = request.body || {}
  const missingField = requiredFields.find((field) => !getCellValue(admin, field))

  if (missingField) {
    return response.status(400).json({ message: 'Please complete all admin registration fields.' })
  }

  if (getCellValue(admin, 'password') !== getCellValue(admin, 'confirmPassword')) {
    return response.status(400).json({ message: 'Passwords do not match.' })
  }

  const row = [
    formatSubmittedDate(),
    getCellValue(admin, 'firstName'),
    getCellValue(admin, 'lastName'),
    getCellValue(admin, 'phoneNumber'),
    getCellValue(admin, 'username'),
    getCellValue(admin, 'email'),
    hashPassword(getCellValue(admin, 'password')),
    'Pending',
  ]

  try {
    if (!hasGoogleSheetConfig()) {
      return response.status(200).json({
        saved: false,
        message: 'Google Sheets is not configured yet.',
      })
    }

    await appendAdminRequest(row)
    return response.status(200).json({ saved: true })
  } catch (error) {
    return response.status(500).json({ message: error.message })
  }
}
