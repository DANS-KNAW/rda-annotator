import { useState, useEffect } from "react";
import { Authentication } from "@/utils/authentication";
import { AuthenticationContext } from "./authentication.context";
import { Keycloak, UserProfile } from "@/types/keycloak.interface";
import { useNavigate } from "react-router";
import { AuthStorage } from "@/utils/auth-storage";

interface AuthenticationProviderProps {
  children: React.ReactNode;
}

export default function AuthenticationProvider({
  children,
}: AuthenticationProviderProps) {
  const [authenticated, setAuthenticated] = useState(false);
  const [oauth, setOauth] = useState<Keycloak | undefined>(undefined);
  const [profile, setProfile] = useState<UserProfile | undefined>(undefined);
  const navigate = useNavigate();

  const auth = new Authentication(
    import.meta.env.WXT_KEYCLOAK_URL,
    import.meta.env.WXT_KEYCLOAK_CLIENT_ID
  );

  const clearAuthState = async () => {
    await AuthStorage.clearAuth();
    setAuthenticated(false);
    setOauth(undefined);
  };

  const setAuthState = async (oauthData: Keycloak) => {
    await AuthStorage.setOauth(oauthData);
    setOauth(oauthData);
    setAuthenticated(true);
  };

  useEffect(() => {
    (async () => {
      const storedOauth = await AuthStorage.getOauth();

      if (!storedOauth) return;

      const currentTime = Math.floor(Date.now() / 1000);

      if (storedOauth.refresh_expires_at < currentTime) {
        try {
          const refresed = await auth.refreshToken();
          await setAuthState(refresed);
          return;
        } catch (error) {
          await clearAuthState();
          return;
        }
      }

      if (storedOauth.expires_at < currentTime) {
        const authenticatedOauth = await auth.refreshToken();
        await setAuthState(authenticatedOauth);
        return;
      }

      setOauth(storedOauth);
      setAuthenticated(true);
    })();
  }, []);

  const login = async () => {
    try {
      const oauth = await auth.authenticate();
      const profile = await auth.getUserProfile();
      setProfile(profile);
      setAuthState(oauth);
    } catch (error) {
      await clearAuthState();
    }
  };

  const logout = async () => {
    try {
      await auth.deauthenticate();
    } catch (error) {
      throw new Error("Logout failed");
    }
    await clearAuthState();
    navigate("/annotations");
  };

  const refreshToken = async () => {
    if (!authenticated) return;
    try {
      const refreshToken = await auth.refreshToken();
      await setAuthState(refreshToken);
    } catch (error) {
      await clearAuthState();
    }
  };

  const ensureValidToken = async () => {
    const storedOauth = await AuthStorage.getOauth();

    if (!storedOauth) {
      await clearAuthState();
      throw new Error("No authentication token available");
    }

    const currentTime = Math.floor(Date.now() / 1000);

    if (storedOauth.expires_at < currentTime + 30) {
      await refreshToken();
    }
  };

  /**
   * We set an interval to refresh the token a bit before it expires
   * We clear the interval when the component unmounts or when the user logs out
   * We only set the interval if we are authenticated and have an oauth object
   */
  useEffect(() => {
    if (!authenticated || !oauth) return;

    const currentTime = Math.floor(Date.now() / 1000);
    const timeUntilExpiry = oauth.expires_at - currentTime;

    // Refresh 30 seconds before expiry, or immediately if already expired
    const refreshIn = Math.max((timeUntilExpiry - 30) * 1000, 0);

    const timeout = setTimeout(() => {
      refreshToken();
    }, refreshIn);

    return () => clearTimeout(timeout);
  }, [authenticated, oauth]);

  return (
    <AuthenticationContext.Provider
      value={{
        isAuthenticated: authenticated,
        oauth,
        profile,
        login,
        logout,
        refreshToken,
      }}
    >
      {children}
    </AuthenticationContext.Provider>
  );
}
