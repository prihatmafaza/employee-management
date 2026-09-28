import { createContext, useCallback, useContext } from 'react'
import type { User } from '../types.ts'
import { ApiError } from '../api/errors.ts'
import { errorMessage } from '../format.ts'

export interface AuthState {
  user: User
  logout(): Promise<void>
  /** Call when the API reports the session is gone, to return to the login page. */
  sessionExpired(): void
}

export const AuthContext = createContext<AuthState | null>(null)

export function useAuth(): AuthState {
  const auth = useContext(AuthContext)
  if (!auth) throw new Error('useAuth must be used inside a logged-in AuthContext')
  return auth
}

/**
 * Returns a function that turns an API error into a message to show, sending
 * the user back to the login page if their session has ended.
 */
export function useErrorHandler(): (err: unknown) => string {
  const { sessionExpired } = useAuth()
  return useCallback(
    (err: unknown) => {
      if (err instanceof ApiError && err.status === 401) sessionExpired()
      return errorMessage(err)
    },
    [sessionExpired],
  )
}
