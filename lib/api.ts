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
  register: (payload: {email: string; password: string}) =>
    http<{token:string}>("/auth/register", { method: "POST", body: JSON.stringify(payload)}),
  login: (payload: {email: string; password: string}) =>
    http<{token:string}>("/auth/login", { method: "POST", body: JSON.stringify(payload)}),

  listCategories: () => http<any[]>("/categories"),
  createCategory: (payload: {name: string; kind: "expense" | "income"}) =>
    http("/categories", { method: "POST", body: JSON.stringify(payload)}),

  listSubcategories: (category_id?: number) =>
    http<any[]>(category_id ? `/subcategories?category_id=${category_id}` : "/subcategories"),
  createSubcategory: (payload: {category_id: number; name: string}) =>
    http("/subcategories", { method: "POST", body: JSON.stringify(payload)}),

  listAccounts: () => http<any[]>("/accounts"),
  createAccount: (payload: {name: string; type: string}) =>
    http("/accounts", { method: "POST", body: JSON.stringify(payload)}),

  listTransactions: () => http<any[]>("/transactions"),
  createTransaction: (payload: {account_id: number; category_id: number; subcategory_id?: number; amount: number; date: string; note?: string; payment_method?: "cash"|"pix"|"card"; installments?: number}) =>
    http<any>("/transactions", { method: "POST", body: JSON.stringify(payload)}),
  deleteTransaction: async (id: number) => {
    const res = await fetch(`${API_URL}/transactions/${id}`, { method: "DELETE", headers: { ...authHeaders() }});
    if (!res.ok) throw new Error(await res.text());
    return true;
  },
};