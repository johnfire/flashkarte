import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { api, setAccessToken } from "../api/client";
import { User } from "../api/types";
import i18n from "../i18n";
import { resolveLocale } from "../i18n/resolveLocale";

interface AuthValue {
  user: User | null;
  authed: boolean;
  loading: boolean;
  /** Resolves with a challenge when the account has 2FA enabled. */
  login: (
    email: string,
    password: string,
    rememberMe: boolean,
  ) => Promise<{ requiresTwoFactor: true; challenge: string } | undefined>;
  completeTwoFactorLogin: (
    challenge: string,
    code: string,
    rememberMe: boolean,
  ) => Promise<void>;
  signup: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (user: User) => void;
}

const Ctx = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [authed, setAuthed] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.auth
      .refresh()
      .then(async (r) => {
        setAccessToken(r.accessToken);
        setAuthed(true);
        // Restore the full user profile so post-refresh sessions know who they
        // are (verification status, account type, etc.).
        try {
          const { user } = await api.auth.me();
          setUser(user);
          applyUserLanguage(user);
        } catch {
          // non-fatal — session still works without the profile
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  function applyUserLanguage(u: User | null) {
    if (u?.language) {
      const loc = resolveLocale(u.language);
      if (i18n.language !== loc) i18n.changeLanguage(loc);
      try {
        localStorage.setItem("lang", loc);
      } catch {
        // ignore storage failures (private mode etc.)
      }
    }
  }

  const login = async (
    email: string,
    password: string,
    rememberMe: boolean,
  ) => {
    const r = await api.auth.login(email, password, rememberMe);
    if (r.requiresTwoFactor) {
      // Password OK but no session yet — the caller must collect a code.
      return { requiresTwoFactor: true as const, challenge: r.challenge };
    }
    setAccessToken(r.accessToken);
    setUser(r.user);
    applyUserLanguage(r.user);
    setAuthed(true);
    return undefined;
  };

  const completeTwoFactorLogin = async (
    challenge: string,
    code: string,
    rememberMe: boolean,
  ) => {
    const r = await api.auth.twoFactorLogin(challenge, code, rememberMe);
    setAccessToken(r.accessToken);
    setUser(r.user);
    applyUserLanguage(r.user);
    setAuthed(true);
  };

  const signup = async (email: string, password: string) => {
    const r = await api.auth.signup(email, password);
    setAccessToken(r.accessToken);
    setUser(r.user);
    applyUserLanguage(r.user);
    setAuthed(true);
  };

  const logout = async () => {
    await api.auth.logout().catch(() => {});
    setAccessToken(null);
    setUser(null);
    setAuthed(false);
  };

  return (
    <Ctx.Provider
      value={{
        user,
        authed,
        loading,
        login,
        completeTwoFactorLogin,
        signup,
        logout,
        updateUser: setUser,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useAuth() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAuth must be used within AuthProvider");
  return v;
}
