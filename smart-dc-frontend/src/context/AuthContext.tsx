import { createContext, useEffect, useState } from "react";

import { getProfileApi, loginApi, type LoginDto } from "../api/auth.api";
import { unwrapApiData } from "../utils/api";
import type { Role } from "../utils/roles";

interface AuthUser {
  id: string;
  name?: string;
  email: string;
  role: Role;
}

interface AuthContextType {
  user: AuthUser | null;
  login: (data: LoginDto) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: any) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void checkAuth();
  }, []);

  const refreshUser = async () => {
    try {
      const token = localStorage.getItem("token");

      if (!token) {
        setLoading(false);
        return;
      }

      const res = await getProfileApi();
      const profilePayload = unwrapApiData<any>(res) || {};
      const profile = profilePayload.data || profilePayload;
      setUser(profile);
    } catch {
      localStorage.removeItem("token");
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const checkAuth = async () => {
    await refreshUser();
  };

  const login = async (data: LoginDto) => {
    const res = await loginApi(data);
    const payload = unwrapApiData<any>(res) || {};
    const authData = payload.data || payload;
    const token = authData.accessToken;

    if (!token) {
      throw new Error("Login response did not include a token.");
    }

    localStorage.setItem("token", token);

    if (authData.user) {
      setUser(authData.user);
      return;
    }

    const profileRes = await getProfileApi();
    const profilePayload = unwrapApiData<any>(profileRes) || {};
    setUser(profilePayload.data || profilePayload);
  };

  const logout = () => {
    localStorage.removeItem("token");
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, refreshUser }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
