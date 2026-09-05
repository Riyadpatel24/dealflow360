import { createContext, useContext, useState } from "react";
import { getCurrentUser, loginUser } from "../api/auth";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const savedUser = sessionStorage.getItem("dealflow360_user");
    try { return savedUser ? JSON.parse(savedUser) : null; } catch { sessionStorage.removeItem("dealflow360_user"); return null; }
  });
  const [token, setToken] = useState(sessionStorage.getItem("dealflow360_token"));

  async function establishSession(accessToken, userData) {
    const resolvedUser = userData || await getCurrentUser(accessToken);
    sessionStorage.setItem("dealflow360_token", accessToken);
    sessionStorage.setItem("dealflow360_user", JSON.stringify(resolvedUser));
    setToken(accessToken);
    setUser(resolvedUser);
    return resolvedUser;
  }

  async function login(email, password) {
    const data = await loginUser(email, password);
    const resolvedUser = await establishSession(data.access_token, data.user);
    return { ...data, user: resolvedUser };
  }

  async function loginWithGoogleToken(accessToken) {
    const resolvedUser = await establishSession(accessToken);
    return resolvedUser;
  }

  function logout() {
    sessionStorage.removeItem("dealflow360_token");
    sessionStorage.removeItem("dealflow360_user");
    setToken(null);
    setUser(null);
  }

  return <AuthContext.Provider value={{ user, token, loading: false, login, loginWithGoogleToken, logout, isAuthenticated: Boolean(token && user) }}>{children}</AuthContext.Provider>;
}

export function useAuth() { return useContext(AuthContext); }
