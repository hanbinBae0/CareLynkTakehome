import { createContext, PropsWithChildren, useContext, useMemo, useState } from "react";

import { User } from "../types/api";

const STORAGE_KEY = "carelynk-session";

interface SessionState {
  token: string | null;
  user: User | null;
}

interface AuthContextValue extends SessionState {
  setSession: (token: string, user: User) => void;
  updateUser: (user: User) => void;
  clearSession: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function loadInitialState(): SessionState {
  const raw = window.localStorage.getItem(STORAGE_KEY);

  if (!raw) {
    return { token: null, user: null };
  }

  try {
    return JSON.parse(raw) as SessionState;
  } catch {
    return { token: null, user: null };
  }
}

export function AuthProvider({ children }: PropsWithChildren) {
  const [state, setState] = useState<SessionState>(() => loadInitialState());

  const value = useMemo<AuthContextValue>(
    () => ({
      token: state.token,
      user: state.user,
      setSession(token, user) {
        const nextState = { token, user };
        setState(nextState);
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextState));
      },
      updateUser(user) {
        const nextState = { token: state.token, user };
        setState(nextState);
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextState));
      },
      clearSession() {
        setState({ token: null, user: null });
        window.localStorage.removeItem(STORAGE_KEY);
      },
    }),
    [state.token, state.user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return context;
}

