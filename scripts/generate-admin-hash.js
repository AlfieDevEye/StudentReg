import crypto from 'node:crypto'
import { argv, exit } from 'node:process'

const [, , username, password] = argv

if (!username || !password) {
  console.error('Usage: npm run admin:hash -- <username> <password>')
  exit(1)
}

const salt = crypto.randomBytes(16).toString('hex')
const hash = crypto.scryptSync(password, salt, 64).toString('hex')

console.log(JSON.stringify({ username, password: `${salt}:${hash}` }))
