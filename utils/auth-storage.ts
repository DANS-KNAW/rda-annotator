import { Keycloak, UserProfile } from "@/types/keycloak.interface";

export class AuthStorage {
  private static readonly OAUTH_KEY = "local:oauth";
  private static readonly USER_KEY = "local:user";

  static async getOauth(): Promise<Keycloak | null> {
    return await storage.getItem<Keycloak>(this.OAUTH_KEY);
  }

  static async setOauth(oauth: Keycloak): Promise<void> {
    await storage.setItem(this.OAUTH_KEY, oauth);
  }

  static async getUser(): Promise<UserProfile | null> {
    return await storage.getItem<UserProfile>(this.USER_KEY);
  }

  static async setUser(user: UserProfile): Promise<void> {
    await storage.setItem(this.USER_KEY, user);
  }

  static async clearAuth(): Promise<void> {
    await Promise.all([
      storage.removeItem(this.OAUTH_KEY),
      storage.removeItem(this.USER_KEY),
    ]);
  }
}
