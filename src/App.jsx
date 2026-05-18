import { useMemo, useState } from 'react'
import './App.css'

const initialLogin = {
  username: '',
  password: '',
}

const initialAdminRegistration = {
  firstName: '',
  lastName: '',
  phoneNumber: '',
  username: '',
  email: '',
  password: '',
  confirmPassword: '',
}

const initialStudent = {
  registrationType: '',
  firstName: '',
  lastName: '',
  otherName: '',
  gender: '',
  dateOfBirth: '',
  programme: '',
  department: '',
  degree: '',
  semester: '',
  email: '',
  phoneNumber: '',
  stateOfOrigin: '',
  studyMode: '',
}

const departments = [
  'Accounting',
  'Biochemistry',
  'Biological Sciences',
  'Business Administration & Marketing',
  'CGHDS',
  'Chemical Sciences',
  'Christian Religious Studies & Philosophy',
  'Computer Science',
  'Economics',
  'English',
  'Finance',
  'History and International Studies',
  'Law',
  'Mass Communication',
  'Mathematics and Statistics',
  'Physical Sciences',
  'Political Science',
  'Psychology',
  'Sociology and Social Work',
  'Theatre Arts',
  'Tourism and Hospitality Studies',
]
const programmes = [
'Accounting',
'Biochemistry',
'Bioinformatics',
'Business Administration',
'Christian Religious Studies',
'Communication and Media Studies',
'Computer Science',
'Economics',
'English (Language Emphasis)',
'English (Literature Emphasis)',
'Environmental and Analytical Chemistry',
'Finance',
'Gender and Development Studies',
'History and International Studies',
'Hospitality and Tourism Management',
'Humanitarian and Development Studies',
'Industrial Chemistry',
'Law',
'Management',
'Master of Business Administration',
'Materials Chemistry',
'Mathematics',
'Microbiology (Environmental Microbiology)',
'Microbiology (Food Microbiology)',
'Microbiology (Medical Microbiology)',
'Molecular Biology and Genomics',
'Peace and Governance Studies',
'Peace and Religion Studies',
'Physics (Communication Physics)',
'Physics (Instrumentation Physics)',
'Physics (Lower Atmospheric Physics)',
'Physics (Radiation and Health Physics)',
'Physics (Renewable Energy Physics)',
'Physics (Solid Earth Physics-Geophysics)',
'Physics (Theoretical and Computational Physics)',
'Political Science',
'Psychology (Developmental Psychology)',
'Psychology (Clinical Psychology)',
'Psychology (Social Psychology)',
'Social Work',
'Sociology',
'Statistics',
'Theatre Arts',
'Transport Management',
]

const degrees = ['PGD', 'MA', 'MSC', 'PhD', 'Mphil-PhD', 'LLM', 'MBA']

const statesOfOrigin = [
  'Abia',
  'Adamawa',
  'Akwa Ibom',
  'Anambra',
  'Bauchi',
  'Bayelsa',
  'Benue',
  'Borno',
  'Cross River',
  'Delta',
  'Ebonyi',
  'Edo',
  'Ekiti',
  'Enugu',
  'Gombe',
  'Imo',
  'Jigawa',
  'Kaduna',
  'Kano',
  'Katsina',
  'Kebbi',
  'Kogi',
  'Kwara',
  'Lagos',
  'Nasarawa',
  'Niger',
  'Ogun',
  'Ondo',
  'Osun',
  'Oyo',
  'Plateau',
  'Rivers',
  'Sokoto',
  'Taraba',
  'Yobe',
  'Zamfara',
  'Federal Capital Territory: Abuja',
]

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

async function readJsonResponse(response) {
  const text = await response.text()

  if (!text) {
    return {
      message:
        'The API route did not return data. If you are using npm run dev, start the app with npx vercel dev to enable /api routes.',
    }
  }

  try {
    return JSON.parse(text)
  } catch {
    return {
      message:
        'The server returned a non-JSON response. If you are using npm run dev, start the app with npx vercel dev to enable /api routes.',
    }
  }
}

