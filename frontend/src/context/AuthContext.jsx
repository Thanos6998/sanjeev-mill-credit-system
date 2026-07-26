import React, { createContext, useContext, useEffect, useState } from "react";
import { api, formatApiError } from "@/lib/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null); // null=checking, false=guest, obj=user
  const [error, setError] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("khata_token");
    if (!token) { setUser(false); return; }
    api.get("/auth/me")
      .then((r) => setUser(r.data))
      .catch(() => { localStorage.removeItem("khata_token"); setUser(false); });
  }, []);

  const login = async (email, password) => {
    setError("");
    try {
      const r = await api.post("/auth/login", { email, password });
      localStorage.setItem("khata_token", r.data.token);
      setUser(r.data.user);
      return true;
    } catch (e) {
      setError(formatApiError(e));
      return false;
    }
  };

  const logout = () => {
    localStorage.removeItem("khata_token");
    setUser(false);
  };

  return (
    <AuthContext.Provider value={{ user, error, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
