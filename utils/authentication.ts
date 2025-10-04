import pkceChallenge from "pkce-challenge";
import { storage } from "#imports";
import { Keycloak } from "@/types/keycloak.interface";

export class Authentication {
  private readonly issuer: string;
  private readonly clientId: string;
  private readonly redirectUri: string;
  private readonly scopes: string[] = ["openid", "email", "profile"];

  constructor(issuer: string, clientId: string) {
    this.issuer = issuer;
    this.clientId = clientId;
    this.redirectUri = browser.identity.getRedirectURL();
  }

  /**
   * Builds the authorization URL for initiating the OAuth 2.0/OpenID Connect authentication flow using PKCE.
   *
   * This method generates a unique state and PKCE code verifier/challenge pair, then constructs the authorization URL
   * with the appropriate query parameters for the authentication request.
   *
   * @returns A promise that resolves to an object containing:
   * - `url`: The complete authorization URL to redirect the user to.
   * - `verifier`: The PKCE code verifier to be used later for token exchange.
   * - `state`: The unique state string for CSRF protection.
   *
   * @remarks
   * The returned `verifier` and `state` should be securely stored for later validation and token exchange.
   */
  async buildAuthUrl(): Promise<{
    url: string;
    verifier: string;
    state: string;
  }> {
    const state = crypto.randomUUID();
    const { code_challenge, code_verifier } = await pkceChallenge();

    const authUrl = new URL(`${this.issuer}/protocol/openid-connect/auth`);
    authUrl.searchParams.set("client_id", this.clientId);
    authUrl.searchParams.set("response_type", "code");
    authUrl.searchParams.set("redirect_uri", this.redirectUri);
    authUrl.searchParams.set("scope", this.scopes.join(" "));
    authUrl.searchParams.set("state", state);
    authUrl.searchParams.set("code_challenge", code_challenge);
    authUrl.searchParams.set("code_challenge_method", "S256");

    return { url: authUrl.toString(), verifier: code_verifier, state };
  }

  /**
   * Initiates the OAuth2 authentication flow using the browser's identity API.
   *
   * This method performs the following steps:
   * 1. Builds the authentication URL and code verifier.
   * 2. Launches a web authentication flow for the user to log in.
   * 3. Handles the redirect URL to extract the authorization code and state.
   * 4. Exchanges the authorization code for tokens (access, refresh, etc.).
   * 5. Calculates and sets token expiration timestamps.
   * 6. Stores the token response in local storage.
   *
   * @throws {Error} If authentication is cancelled, fails, or required parameters are missing.
   * @returns {Promise<Keycloak>} The token response object containing authentication tokens and expiration information.
   */
  async authenticate(): Promise<Keycloak> {
    const ctx = await this.buildAuthUrl();

    const redirectedUrl = await browser.identity.launchWebAuthFlow({
      url: ctx.url,
      interactive: true,
    });

    if (!redirectedUrl) {
      throw new Error("Authentication was cancelled or failed");
    }

    const url = new URL(redirectedUrl);
    const state = url.searchParams.get("state");
    const code = url.searchParams.get("code");

    if (!state || !code) {
      throw new Error("Missing state or code in redirect URL");
    }

    const tokenUrl = `${this.issuer}/protocol/openid-connect/token`;

    const body = new URLSearchParams();
    body.set("grant_type", "authorization_code");
    body.set("code", code);
    body.set("redirect_uri", this.redirectUri);
    body.set("client_id", this.clientId);
    body.set("code_verifier", ctx.verifier);

    const response = await fetch(tokenUrl, {
      method: "POST",
      body: body,
    });

    if (!response.ok) {
      throw new Error("Failed to exchange code for token");
    }

    const tokenResponse: Keycloak = await response.json();

    tokenResponse.expires_at =
      Math.floor(Date.now() / 1000) + tokenResponse.expires_in;
    tokenResponse.refresh_expires_at =
      Math.floor(Date.now() / 1000) + tokenResponse.refresh_expires_in;

    await storage.setItem("local:oauth", tokenResponse);

    return tokenResponse;
  }

  /**
   * Logs out the current user by revoking the OAuth refresh token and removing it from storage.
   *
   * This method retrieves the stored OAuth token, sends a POST request to the Keycloak logout endpoint
   * to revoke the refresh token, and then removes the token from local storage.
   *
   * @throws {Error} If there is no OAuth token to revoke or if the token revocation fails.
   * @returns {Promise<void>} A promise that resolves when the token has been successfully revoked and removed.
   */
  async deauthenticate(): Promise<void> {
    const oauth = await storage.getItem<Keycloak>("local:oauth");

    if (oauth === null) {
      throw new Error("No OAuth token to revoke");
    }

    const body = new URLSearchParams();
    body.set("client_id", this.clientId);
    body.set("refresh_token", oauth.refresh_token);

    const tokenUrl = `${this.issuer}/protocol/openid-connect/logout`;

    const response = await fetch(tokenUrl, {
      method: "POST",
      body: body,
    });

    if (!response.ok) {
      throw new Error("Failed to revoke token");
    }

    await storage.removeItem("local:oauth");
  }

  /**
   * Refreshes the OAuth access token using the stored refresh token.
   *
   * This method retrieves the current OAuth token from storage and attempts to
   * obtain a new access token by making a POST request to the Keycloak token endpoint.
   * If the refresh token is missing or the request fails, an error is thrown.
   * On success, the new token information is returned.
   *
   * @returns {Promise<Keycloak>} A promise that resolves to the refreshed Keycloak token object.
   * @throws {Error} If there is no stored OAuth token or if the token refresh request fails.
   */
  async refreshToken(): Promise<Keycloak> {
    const oauth = await storage.getItem<Keycloak>("local:oauth");

    if (oauth === null) {
      throw new Error("No OAuth token to refresh");
    }

    const body = new URLSearchParams();
    body.set("grant_type", "refresh_token");
    body.set("refresh_token", oauth.refresh_token);
    body.set("client_id", this.clientId);

    const tokenUrl = `${this.issuer}/protocol/openid-connect/token`;

    const response = await fetch(tokenUrl, {
      method: "POST",
      body: body,
    });

    if (!response.ok) {
      throw new Error("Failed to refresh token");
    }

    const tokenResponse: Keycloak = await response.json();

    tokenResponse.expires_at =
      Math.floor(Date.now() / 1000) + tokenResponse.expires_in;
    tokenResponse.refresh_expires_at =
      Math.floor(Date.now() / 1000) + tokenResponse.refresh_expires_in;

    await storage.setItem("local:oauth", tokenResponse);

    return tokenResponse;
  }

  /**
   * Retrieves the authenticated user's profile information from Keycloak.
   *
   * This method fetches the user profile by making a GET request to the Keycloak userinfo endpoint
   * using the stored access token. The profile typically includes claims such as sub (subject/user ID),
   * email, name, preferred_username, and other attributes based on the requested scopes.
   *
   * @returns {Promise<any>} A promise that resolves to the user profile object containing user information.
   * @throws {Error} If there is no stored OAuth token or if the profile request fails.
   */
  async getUserProfile(): Promise<any> {
    const oauth = await storage.getItem<Keycloak>("local:oauth");

    if (oauth === null) {
      throw new Error("No OAuth token available");
    }

    const userinfoUrl = `${this.issuer}/protocol/openid-connect/userinfo`;

    const response = await fetch(userinfoUrl, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${oauth.access_token}`,
      },
    });

    if (!response.ok) {
      throw new Error("Failed to fetch user profile");
    }

    const userProfile = await response.json();

    return userProfile;
  }
}
