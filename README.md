# Student Registration

A single-page React app for admins to register students and save each submission to Google Sheets.

## Local frontend

```bash
npm install
npm run dev
```

The Vite preview runs the frontend only. To test the API routes locally, use Vercel local development:

```bash
npm run dev:vercel
```

## Environment variables

Copy `.env.example` to `.env.local` for local Vercel testing, and add the same values in Vercel project settings before deploying.

```bash
ADMIN_SESSION_SECRET=This-to-a-long-random-secret
ADMIN_USERS=[{"username":"admin1","password":"admin1-password"},{"username":"admin2","password":"admin2-password"}]
GOOGLE_SERVICE_ACCOUNT_EMAIL=your-service-account@your-project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_PRIVATE_KEY\n-----END PRIVATE KEY-----\n"
GOOGLE_SHEET_ID=your-google-sheet-id
GOOGLE_ADMIN_SHEET_RANGE=Admins!A:H
```

## Google Sheet columns

Create sheet tabs named `NewMatricNo` and `Retained` with these columns:

```text
SN | Matric. No. | Full Name | Programme | Department | Degree | Semester | Email | Phone No. | State Of Origin | Date Of Birth | Gender | Study Mode | Submitted At | Registered By
```

Share the Google Sheet with the service account email as an editor.

Admins listed in `ADMIN_USERS` are the only approved login users. They can log in even if the Google Sheet ID is changed or unavailable.

Create an `Admins` sheet tab with these columns:

```text
Submitted At | First Name | Last Name | Phone Number | Username | Email | Password Hash | Status
```

Admin registration submissions are requests only. To approve an admin, add that admin to the server-side `ADMIN_USERS` environment variable.

Generate a hashed admin entry with:

```bash
npm run admin:hash -- admin3 admin3-password
```

The command prints one JSON object. Add it to `ADMIN_USERS`, for example:

```env
ADMIN_USERS=[{"username":"admin1","password":"existing-password"},{"username":"admin3","password":"generated-salt:generated-hash"}]
```
