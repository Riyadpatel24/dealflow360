import {
  createContext,
  useContext,
  useState,
} from "react";

import {
  loginUser,
} from "../api/auth";


const AuthContext = createContext(null);


export function AuthProvider({
  children,
}) {
  const [user, setUser] =
    useState(() => {
      const savedUser = sessionStorage.getItem(
        "dealflow360_user"
      );

      try {
        return savedUser ? JSON.parse(savedUser) : null;
      } catch {
        sessionStorage.removeItem("dealflow360_user");
        return null;
      }
    });

  const [token, setToken] =
    useState(
      sessionStorage.getItem(
        "dealflow360_token"
      )
    );

  const loading = false;


  async function login(
    email,
    password
  ) {
    const data =
      await loginUser(
        email,
        password
      );

    sessionStorage.setItem(
      "dealflow360_token",
      data.access_token
    );

    sessionStorage.setItem(
      "dealflow360_user",
      JSON.stringify(data.user)
    );

    setToken(
      data.access_token
    );

    setUser(data.user);

    return data;
  }


  function logout() {
    sessionStorage.removeItem(
      "dealflow360_token"
    );

    sessionStorage.removeItem(
      "dealflow360_user"
    );

    setToken(null);
    setUser(null);
  }


  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        logout,
        isAuthenticated:
          Boolean(
            token && user
          ),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}


export function useAuth() {
  return useContext(
    AuthContext
  );
}
