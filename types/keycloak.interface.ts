export interface Keycloak {
  'access_token': string
  'expires_in': number
  'expires_at': number
  'refresh_expires_in': number
  'refresh_expires_at': number
  'refresh_token': string
  'token_type': string
  'id_token': string
  'not-before-policy': number
  'session_state': string
  'scope': string
  'identity_provider_identity': string
}

export interface UserProfile {
  email: string
  email_verified: boolean
  family_name: string
  given_name: string
  name: string
  preferred_username: string
  resource_access: {
    account: {
      roles: string[]
    }
  }
  sub: string
}
