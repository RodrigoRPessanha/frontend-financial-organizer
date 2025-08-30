// lib/forceLogout.ts
import { api } from "./api";

export const forceLogout = async () => {
  const base = process.env.NEXT_PUBLIC_API_URL;
  const url = base ? `${base}/auth/logout` : "/auth/logout";
  try { await api.logout(); } catch {}
  try { await fetch(url, { method: "GET", credentials: "include" }); } catch {}
  try { localStorage.removeItem("username"); } catch {}
  location.reload();
};