function App() {
  const savedSession = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('studentRegSession'))
    } catch {
      return null
    }
  }, [])

  const [session, setSession] = useState(savedSession)
  const [login, setLogin] = useState(initialLogin)
  const [adminRegistration, setAdminRegistration] = useState(initialAdminRegistration)
  const [authMode, setAuthMode] = useState('login')
  const [student, setStudent] = useState(initialStudent)
  const [status, setStatus] = useState({ type: '', message: '' })
  const [isLoggingIn, setIsLoggingIn] = useState(false)
  const [isRegisteringAdmin, setIsRegisteringAdmin] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const isLoggedIn = Boolean(session?.token)

  function updateLogin(event) {
    const { name, value } = event.target
    setLogin((current) => ({ ...current, [name]: value }))
  }

  function updateAdminRegistration(event) {
    const { name, value } = event.target
    setAdminRegistration((current) => ({ ...current, [name]: value }))
  }

  function updateStudent(event) {
    const { name, value } = event.target
    setStudent((current) => ({ ...current, [name]: value }))
  }

  function switchAuthMode(nextMode) {
    setAuthMode(nextMode)
    setStatus({ type: '', message: '' })
  }

  async function handleLogin(event) {
    event.preventDefault()
    setStatus({ type: '', message: '' })
    setIsLoggingIn(true)

    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(login),
      })
      const result = await readJsonResponse(response)

      if (!response.ok) {
        throw new Error(result.message || 'Login failed')
      }

      const nextSession = {
        username: result.username,
        token: result.token,
      }
      localStorage.setItem('studentRegSession', JSON.stringify(nextSession))
      setSession(nextSession)
      setLogin(initialLogin)
      setStatus({ type: 'success', message: `Welcome, ${result.username}.` })
    } catch (error) {
      setStatus({ type: 'error', message: error.message })
    } finally {
      setIsLoggingIn(false)
    }
  }

  async function handleAdminRegistration(event) {
    event.preventDefault()
    setStatus({ type: '', message: '' })
    setIsRegisteringAdmin(true)

    if (adminRegistration.password !== adminRegistration.confirmPassword) {
      setStatus({ type: 'error', message: 'Passwords do not match.' })
      setIsRegisteringAdmin(false)
      return
    }

    try {
      const response = await fetch('/api/register-admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(adminRegistration),
      })
      const result = await readJsonResponse(response)

      if (!response.ok) {
        throw new Error(result.message || 'Admin registration failed')
      }

      setAdminRegistration(initialAdminRegistration)
      setAuthMode('login')
      setStatus({
        type: result.saved === false ? 'error' : 'success',
        message:
          result.saved === false
            ? 'Admin form works, but Google Sheets is not configured yet.'
            : 'Admin registration submitted for approval.',
      })
    } catch (error) {
      setStatus({ type: 'error', message: error.message })
    } finally {
      setIsRegisteringAdmin(false)
    }
  }

  async function handleRegister(event) {
    event.preventDefault()
    setStatus({ type: '', message: '' })

    const missingField = requiredFields.find((field) => !student[field].trim())
    if (missingField) {
      setStatus({ type: 'error', message: 'Please complete all required fields.' })
      return
    }

    setIsSubmitting(true)
    try {
      const response = await fetch('/api/register-student', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(student),
      })
      const result = await readJsonResponse(response)

      if (!response.ok) {
        throw new Error(result.message || 'Registration failed')
      }

      setStudent(initialStudent)
      setStatus({
        type: result.saved === false ? 'error' : 'success',
        message:
          result.saved === false
            ? 'Form works, but Google Sheets is not configured yet.'
            : `Student registered by ${result.registeredBy}.`,
      })
    } catch (error) {
      setStatus({ type: 'error', message: error.message })
    } finally {
      setIsSubmitting(false)
    }
  }

  function handleLogout() {
    localStorage.removeItem('studentRegSession')
    setSession(null)
    setStudent(initialStudent)
    setStatus({ type: '', message: '' })
  }

  return (
    <main className="app-shell">
      <section className="topbar">
        <div>
          <p className="eyebrow">Student Registration</p>
          <h1>Admin entry desk</h1>
        </div>

        {isLoggedIn && (
          <div className="admin-chip">
            <span>{session.username}</span>
            <button type="button" onClick={handleLogout}>
              Logout
            </button>
          </div>
        )}
      </section>

      {status.message && (
        <p className={`status-message top-status ${status.type}`} role="status">
          {status.message}
        </p>
      )}

      <section className="workspace">
        {!isLoggedIn && authMode === 'login' ? (
          <form className="panel login-panel" onSubmit={handleLogin}>
            <div className="panel-heading">
              <h2>Admin login</h2>
              <p>Only approved admins can register students.</p>
            </div>

            <label>
              Username
              <input
                autoComplete="username"
                name="username"
                onChange={updateLogin}
                placeholder="e.g. admin1"
                required
                value={login.username}
              />
            </label>

            <label>
              Password
              <input
                autoComplete="current-password"
                name="password"
                onChange={updateLogin}
                placeholder="Enter password"
                required
                type="password"
                value={login.password}
              />
            </label>

            <button className="primary-action" disabled={isLoggingIn} type="submit">
              {isLoggingIn ? 'Checking...' : 'Login'}
            </button>

            <div className="auth-switch">
              <span>New admin?</span>
              <button type="button" onClick={() => switchAuthMode('register')}>
                Register
              </button>
            </div>
          </form>
        ) : !isLoggedIn ? (
          <form className="panel login-panel" onSubmit={handleAdminRegistration}>
            <div className="panel-heading">
              <h2>Admin registration</h2>
              <p>Submit your details for admin access.</p>
            </div>

            <div className="admin-register-grid">
              <label>
                First name *
                <input
                  name="firstName"
                  onChange={updateAdminRegistration}
                  placeholder="First name"
                  required
                  value={adminRegistration.firstName}
                />
              </label>

              <label>
                Last name *
                <input
                  name="lastName"
                  onChange={updateAdminRegistration}
                  placeholder="Last name"
                  required
                  value={adminRegistration.lastName}
                />
              </label>

              <label>
                Phone number *
                <input
                  name="phoneNumber"
                  onChange={updateAdminRegistration}
                  placeholder="Phone number"
                  required
                  value={adminRegistration.phoneNumber}
                />
              </label>

              <label>
                Username *
                <input
                  autoComplete="username"
                  name="username"
                  onChange={updateAdminRegistration}
                  placeholder="Preferred username"
                  required
                  value={adminRegistration.username}
                />
              </label>

              <label>
                Email *
                <input
                  name="email"
                  onChange={updateAdminRegistration}
                  placeholder="admin@example.com"
                  required
                  type="email"
                  value={adminRegistration.email}
                />
              </label>

              <label>
                Password *
                <input
                  autoComplete="new-password"
                  name="password"
                  onChange={updateAdminRegistration}
                  placeholder="Create password"
                  required
                  type="password"
                  value={adminRegistration.password}
                />
              </label>

              <label>
                Confirm password *
                <input
                  autoComplete="new-password"
                  name="confirmPassword"
                  onChange={updateAdminRegistration}
                  placeholder="Confirm password"
                  required
                  type="password"
                  value={adminRegistration.confirmPassword}
                />
              </label>
            </div>

            <button className="primary-action" disabled={isRegisteringAdmin} type="submit">
              {isRegisteringAdmin ? 'Submitting...' : 'Register'}
            </button>

            <div className="auth-switch">
              <span>Already approved?</span>
              <button type="button" onClick={() => switchAuthMode('login')}>
                Login
              </button>
            </div>
          </form>
        ) : (
          <form className="panel registration-panel" onSubmit={handleRegister}>
            <div className="panel-heading">
              <h2>Register student</h2>
              <p>Submissions are saved with the current admin name.</p>
            </div>

            <div className="form-grid">
              <label className="full-width">
                Registration type *
                <select
                  name="registrationType"
                  onChange={updateStudent}
                  required
                  value={student.registrationType}
                >
                  <option value="">Select registration type</option>
                  <option value="NewMatricNo">New Registration</option>
                  <option value="Retained">Retained</option>
                </select>
              </label>

              <label>
                First name *
                <input
                  name="firstName"
                  onChange={updateStudent}
                  placeholder="Student first name"
                  required
                  value={student.firstName}
                />
              </label>

              <label>
                Last name (Surname) *
                <input
                  name="lastName"
                  onChange={updateStudent}
                  placeholder="Student last name"
                  required
                  value={student.lastName}
                />
              </label>

              <label>
                Other name
                <input
                  name="otherName"
                  onChange={updateStudent}
                  placeholder="Optional"
                  value={student.otherName}
                />
              </label>

              <label>
                Gender *
                <select name="gender" onChange={updateStudent} required value={student.gender}>
                  <option value="">Select gender</option>
                  <option value="Female">Female</option>
                  <option value="Male">Male</option>
                </select>
              </label>

              <label>
                Date of birth *
                <input
                  name="dateOfBirth"
                  onChange={updateStudent}
                  required
                  type="date"
                  value={student.dateOfBirth}
                />
              </label>

              <label>
                Programme *
                <select
                  name="programme"
                  onChange={updateStudent}
                  required
                  value={student.programme}
                >
                  <option value="">Select programme</option>
                  {programmes.map((programme) => (
                    <option key={programme} value={programme}>
                      {programme}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Department *
                <select
                  name="department"
                  onChange={updateStudent}
                  required
                  value={student.department}
                >
                  <option value="">Select department</option>
                  {departments.map((department) => (
                    <option key={department} value={department}>
                      {department}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Degree *
                <select name="degree" onChange={updateStudent} required value={student.degree}>
                  <option value="">Select degree</option>
                  {degrees.map((degree) => (
                    <option key={degree} value={degree}>
                      {degree}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Semester *
                <select name="semester" onChange={updateStudent} required value={student.semester}>
                  <option value="">Select semester</option>
                  <option value="1st">1st</option>
                  <option value="2nd">2nd</option>
                </select>
              </label>

              <label>
                Email *
                <input
                  name="email"
                  onChange={updateStudent}
                  placeholder="student@example.com"
                  required
                  type="email"
                  value={student.email}
                />
              </label>

              <label>
                Phone number *
                <input
                  name="phoneNumber"
                  onChange={updateStudent}
                  placeholder="Phone number"
                  required
                  value={student.phoneNumber}
                />
              </label>

              <label>
                State of origin *
                <select
                  name="stateOfOrigin"
                  onChange={updateStudent}
                  required
                  value={student.stateOfOrigin}
                >
                  <option value="">Select state</option>
                  {statesOfOrigin.map((state) => (
                    <option key={state} value={state}>
                      {state}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Study mode *
                <select name="studyMode" onChange={updateStudent} required value={student.studyMode}>
                  <option value="">Select study mode</option>
                  <option value="Full-Time">Full-Time</option>
                  <option value="Part-Time">Part-Time</option>
                </select>
              </label>
            </div>

            <button className="primary-action" disabled={isSubmitting} type="submit">
              {isSubmitting ? 'Saving...' : 'Register student'}
            </button>
          </form>
        )}
      </section>
    </main>
  )
}

export default App
