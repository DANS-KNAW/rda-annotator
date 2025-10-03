import { useState, useEffect } from "react";
import { Authentication } from "@/utils/authentication";
import { AuthenticationContext } from "./authentication.context";
import { Keycloak } from "@/types/keycloak.interface";
import { useNavigate } from "react-router";
import { set } from "react-hook-form";

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
            console.error("Error refreshing token:", error);
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
    const oauth = await auth.authenticate();
    setAuthenticated(true);
    setOauth(oauth);
  };

  const logout = async () => {
    await auth.deauthenticate();
    await storage.removeItem("local:oauth");
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

  /**
   * We set an interval to refresh the token a bit before it expires
   * We clear the interval when the component unmounts or when the user logs out
   * We only set the interval if we are authenticated and have an oauth object
   */
  useEffect(() => {
    if (!authenticated || !oauth) return;
    try {
      const interval = setInterval(() => {
        refreshToken();
      }, oauth.expires_in * 1000 - 30 * 1000);

      return () => clearInterval(interval);
    } catch (error) {
      setAuthenticated(false);
      setOauth(undefined);
    }
  }, [authenticated]);

  return (
    <AuthenticationContext.Provider
      value={{
        isAuthenticated: authenticated,
        oauth,
        login,
        logout,
        refreshToken,
      }}
    >
      {children}
    </AuthenticationContext.Provider>
  );
}
