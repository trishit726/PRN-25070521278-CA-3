import { createContext, useContext, useEffect, useState } from "react";
import api from "../services/api";
const AuthContext = createContext(null);
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (localStorage.getItem("labops-token"))
      api
        .get("/auth/me")
        .then(({ data }) => setUser(data.data))
        .catch(() => localStorage.removeItem("labops-token"))
        .finally(() => setLoading(false));
    else setLoading(false);
  }, []);
  const login = async (credentials) => {
    const { data } = await api.post("/auth/login", credentials);
    localStorage.setItem("labops-token", data.data.token);
    setUser(data.data.user);
    return data.data.user;
  };
  const register = async (form) => {
    const { data } = await api.post("/auth/register", form);
    localStorage.setItem("labops-token", data.data.token);
    setUser(data.data.user);
    return data.data.user;
  };
  const logout = () => {
    localStorage.removeItem("labops-token");
    setUser(null);
  };
  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
export const useAuth = () => useContext(AuthContext);
