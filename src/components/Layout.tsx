import { NavLink, Outlet } from 'react-router'
import { useAuth } from '../auth/context.ts'
import { navItems } from '../routes.ts'

const ROLE_LABELS = { USER: 'Employee', MANAGER: 'Manager', ADMIN: 'Admin' } as const

export function Layout() {
  const { user, logout } = useAuth()
  return (
    <div className="app">
      <header className="topbar">
        <div className="topbar-left">
          <div className="brand">Access Requests</div>
          <nav className="nav">
            {navItems(user.role).map((item) => (
              <NavLink key={item.to} to={item.to} className="nav-link">
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>
        <div className="topbar-user">
          <span>
            {user.fullName} <span className="role-tag">{ROLE_LABELS[user.role]}</span>
          </span>
          <button type="button" className="btn btn-ghost" onClick={() => void logout()}>
            Log out
          </button>
        </div>
      </header>
      <main className="content">
        <Outlet />
      </main>
    </div>
  )
}
