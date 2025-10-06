import { Keycloak, UserProfile } from "@/types/keycloak.interface";
import { createContext } from "react";

interface AuthContextType {
  isAuthenticated: boolean;
  oauth?: Keycloak;
  profile?: UserProfile;
  login: () => void;
  logout: () => void;
  refreshToken: () => Promise<void>;
}

const authenticationContextDefaultValues: AuthContextType = {
  isAuthenticated: false,
  oauth: undefined,
  profile: undefined,
  login: () => {},
  logout: () => {},
  refreshToken: async () => {},
};

export const AuthenticationContext = createContext<AuthContextType>(
  authenticationContextDefaultValues
);
