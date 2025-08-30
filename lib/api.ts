const API_URL = process.env.NEXT_PUBLIC_API_URL;

function authHeaders() {
  if (typeof window === "undefined") return {};
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  return token ? { "Authorization": `Bearer ${token}` } : {};
}

async function http<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options?.headers || {}),
      ...authHeaders(),
    },
    cache: "no-store"
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(txt || `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  // Auth
  register: (payload: {email: string; password: string}) =>
    http<{token:string}>("/auth/register", { method: "POST", body: JSON.stringify(payload)}),
  login: (payload: {email: string; password: string}) =>
    http<{token:string}>("/auth/login", { method: "POST", body: JSON.stringify(payload)}),
  changePassword: (payload: {old_password: string; new_password: string}) =>
    http<{ok:true}>("/auth/change-password", { method: "POST", body: JSON.stringify(payload)}),

  // Categories
  listCategories: () => http<any[]>("/categories"),
  createCategory: (payload: {name: string; kind: "expense" | "income"}) =>
    http("/categories", { method: "POST", body: JSON.stringify(payload)}),

  // Subcategories
  listSubcategories: (category_id?: number) =>
    http<any[]>(category_id ? `/subcategories?category_id=${category_id}` : "/subcategories"),
  createSubcategory: (payload: {category_id: number; name: string}) =>
    http("/subcategories", { method: "POST", body: JSON.stringify(payload)}),

  // Accounts
  listAccounts: () => http<any[]>("/accounts"),
  createAccount: (payload: {name: string; type: string}) =>
    http("/accounts", { method: "POST", body: JSON.stringify(payload)}),

  // Transactions
  listTransactions: () => http<any[]>("/transactions"),
  createTransaction: (payload: {account_id: number; category_id: number; subcategory_id?: number; amount: number; date: string; note?: string; payment_method?: "cash"|"pix"|"card"; installments?: number}) =>
    http<any>("/transactions", { method: "POST", body: JSON.stringify(payload)}),
  deleteTransaction: async (id: number) => {
    const res = await fetch(`${API_URL}/transactions/${id}`, { method: "DELETE", headers: { ...authHeaders() }});
    if (!res.ok) throw new Error(await res.text());
    return true;
  },

  // Summary (optional, para quem usa a página antiga que exibia gráficos pelo endpoint)
  summaryMonth: (month: string) =>
    http<{month: string; total: number; by_category: {category_id: number; total: number}[]; by_subcategory?: {category_id:number; subcategory_id:number; total:number}[] }>(`/summary/month?month=${encodeURIComponent(month)}`),

  // Account tools
  deleteAccount: async () => {
    const res = await fetch(`${API_URL}/account`, { method: "DELETE", headers: { ...authHeaders() }});
    if (!res.ok) throw new Error(await res.text());
    return true;
  },
  exportCsv: async (month?: string) => {
    const url = new URL(`${API_URL}/export/csv`);
    if (month) url.searchParams.set("month", month);
    const res = await fetch(url.toString(), { headers: { ...authHeaders() }});
    if (!res.ok) throw new Error(await res.text());
    return await res.blob();
  }
};

export type Api = typeof api;