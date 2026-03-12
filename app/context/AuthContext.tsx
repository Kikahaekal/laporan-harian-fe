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

const getCookie = (name: string) => {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) {
    const cookieValue = parts.pop()?.split(";").shift();
    return cookieValue ? decodeURIComponent(cookieValue) : undefined;
  }
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const checkUser = async () => {
      try {
        const { data } = await api.get("/api/user");
        setUser(data);
      } catch (error) {
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };
    checkUser();
  }, []);

  const login = async (payload: any) => {
    try {
      // Ambil CSRF token dari Sanctum
      await api.get("/sanctum/csrf-cookie");

      await new Promise((resolve) => setTimeout(resolve, 300));

      const token = getCookie("XSRF-TOKEN");

      if (!token) {
        throw new Error("CSRF token not found");
      }

      // Login via web route (bukan /api/login)
      await api.post("/login", payload, {
        headers: {
          "X-XSRF-TOKEN": token,
        },
      });

      const { data } = await api.get("/api/user");
      setUser(data);
      navigate("/");
    } catch (error) {
      console.error("Login error:", error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      let token = getCookie("XSRF-TOKEN");
      if (!token) {
        await api.get("/sanctum/csrf-cookie");
        await new Promise((resolve) => setTimeout(resolve, 300));
        token = getCookie("XSRF-TOKEN");
      }

      await api.post(
        "/logout",
        {},
        {
          headers: {
            "X-XSRF-TOKEN": token || "",
          },
        },
      );

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
