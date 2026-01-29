import type { Keycloak, UserProfile } from '@/types/keycloak.interface'
import { createContext } from 'react'

interface AuthContextType {
  isAuthenticated: boolean
  oauth?: Keycloak
  profile?: UserProfile
  login: () => Promise<void>
  logout: () => void
  refreshToken: () => Promise<void>
}

const authenticationContextDefaultValues: AuthContextType = {
  isAuthenticated: false,
  oauth: undefined,
  profile: undefined,
  login: async () => {},
  logout: () => {},
  refreshToken: async () => {},
}

export const AuthenticationContext = createContext<AuthContextType>(
  authenticationContextDefaultValues,
)
