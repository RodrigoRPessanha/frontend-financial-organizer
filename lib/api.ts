// app/lib/api.ts (Bearer token in localStorage; no cookies required)
export type CatKind = "expense" | "income";
export type PayMethod = "cash" | "pix" | "card" | "vr";

export type Cat = { id: number; name: string; kind: CatKind };
export type Sub = { id: number; category_id: number; name: string };
export type Acc = { id: number; name: string; type: string };
export type Tx = {
  id: number;
  account_id: number;
  category_id: number;
  subcategory_id: number | null;
  amount: number;
  date: string;
  note?: string;
  payment_method?: PayMethod;
  installments?: number;
  installment_index?: number;
};

const BASE = (process.env.NEXT_PUBLIC_API_URL || "").replace(/\/+$/, "");

function getToken() {
  try { return localStorage.getItem("token") || ""; } catch { return ""; }
}

async function http<T>(path: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers || {});
  const tok = getToken();
  if (tok && !headers.has("Authorization")) headers.set("Authorization", `Bearer ${tok}`);
  if (init.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");

  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers,
    mode: "cors",
    credentials: "omit", // não dependemos mais de cookies
  });

  const ct = res.headers.get("content-type") || "";
  if (!res.ok) {
    if (ct.includes("application/json")) {
      const j = await res.json().catch(() => null);
      throw new Error((j && (j.detail || j.message)) || res.statusText);
    }
    const t = await res.text().catch(() => "");
    throw new Error(t || res.statusText);
  }
  return (ct.includes("application/json") ? res.json() : (res as any).blob()) as Promise<T>;
}

export const api = {
  // AUTH
  register: async (payload: { username: string; password: string }) => {
    const r = await http<{ ok: true; token: string }>("/auth/register", { method: "POST", body: JSON.stringify(payload) });
    try { localStorage.setItem("token", r.token); localStorage.setItem("username", payload.username); } catch {}
    return r;
  },
  login: async (payload: { username: string; password: string }) => {
    const r = await http<{ ok: true; token: string }>("/auth/login", { method: "POST", body: JSON.stringify(payload) });
    try { localStorage.setItem("token", r.token); localStorage.setItem("username", payload.username); } catch {}
    return r;
  },
  logout: async () => {
    try { localStorage.removeItem("token"); localStorage.removeItem("username"); } catch {}
    // opcionalmente avisa o backend
    try { await http<{ ok: true }>("/auth/logout", { method: "POST" }); } catch {}
    return { ok: true };
  },
  me: () => http<{ id: number | null; username: string | null }>("/auth/me"),

  changePassword: (payload: { old_password: string; new_password: string }) =>
    http<{ ok: true }>("/auth/change-password", { method: "POST", body: JSON.stringify(payload) }),

  // DATA
  listCategories: () => http<Cat[]>("/categories"),
  createCategory: (payload: { name: string; kind: CatKind }) =>
    http<Cat>("/categories", { method: "POST", body: JSON.stringify(payload) }),
  updateCategory: (id: number, payload: { name: string }) =>
    http<Cat>(`/categories/${id}`, { method: "PUT", body: JSON.stringify(payload) }),

  listSubcategories: (category_id?: number) =>
    http<Sub[]>(`/subcategories${category_id ? `?category_id=${category_id}` : ""}`),
  createSubcategory: (payload: { name: string; category_id: number }) =>
    http<Sub>("/subcategories", { method: "POST", body: JSON.stringify(payload) }),
  updateSubcategory: (id: number, payload: { name: string; category_id?: number }) =>
    http<Sub>(`/subcategories/${id}`, { method: "PUT", body: JSON.stringify(payload) }),
  deleteSubcategory: (id: number) => http<void>(`/subcategories/${id}`, { method: "DELETE" }),

  listAccounts: () => http<Acc[]>("/accounts"),
  createAccount: (payload: { name: string; type: string }) =>
    http<Acc>("/accounts", { method: "POST", body: JSON.stringify(payload) }),

  listTransactions: () => http<Tx[]>("/transactions"),
  createTransaction: (payload: {
    account_id: number; category_id: number; subcategory_id?: number | null;
    amount: number; date: string; note?: string; payment_method?: "cash"|"pix"|"card"|"vr"; installments?: number;
  }) => http<Tx | Tx[]>("/transactions", { method: "POST", body: JSON.stringify(payload) }),
  deleteTransaction: (id: number) => http<void>(`/transactions/${id}`, { method: "DELETE" }),

  summaryMonth: (month: string) => http<{
    month: string;
    total: number;
    by_category: { category_id: number; total: number }[];
    by_subcategory: { category_id: number; subcategory_id: number; total: number }[];
  }>(`/summary/month?month=${encodeURIComponent(month)}`),

  exportCsv: (month?: string) => http<Blob>(`/export/csv${month ? `?month=${encodeURIComponent(month)}` : ""}`),

  deleteAccount: () => http<void>("/account", { method: "DELETE" }),
};
