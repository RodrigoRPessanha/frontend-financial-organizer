// OWASP-friendly API client: cookies HttpOnly e credentials: 'include'
const API_URL = process.env.NEXT_PUBLIC_API_URL;

async function http<T>(path: string, init: RequestInit = {}) {
  const base = process.env.NEXT_PUBLIC_API_URL!;
  const headers = new Headers(init.headers || {});
  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  const res = await fetch(base + path, {
    ...init,
    headers,
    credentials: "include",
    mode: "cors",
  });
  if (!res.ok) throw new Error((await res.text()) || res.statusText);
  const ct = res.headers.get("content-type") || "";
  return (ct.includes("application/json") ? res.json() : (res as any).blob()) as Promise<T>;
}

export const api = {
  // Auth com username
  register: (payload: { username: string; password: string }) =>
    http<{ ok: true }>("/auth/register", { method: "POST", body: JSON.stringify(payload) }),
  login: (payload: { username: string; password: string }) =>
    http<{ ok: true }>("/auth/login", { method: "POST", body: JSON.stringify(payload) }),
  logout: () => http<{ ok: true }>("/auth/logout", { method: "POST" }),
  me: () => http<{ id: number; username: string | null }>("/auth/me"),

  changePassword: (payload: { old_password: string; new_password: string }) =>
    http<{ ok: true }>("/auth/change-password", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
    
  // Categories/Subcategories
  listCategories: () => http<any[]>("/categories"),
  createCategory: (payload: { name: string; kind: "expense" | "income" }) =>
    http("/categories", { method: "POST", body: JSON.stringify(payload) }),
  updateCategory: (id: number, payload: { name: string }) =>
    http(`/categories/${id}`, { method: "PUT", body: JSON.stringify(payload) }),

  listSubcategories: (category_id?: number) =>
    http<any[]>(category_id ? `/subcategories?category_id=${category_id}` : "/subcategories"),
  createSubcategory: (payload: { category_id: number; name: string }) =>
    http("/subcategories", { method: "POST", body: JSON.stringify(payload) }),
  updateSubcategory: (id: number, payload: { name: string; category_id?: number }) =>
    http(`/subcategories/${id}`, { method: "PUT", body: JSON.stringify(payload) }),

  // Accounts
  listAccounts: () => http<any[]>("/accounts"),
  createAccount: (payload: { name: string; type: string }) =>
    http("/accounts", { method: "POST", body: JSON.stringify(payload) }),

  // Transactions
  listTransactions: () => http<any[]>("/transactions"),
  createTransaction: (payload: {
    account_id: number;
    category_id: number;
    subcategory_id?: number;
    amount: number;
    date: string;
    note?: string;
    payment_method?: "cash" | "pix" | "card" | "vr";
    installments?: number;
  }) => http<any>("/transactions", { method: "POST", body: JSON.stringify(payload) }),
  deleteTransaction: (id: number) => http<{ ok: true }>(`/transactions/${id}`, { method: "DELETE" }),

  // Extras
  summaryMonth: (month: string) =>
    http<{ month: string; total: number; by_category: { category_id: number; total: number }[]; by_subcategory?: { category_id: number; subcategory_id: number; total: number }[] }>(
      `/summary/month?month=${encodeURIComponent(month)}`
    ),
  deleteAccount: () => http<{ ok: true }>("/account", { method: "DELETE" }),
  exportCsv: async (month?: string) => {
    const url = new URL(`${API_URL}/export/csv`);
    if (month) url.searchParams.set("month", month);
    const res = await fetch(url.toString(), { credentials: "include" });
    if (!res.ok) throw new Error(await res.text());
    return await res.blob();
  },
};

export type Api = typeof api;