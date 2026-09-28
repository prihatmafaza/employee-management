import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router'
import { api } from './api/index.ts'
import { AuthContext, useAuth, type AuthState } from './auth/context.ts'
import { Layout } from './components/Layout.tsx'
import { ApproveRequestPage } from './pages/ApproveRequestPage.tsx'
import { DashboardPage } from './pages/DashboardPage.tsx'
import { LoginPage } from './pages/LoginPage.tsx'
import { MyRequestsPage } from './pages/MyRequestsPage.tsx'
import { RequestAccessPage } from './pages/RequestAccessPage.tsx'
import { homePath } from './routes.ts'
import type { Role, User } from './types.ts'

export default function App() {
  // undefined = still checking for an existing session.
  const [user, setUser] = useState<User | null | undefined>(undefined)

  useEffect(() => {
    api.me().then(setUser, () => setUser(null))
  }, [])

  const sessionExpired = useCallback(() => setUser(null), [])

  const auth = useMemo<AuthState | null>(
    () =>
      user
        ? {
            user,
            sessionExpired,
            logout: async () => {
              await api.logout()
              setUser(null)
            },
          }
        : null,
    [user, sessionExpired],
  )

  if (user === undefined) return <p className="muted center">Loading…</p>

  return (
    <BrowserRouter>
      {auth ? (
        <AuthContext.Provider value={auth}>
          <Routes>
            <Route element={<Layout />}>
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route
                path="/request-access"
                element={<RequireRole roles={['USER']}><RequestAccessPage /></RequireRole>}
              />
              <Route
                path="/my-requests"
                element={<RequireRole roles={['USER']}><MyRequestsPage /></RequireRole>}
              />
              <Route
                path="/approvals"
                element={<RequireRole roles={['MANAGER', 'ADMIN']}><ApproveRequestPage /></RequireRole>}
              />
            </Route>
            <Route path="/login" element={<RedirectAfterLogin />} />
            <Route path="*" element={<Navigate to={homePath(auth.user.role)} replace />} />
          </Routes>
        </AuthContext.Provider>
      ) : (
        <Routes>
          <Route path="/login" element={<LoginPage onLogin={setUser} />} />
          <Route path="*" element={<RedirectToLogin />} />
        </Routes>
      )}
    </BrowserRouter>
  )
}

/** Sends users to their own home page if they open a page their role can't use. */
function RequireRole({ roles, children }: { roles: Role[]; children: ReactNode }) {
  const { user } = useAuth()
  return roles.includes(user.role) ? children : <Navigate to={homePath(user.role)} replace />
}

function RedirectToLogin() {
  const { pathname } = useLocation()
  return <Navigate to="/login" replace state={{ from: pathname }} />
}

/** After logging in, go back to the page the user originally asked for, if any. */
function RedirectAfterLogin() {
  const { user } = useAuth()
  const from = (useLocation().state as { from?: string } | null)?.from
  return <Navigate to={from ?? homePath(user.role)} replace />
}
