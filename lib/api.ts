// OWASP-friendly API client: cookies HttpOnly e credentials: 'include'
const API_URL = process.env.NEXT_PUBLIC_API_URL;

type Cat = { id: number; name: string; kind: "expense" | "income" };
type Sub = { id: number; category_id: number; name: string };
type Acc = { id: number; name: string; type: string };
type Tx  = {
  id: number; account_id: number; category_id: number; subcategory_id: number|null;
  amount: number; date: string; note?: string;
  payment_method?: "cash" | "pix" | "card" | "vr";
  installments?: number; installment_index?: number;
};

async function http<T>(path: string, init: RequestInit = {}) {
  const base = process.env.NEXT_PUBLIC_API_URL!;
  const headers = new Headers(init.headers || {});
  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  const res = await fetch(base + path, {
    ...init,
    credentials: "include",
    mode: "cors",
    headers: init.body
      ? new Headers({ "Content-Type": "application/json", ...(init.headers || {}) })
      : init.headers,
  });
}

export const api = {

  register: (payload: { username: string; password: string }) =>
    http<{ ok: true }>("/auth/register", { method: "POST", body: JSON.stringify(payload) }),
  login: (payload: { username: string; password: string }) =>
    http<{ ok: true }>("/auth/login", { method: "POST", body: JSON.stringify(payload) }),
  logout: () =>
    http<{ ok: true }>("/auth/logout", { method: "POST" }),
  me: () =>
    http<{ id: number | null; username: string | null }>("/auth/me"),

  changePassword: (payload: { old_password: string; new_password: string }) =>
    http<{ ok: true }>("/auth/change-password", { method: "POST", body: JSON.stringify(payload) }),

  // AUTH…
  changePassword: (payload: { old_password: string; new_password: string }) =>
    http<{ ok: true }>("/auth/change-password", { method: "POST", body: JSON.stringify(payload) }),

  // CATEGORIES
  listCategories: () => http<Cat[]>("/categories"),
  createCategory: (payload: { name: string; kind: "expense" | "income" }) =>
    http<Cat>("/categories", { method: "POST", body: JSON.stringify(payload) }),
  updateCategory: (id: number, payload: { name: string }) =>
    http<Cat>(`/categories/${id}`, { method: "PUT", body: JSON.stringify(payload) }),

  // SUBCATEGORIES
  listSubcategories: (category_id?: number) =>
    http<Sub[]>(`/subcategories${category_id ? `?category_id=${category_id}` : ""}`),
  createSubcategory: (payload: { name: string; category_id: number }) =>
    http<Sub>("/subcategories", { method: "POST", body: JSON.stringify(payload) }),
  updateSubcategory: (id: number, payload: { name: string; category_id?: number }) =>
    http<Sub>(`/subcategories/${id}`, { method: "PUT", body: JSON.stringify(payload) }),

  // ACCOUNTS
  listAccounts: () => http<Acc[]>("/accounts"),
  createAccount: (payload: { name: string; type: string }) =>
    http<Acc>("/accounts", { method: "POST", body: JSON.stringify(payload) }),

  // TRANSACTIONS
  listTransactions: () => http<Tx[]>("/transactions"),
  createTransaction: (payload: {
    account_id: number; category_id: number; subcategory_id?: number|null;
    amount: number; date: string; note?: string;
    payment_method?: "cash" | "pix" | "card" | "vr"; installments?: number;
  }) => http<Tx | Tx[]>("/transactions", { method: "POST", body: JSON.stringify(payload) }),
  deleteTransaction: (id: number) => http<void>(`/transactions/${id}`, { method: "DELETE" }),

  // SUMMARY / EXPORT
  summaryMonth: (month: string) => http<{ month: string; total: number; by_category: any[]; by_subcategory: any[] }>(`/summary/month?month=${month}`),
  exportCsv: (month?: string) => http<Blob>(`/export/csv${month ? `?month=${month}` : ""}`),
};

export type Api = typeof api;