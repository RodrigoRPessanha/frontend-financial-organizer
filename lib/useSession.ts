// app/lib/useSession.ts (token-aware, never hangs)
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "./api";

type SessionState = {
  loading: boolean;
  loggedIn: boolean;
  username: string | null;
  check: () => Promise<void>;
  logout: () => Promise<void>;
  forceGuest: () => void;
};

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

    // se não houver token, não chama o backend — cai direto para login
    try {
      const tok = localStorage.getItem("token");
      if (!tok) {
        forceGuest();
        return;
      }
    } catch {
      // sem acesso ao localStorage → tenta mesmo assim
    }

    timer.current = window.setTimeout(() => forceGuest(), TIMEOUT_MS);

    try {
      const me = await Promise.race([
        api.me(),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error("timeout")), TIMEOUT_MS)),
      ]);
      if (me && (me as any).id) {
        setLoggedIn(true);
        setUsername((me as any).username || null);
        try { localStorage.setItem("username", (me as any).username || ""); } catch {}
      } else {
        forceGuest();
      }
    } catch {
      forceGuest();
    } finally {
      endLoading();
    }
  }, [endLoading, forceGuest]);

  const logout = useCallback(async () => {
    try { await api.logout(); } catch {}
    // volta para home para resetar UI
    window.location.href = "/";
  }, []);

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
