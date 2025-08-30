// app/lib/api.ts

type CatKind = "expense" | "income";
type PayMethod = "cash" | "pix" | "card" | "vr";

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

async function http<T>(path: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers || {});
  // só seta JSON quando há body para evitar preflight desnecessário
  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers,
    credentials: "include",
    mode: "cors",
  });

  const ct = res.headers.get("content-type") || "";
  if (!res.ok) {
    try {
      if (ct.includes("application/json")) {
        const j = await res.json();
        throw new Error(j.detail || j.message || res.statusText);
      }
      const t = await res.text();
      throw new Error(t || res.statusText);
    } catch (e: any) {
      throw new Error(e?.message || res.statusText);
    }
  }

  if (ct.includes("application/json")) return (res.json() as unknown) as T;
  // ex.: export CSV
  return (res.blob() as unknown) as T;
}

export const api = {
  // ---------- AUTH ----------
  register: (payload: { username: string; password: string }) =>
    http<{ ok: true }>("/auth/register", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  login: (payload: { username: string; password: string }) =>
    http<{ ok: true }>("/auth/login", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  logout: () =>
    // sem body para evitar preflight
    http<{ ok: true }>("/auth/logout", { method: "POST" }),

  me: () =>
    http<{ id: number | null; username: string | null }>("/auth/me"),

  changePassword: (payload: { old_password: string; new_password: string }) =>
    http<{ ok: true }>("/auth/change-password", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  // Fallback por navegação (se quiser usar em algum botão/link)
  logoutByRedirect: (nextUrl?: string) => {
    const next =
      nextUrl ||
      (typeof window !== "undefined" ? window.location.origin : "/");
    window.location.href = `${BASE}/auth/logout?next=${encodeURIComponent(
      next
    )}`;
  },

  // ---------- CATEGORIES ----------
  listCategories: () => http<Cat[]>("/categories"),

  createCategory: (payload: { name: string; kind: CatKind }) =>
    http<Cat>("/categories", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  updateCategory: (id: number, payload: { name: string }) =>
    http<Cat>(`/categories/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    }),

  // ---------- SUBCATEGORIES ----------
  listSubcategories: (category_id?: number) =>
    http<Sub[]>(
      `/subcategories${category_id ? `?category_id=${category_id}` : ""}`
    ),

  createSubcategory: (payload: { name: string; category_id: number }) =>
    http<Sub>("/subcategories", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  updateSubcategory: (id: number, payload: { name: string; category_id?: number }) =>
    http<Sub>(`/subcategories/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    }),

  deleteSubcategory: (id: number) =>
    http<void>(`/subcategories/${id}`, { method: "DELETE" }),

  // ---------- ACCOUNTS ----------
  listAccounts: () => http<Acc[]>("/accounts"),

  createAccount: (payload: { name: string; type: string }) =>
    http<Acc>("/accounts", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  // ---------- TRANSACTIONS ----------
  listTransactions: () => http<Tx[]>("/transactions"),

  createTransaction: (payload: {
    account_id: number;
    category_id: number;
    subcategory_id?: number | null;
    amount: number;
    date: string;
    note?: string;
    payment_method?: PayMethod;
    installments?: number; // se card, até 12
  }) => http<Tx | Tx[]>("/transactions", {
    method: "POST",
    body: JSON.stringify(payload),
  }),

  deleteTransaction: (id: number) =>
    http<void>(`/transactions/${id}`, { method: "DELETE" }),

  // ---------- SUMMARY / EXPORT / ACCOUNT ----------
  summaryMonth: (month: string) =>
    http<{
      month: string;
      total: number;
      by_category: { category_id: number; total: number }[];
      by_subcategory: {
        category_id: number;
        subcategory_id: number;
        total: number;
      }[];
    }>(`/summary/month?month=${encodeURIComponent(month)}`),

  exportCsv: (month?: string) =>
    http<Blob>(`/export/csv${month ? `?month=${encodeURIComponent(month)}` : ""}`),

  deleteAccount: () => http<void>("/account", { method: "DELETE" }),
};
