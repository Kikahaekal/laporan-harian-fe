import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from "react";
import api from "../lib/axios";
import { useNavigate } from "react-router";

interface User {
  id: number;
  name: string;
  email: string;
  role: string;
}

interface AuthContextType {
  user: User | null;
  login: (payload: any) => Promise<void>;
  logout: () => Promise<void>;
  isLoading: boolean;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const checkUser = async () => {
      try {
        const { data } = await api.get("/api/web/user");
        setUser(data);
      } catch {
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };
    checkUser();
  }, []);

  const login = async (payload: any) => {
    try {
      // Ambil CSRF cookie dulu sebelum login (wajib untuk Sanctum session-based auth)
      await api.get("/sanctum/csrf-cookie");

      // Login via web route (session-based)
      await api.post("/login", payload);

      // Fetch user yang sedang login
      const { data } = await api.get("/api/web/user");
      setUser(data);
      navigate("/");
    } catch (error) {
      console.error("Login error:", error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await api.post("/api/web/logout");
      setUser(null);
      navigate("/login");
    } catch (error) {
      console.error("Logout error:", error);
      setUser(null);
      navigate("/login");
    }
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading, isAdmin: user?.role === 'admin' }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext)!;
