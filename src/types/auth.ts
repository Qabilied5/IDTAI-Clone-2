export interface LoginCredentials {
  email: string;
  password: string;
  rememberMe: boolean;
}

export type UserRole = "super_admin" | "admin" | "agent" | "viewer";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatarInitials: string;
}

export interface AuthResponse {
  user: AuthUser;
  token: string;
}
