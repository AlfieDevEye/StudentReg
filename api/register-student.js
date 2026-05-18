import crypto from 'node:crypto'
import { verifyToken } from './_auth.js'

const requiredFields = [
  'registrationType',
  'firstName',
  'lastName',
  'gender',
  'dateOfBirth',
  'programme',
  'department',
  'degree',
  'semester',
  'email',
  'phoneNumber',
  'stateOfOrigin',
  'studyMode',
]

const registrationSheets = {
  NewMatricNo: process.env.GOOGLE_NEW_STUDENT_SHEET_NAME || 'NewMatricNo',
  Retained: process.env.GOOGLE_RETAINED_STUDENT_SHEET_NAME || 'Retained',
}

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

function getSheetName(registrationType) {
  return registrationSheets[registrationType] || ''
}

function quoteSheetName(sheetName) {
  return `'${sheetName.replaceAll("'", "''")}'`
}

function getSheetRange(registrationType) {
  const sheetName = getSheetName(registrationType)
  return sheetName ? `${quoteSheetName(sheetName)}!A:O` : ''
}

function formatSubmittedDate(date = new Date()) {
  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const year = date.getFullYear()

  return `${day}/${month}/${year}`
}

function getCellValue(source, field) {
  return String(source[field] || '').trim()
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

async function getNextSerialNumber(accessToken, registrationType) {
  const range = encodeURIComponent(`${quoteSheetName(getSheetName(registrationType))}!A:A`)
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${process.env.GOOGLE_SHEET_ID}/values/${range}`

  const sheetResponse = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  })

  const sheetResult = await sheetResponse.json()
  if (!sheetResponse.ok) {
    throw new Error(sheetResult.error?.message || 'Could not read serial number from Google Sheet')
  }

  return Math.max(sheetResult.values?.length || 0, 1)
}

async function appendToSheet(row, accessToken, registrationType) {
  const range = encodeURIComponent(getSheetRange(registrationType))
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${process.env.GOOGLE_SHEET_ID}/values/${range}:append?valueInputOption=USER_ENTERED`

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
    throw new Error(sheetResult.error?.message || 'Could not save to Google Sheet')
  }
}

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    return response.status(405).json({ message: 'Method not allowed' })
  }

  let admin
  try {
    admin = verifyToken(request.headers.authorization)
  } catch (error) {
    return response.status(401).json({ message: error.message })
  }

  const student = request.body || {}
  const missingField = requiredFields.find((field) => !String(student[field] || '').trim())

  if (missingField) {
    return response.status(400).json({ message: 'Please complete all required fields.' })
  }

  const registrationType = getCellValue(student, 'registrationType')
  if (!registrationSheets[registrationType]) {
    return response.status(400).json({ message: 'Please select a valid registration type.' })
  }

  const submittedAt = formatSubmittedDate()
  const studentName = [
    String(student.lastName || '').trim().toUpperCase(),
    String(student.firstName || '').trim(),
    String(student.otherName || '').trim(),
  ]
    .filter(Boolean)
    .join(' ')

  try {
    if (!hasGoogleSheetConfig()) {
      return response.status(200).json({
        saved: false,
        registeredBy: admin.username,
        message: 'Google Sheets is not configured yet.',
      })
    }

    const accessToken = await getGoogleAccessToken()
    const serialNumber = await getNextSerialNumber(accessToken, registrationType)
    const row = [
      serialNumber,
      '',
      studentName,
      getCellValue(student, 'programme'),
      getCellValue(student, 'department'),
      getCellValue(student, 'degree'),
      getCellValue(student, 'semester'),
      getCellValue(student, 'email'),
      getCellValue(student, 'phoneNumber'),
      getCellValue(student, 'stateOfOrigin'),
      getCellValue(student, 'dateOfBirth'),
      getCellValue(student, 'gender'),
      getCellValue(student, 'studyMode'),
      submittedAt,
      admin.username,
    ]

    await appendToSheet(row, accessToken, registrationType)
    return response.status(200).json({
      saved: true,
      registeredBy: admin.username,
      registrationType,
    })
  } catch (error) {
    return response.status(500).json({ message: error.message })
  }
}
