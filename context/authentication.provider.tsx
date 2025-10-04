import { useState, useEffect } from "react";
import { Authentication } from "@/utils/authentication";
import { AuthenticationContext } from "./authentication.context";
import { Keycloak } from "@/types/keycloak.interface";
import { useNavigate } from "react-router";

interface AuthenticationProviderProps {
  children: React.ReactNode;
}

export default function AuthenticationProvider({
  children,
}: AuthenticationProviderProps) {
  const [authenticated, setAuthenticated] = useState(false);
  const [oauth, setOauth] = useState<Keycloak | undefined>(undefined);
  const navigate = useNavigate();

  const auth = new Authentication(
    import.meta.env.WXT_KEYCLOAK_URL,
    import.meta.env.WXT_KEYCLOAK_CLIENT_ID
  );

  useEffect(() => {
    (async () => {
      const storedOauth = await storage.getItem<Keycloak>("local:oauth");

      if (storedOauth) {
        const currentTime = Math.floor(Date.now() / 1000);

        if (storedOauth.refresh_expires_at < currentTime) {
          try {
            const refresed = await auth.refreshToken();
            setOauth(refresed);
            setAuthenticated(true);
            return;
          } catch (error) {
            await storage.removeItem("local:oauth");
            setAuthenticated(false);
            setOauth(undefined);
            return;
          }
        }

        if (storedOauth.expires_at < currentTime) {
          console.log("Access token expired, refreshing token");

          const authenticatedOauth = await auth.refreshToken();
          setOauth(authenticatedOauth);
          setAuthenticated(true);
          return;
        }

        setOauth(storedOauth);
        setAuthenticated(true);
      }
    })();
  }, []);

  const login = async () => {
    try {
      const oauth = await auth.authenticate();
      setAuthenticated(true);
      setOauth(oauth);
    } catch (error) {}
  };

  const logout = async () => {
    try {
      await auth.deauthenticate();
      await storage.removeItem("local:oauth");
    } catch (error) {}
    setAuthenticated(false);
    setOauth(undefined);
    navigate("/annotations");
  };

  const refreshToken = async () => {
    try {
      if (!authenticated) return;
      const refreshToken = await auth.refreshToken();
      setOauth(refreshToken);
      setAuthenticated(true);
    } catch (error) {
      setAuthenticated(false);
      setOauth(undefined);
      await storage.removeItem("local:oauth");
    }
  };

  const ensureValidToken = async () => {
    const storedOauth = await storage.getItem<Keycloak>("local:oauth");

    if (!storedOauth) {
      throw new Error("No authentication token available");
    }

    const currentTime = Math.floor(Date.now() / 1000);

    if (storedOauth.expires_at < currentTime + 30) {
      await refreshToken();
    }
  };

  const getUserProfile = async () => {
    try {
      await ensureValidToken();

      const profile = await auth.getUserProfile();
      return profile;
    } catch (error) {
      setAuthenticated(false);
      setOauth(undefined);
      await storage.removeItem("local:oauth");
    }
  };

  /**
   * We set an interval to refresh the token a bit before it expires
   * We clear the interval when the component unmounts or when the user logs out
   * We only set the interval if we are authenticated and have an oauth object
   */
  useEffect(() => {
    if (!authenticated || !oauth) return;

    try {
      const currentTime = Math.floor(Date.now() / 1000);
      const timeUntilExpiry = oauth.expires_at - currentTime;

      // Refresh 30 seconds before expiry, or immediately if already expired
      const refreshIn = Math.max((timeUntilExpiry - 30) * 1000, 0);

      const timeout = setTimeout(() => {
        refreshToken();
      }, refreshIn);

      return () => clearTimeout(timeout);
    } catch (error) {
      setAuthenticated(false);
      setOauth(undefined);
    }
  }, [authenticated, oauth]);

  return (
    <AuthenticationContext.Provider
      value={{
        isAuthenticated: authenticated,
        oauth,
        login,
        logout,
        refreshToken,
        getUserProfile,
      }}
    >
      {children}
    </AuthenticationContext.Provider>
  );
}
