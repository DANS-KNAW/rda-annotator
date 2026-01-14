# Authentication Component

This document explains how user authentication works with Keycloak and ORCID using OAuth2 PKCE.

## Table of Contents

- [Overview](#overview)
- [OAuth2 PKCE Flow](#oauth2-pkce-flow)
- [AuthenticationProvider](#authenticationprovider)
- [Token Management](#token-management)
- [Auto-Refresh Mechanism](#auto-refresh-mechanism)
- [Usage Patterns](#usage-patterns)

## Overview

The extension uses Keycloak for authentication with ORCID integration. The OAuth2 PKCE flow provides secure authentication without requiring a client secret.

**Key Files:**

- `context/authentication.provider.tsx` - React provider managing auth state
- `utils/authentication.ts` - Core authentication logic
- `utils/auth-storage.ts` - Token persistence
- `context/authentication.context.ts` - React Context definition

### Why PKCE?

Traditional OAuth2 requires a client secret to exchange authorization codes for tokens. Browser extensions cannot store secrets securely because users can inspect extension files.

PKCE solves this by using a dynamically generated code verifier instead of a static secret. Each login creates a fresh verifier that's never reused.

## OAuth2 PKCE Flow

### Flow Steps

**1. Generate Code Verifier and Challenge**

- Create random code verifier (43-128 characters)
- Generate code challenge (SHA-256 hash of verifier, base64-url encoded)
- Store verifier temporarily for later use

**2. Open Keycloak Authorization URL**

Open authorization URL in new window with:

- Client ID
- Redirect URI
- Code challenge
- Response type (code)
- Scope (openid profile email)

User sees Keycloak's ORCID login page and authenticates.

**3. Handle Redirect**

After login, Keycloak redirects to callback URL with authorization code. The extension intercepts this redirect.

**4. Exchange Code for Tokens**

Request tokens from Keycloak:

- Send authorization code
- Include code verifier (proves we initiated the request)
- Receive access token and refresh token

Keycloak verifies the code verifier matches the original code challenge.

**5. Store Tokens**

Store tokens in extension storage (encrypted by browser):

- Access token (for API requests)
- Refresh token (to get new access tokens)
- Expiry timestamps

### Security Features

**No client secret** - Code verifier is generated fresh each time

**Code challenge prevents interception** - Attacker can't exchange code without verifier

**Verifier never transmitted** - Only hash (challenge) is sent to Keycloak

**Single-use codes** - Authorization code can only be exchanged once

## AuthenticationProvider

React Context provider that manages authentication state for the sidebar application.

File: `context/authentication.provider.tsx`

### State Management

The provider maintains:

**authenticated**: Boolean indicating if user is logged in

**oauth**: Token data (access token, refresh token, expiry times)

**profile**: User profile from Keycloak (name, email, etc.)

### Initialization

On mount, the provider:

1. Loads stored tokens from extension storage
2. Checks if refresh token is expired
3. If expired, attempts refresh or clears auth
4. If access token is expired, refreshes it
5. If tokens are valid, sets authenticated state

This ensures users stay logged in across sidebar reopens.

### Login Process

When user clicks login:

1. Call authentication utility to start OAuth flow
2. Open Keycloak window
3. User authenticates with ORCID
4. Receive tokens from Keycloak
5. Fetch user profile
6. Store tokens and set authenticated state

### Logout Process

When user logs out:

1. Call deauthenticate to notify Keycloak
2. Clear stored tokens
3. Reset authenticated state
4. Navigate to annotations page

## Token Management

### Token Storage

Tokens are stored in extension storage, which the browser encrypts:

```typescript
// Store tokens
await storage.setItem('local:oauth', {
  access_token: '...',
  refresh_token: '...',
  expires_at: timestamp,
  refresh_expires_at: timestamp,
})

// Retrieve tokens
const oauth = await storage.getItem('local:oauth')

// Clear tokens
await storage.removeItem('local:oauth')
```

**Security notes:**

- Uses extension storage, not localStorage
- Browser encrypts storage automatically
- Other extensions and websites cannot access it
- Cleared on logout

### Token Structure

Tokens include:

**access_token**: JWT token for API requests (expires quickly, usually 15-30 minutes)

**refresh_token**: Token to obtain new access tokens (expires slowly, usually 24 hours to 30 days)

**expires_at**: Unix timestamp when access token expires

**refresh_expires_at**: Unix timestamp when refresh token expires

### Token Refresh

When access token expires:

1. Use refresh token to request new tokens
2. Receive new access token and refresh token
3. Update stored tokens with new values
4. Continue using new access token

When refresh token expires:

- User must log in again
- Happens after extended inactivity

## Auto-Refresh Mechanism

The provider automatically refreshes access tokens before they expire.

### How It Works

1. Check when access token expires
2. Calculate time until 30 seconds before expiry
3. Set timeout to refresh at that time
4. When timeout fires, refresh the token
5. Repeat process with new token

### Why 30 Seconds Before Expiry?

This buffer prevents race conditions:

- Check: Token expires in 30 seconds
- Refresh token (new token expires in 30 minutes)
- Make API request
- Token definitely valid

### Implementation Pattern

The provider uses a React effect that:

- Runs when authenticated state or oauth data changes
- Calculates refresh time
- Sets timeout
- Cleans up timeout on unmount

This ensures only one refresh timer runs at a time.

## Usage Patterns

### Using Authentication in Components

```typescript
import { useContext } from "react";
import { AuthenticationContext } from "@/context/authentication.context";

function MyComponent() {
  const { isAuthenticated, login } = useContext(AuthenticationContext);

  if (!isAuthenticated) {
    return <button onClick={login}>Login with ORCID</button>;
  }

  return <div>Welcome, authenticated user!</div>;
}
```

### Making Authenticated Requests

```typescript
import { use } from 'react'
import { AuthenticationContext } from '@/context/authentication.context'

function useAnnotations() {
  const { oauth } = use(AuthenticationContext)

  const fetchAnnotations = async () => {
    const response = await fetch(`${API_URL}/annotations`, {
      headers: {
        Authorization: `Bearer ${oauth?.access_token}`,
      },
    })
    return response.json()
  }

  return { fetchAnnotations }
}
```

### Checking Authentication Status

```typescript
function ProtectedRoute({ children }) {
  const { isAuthenticated, login } = useContext(AuthenticationContext);

  if (!isAuthenticated) {
    return (
      <div>
        <h1>Authentication Required</h1>
        <button onClick={login}>Login with ORCID</button>
      </div>
    );
  }

  return children;
}
```

### Handling Logout

```typescript
function UserMenu() {
  const { logout } = useContext(AuthenticationContext);

  const handleLogout = async () => {
    await logout();
    // User is redirected to annotations page
  };

  return <button onClick={handleLogout}>Logout</button>;
}
```

### Ensuring Valid Token

Before making API requests, ensure the token is valid:

```typescript
const { oauth, refreshToken } = use(AuthenticationContext)

// Check if token expires soon
const needsRefresh = oauth.expires_at < Date.now() / 1000 + 30

if (needsRefresh) {
  await refreshToken()
}

// Now safe to make request
const response = await fetch(API_URL, {
  headers: { Authorization: `Bearer ${oauth.access_token}` },
})
```

## Error Handling

### Refresh Failures

If token refresh fails:

- Clear authentication state
- User sees login screen
- Common causes: network issues, token revoked, Keycloak unavailable

### Login Failures

If login fails:

- Clear any partial auth state
- Show error to user
- User can retry login

### Token Expiry

If refresh token expires:

- User must log in again
- Happens after extended inactivity
- Normal behavior, not an error

## Summary

The authentication system uses Keycloak with OAuth2 PKCE for secure ORCID login.

Key features:

- PKCE flow prevents token interception
- Tokens stored in encrypted browser storage
- Automatic refresh 30 seconds before expiry
- Global state via React Context
- Handles token expiry gracefully

Key concepts:

- Code verifier replaces client secret
- Access tokens expire quickly
- Refresh tokens expire slowly
- Auto-refresh prevents request failures
- Users stay logged in across sessions

For related documentation:

- [Architecture Overview](../architecture/overview.md) - System context and authentication flow
