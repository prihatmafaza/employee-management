import type { Role } from './types.ts'

export interface NavItem {
  to: string
  label: string
}

const DASHBOARD: NavItem = { to: '/dashboard', label: 'Dashboard' }

const NAV: Record<Role, NavItem[]> = {
  USER: [
    DASHBOARD,
    { to: '/request-access', label: 'Request Access' },
    { to: '/my-requests', label: 'My Requests' },
  ],
  MANAGER: [DASHBOARD, { to: '/approvals', label: 'Approve Request' }],
  ADMIN: [DASHBOARD, { to: '/approvals', label: 'Approve Request' }],
}

/** Where each role lands after login: the page for their main task. */
const HOME: Record<Role, string> = {
  USER: '/request-access',
  MANAGER: '/approvals',
  ADMIN: '/approvals',
}

export function navItems(role: Role): NavItem[] {
  return NAV[role]
}

export function homePath(role: Role): string {
  return HOME[role]
}
