// lib/forceLogout.ts (top-level navigation + redirect back)
export const forceLogout = async () => {
  const base = process.env.NEXT_PUBLIC_API_URL || "";
  const nextUrl = typeof window !== "undefined" ? window.location.origin : "/";
  // navegação de topo garante envio do cookie (mesmo com SameSite=Lax); aqui temos None
  const url = `${base}/auth/logout?next=${encodeURIComponent(nextUrl)}`;
  // limpa client hints e segue pro back, que redireciona de volta
  try { localStorage.removeItem("username"); } catch {}
  window.location.href = url;
};
