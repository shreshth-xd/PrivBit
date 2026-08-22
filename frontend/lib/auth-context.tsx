// frontend/lib/auth-context.tsx
"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  getCurrentUser,
  login as apiLogin,
  register as apiRegister,
  ApiError,
  type UserResponse,
  type LoginPayload,
  type RegisterPayload,
} from "./api";

interface AuthContextValue {
  user: UserResponse | null;
  loading: boolean;
  login: (payload: LoginPayload) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // On first mount (e.g. page refresh), ask the backend "who am I?"
  // via /me. If it 401s even after the interceptor's refresh attempt,
  // there's genuinely no valid session — user stays null.
  useEffect(() => {
    getCurrentUser()
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  async function login(payload: LoginPayload) {
    const loggedInUser = await apiLogin(payload);
    setUser(loggedInUser);
  }

  async function register(payload: RegisterPayload) {
    const registeredUser = await apiRegister(payload);
    setUser(registeredUser);
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

export { ApiError };