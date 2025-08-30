"use client";
import { useEffect, useState } from "react";
import { api } from "./api";

export function useSession() {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<{ id: number; username: string | null } | null>(null);

  useEffect(() => {
    api.me().then(u => {
      setUser(u);
      if (u?.username) localStorage.setItem("username", u.username);
    }).catch(() => setUser(null)).finally(() => setLoading(false));
  }, []);

  return { loading, user, loggedIn: !!user };
}