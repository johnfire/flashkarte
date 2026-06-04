import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { api, setAccessToken } from "../api/client";
import { User } from "../api/types";

interface AuthValue {
  user: User | null;
  authed: boolean;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const Ctx = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [authed, setAuthed] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.auth
      .refresh()
      .then((r) => {
        setAccessToken(r.accessToken);
        setAuthed(true);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const login = async (email: string, password: string) => {
    const r = await api.auth.login(email, password);
    setAccessToken(r.accessToken);
    setUser(r.user);
    setAuthed(true);
  };

  const signup = async (email: string, password: string) => {
    const r = await api.auth.signup(email, password);
    setAccessToken(r.accessToken);
    setUser(r.user);
    setAuthed(true);
  };

  const logout = async () => {
    await api.auth.logout().catch(() => {});
    setAccessToken(null);
    setUser(null);
    setAuthed(false);
  };

  return (
    <Ctx.Provider value={{ user, authed, loading, login, signup, logout }}>
      {children}
    </Ctx.Provider>
  );
}

export function useAuth() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAuth must be used within AuthProvider");
  return v;
}
