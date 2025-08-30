// app/lib/useSession.ts
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "./api";

type SessionState = {
  loading: boolean;
  loggedIn: boolean;
  username: string | null;
  check: () => Promise<void>;
  logout: () => Promise<void>;
  /** força estado "deslogado" imediatamente (fallback para sair da tela de loading) */
  forceGuest: () => void;
};

/** nunca bloqueia mais do que TIMEOUT_MS para mostrar a UI */
const TIMEOUT_MS = 6000;

export function useSession(): SessionState {
  const [loading, setLoading] = useState(true);
  const [loggedIn, setLoggedIn] = useState(false);
  const [username, setUsername] = useState<string | null>(null);
  const timer = useRef<number | null>(null);

  const endLoading = useCallback(() => {
    setLoading(false);
    if (timer.current) {
      window.clearTimeout(timer.current);
      timer.current = null;
    }
  }, []);

  const forceGuest = useCallback(() => {
    setLoggedIn(false);
    setUsername(null);
    endLoading();
  }, [endLoading]);

  const check = useCallback(async () => {
    if (timer.current) window.clearTimeout(timer.current);
    setLoading(true);

    timer.current = window.setTimeout(() => {
      // se demorar demais, cai para convidado (login)
      forceGuest();
    }, TIMEOUT_MS);

    try {
      const me = await Promise.race([
        api.me(),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("timeout")), TIMEOUT_MS)
        ),
      ]);
      if (me && (me as any).id) {
        setLoggedIn(true);
        setUsername((me as any).username || null);
        try { localStorage.setItem("username", (me as any).username || ""); } catch {}
      } else {
        setLoggedIn(false);
        setUsername(null);
        try { localStorage.removeItem("username"); } catch {}
      }
    } catch {
      setLoggedIn(false);
      setUsername(null);
    } finally {
      endLoading();
    }
  }, [endLoading, forceGuest]);

  const logout = useCallback(async () => {
    try { await api.logout(); } catch {}
    try { localStorage.removeItem("username"); } catch {}
    if (typeof window !== "undefined") {
      window.location.href = "/";
      return;
    }
    await check();
  }, [check]);

  useEffect(() => {
    check();
    const onFocus = () => { check(); };
    window.addEventListener("focus", onFocus);
    return () => {
      window.removeEventListener("focus", onFocus);
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, [check]);

  return { loading, loggedIn, username, check, logout, forceGuest };
}
