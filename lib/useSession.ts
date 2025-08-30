"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "./api";

type SessionState = {
  loading: boolean;
  loggedIn: boolean;
  username: string | null;
  check: () => Promise<void>;
  logout: () => Promise<void>;
};

export function useSession(): SessionState {
  const [loading, setLoading] = useState(true);
  const [loggedIn, setLoggedIn] = useState(false);
  const [username, setUsername] = useState<string | null>(null);

  const check = useCallback(async () => {
    try {
      const me = await api.me(); // lê do cookie HttpOnly
      if (me?.id) {
        setLoggedIn(true);
        setUsername(me.username || null);
        try { localStorage.setItem("username", me.username || ""); } catch {}
      } else {
        setLoggedIn(false);
        setUsername(null);
        try { localStorage.removeItem("username"); } catch {}
      }
    } catch {
      // se der erro de rede, considere não logado
      setLoggedIn(false);
      setUsername(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    try { await api.logout(); } catch {}
    try { localStorage.removeItem("username"); } catch {}
    // se preferir navegação que SEMPRE limpa cookie:
    // api.logoutByRedirect(); return;
    window.location.href = "/"; // volta para a tela inicial/login
  }, []);

  useEffect(() => {
    // 1ª checagem ao montar
    check();

    // revalida ao focar a aba (ex.: mudou a sessão em outra aba)
    const onFocus = () => { check(); };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [check]);

  return { loading, loggedIn, username, check, logout };
}
