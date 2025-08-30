const API_URL = process.env.NEXT_PUBLIC_API_URL;

function authHeaders() {
  if (typeof window === "undefined") return {};
  const token = localStorage.getItem("token");
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
    const msg = await res.text();
    throw new Error(msg || `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  register: (payload: {email: string; password: string}) => http<{token:string}>("/auth/register", { method: "POST", body: JSON.stringify(payload)}),
  login: (payload: {email: string; password: string}) => http<{token:string}>("/auth/login", { method: "POST", body: JSON.stringify(payload)}),

  listCategories: () => http<any[]>("/categories"),
  createCategory: (payload: {name: string; kind: "expense" | "income"}) => http("/categories", { method: "POST", body: JSON.stringify(payload)}),

  listAccounts: () => http<any[]>("/accounts"),
  createAccount: (payload: {name: string; type: string}) => http("/accounts", { method: "POST", body: JSON.stringify(payload)}),

  listTransactions: () => http<any[]>("/transactions"),
  createTransaction: (payload: {account_id: number; category_id: number; amount: number; date: string; note?: string}) =>
    http("/transactions", { method: "POST", body: JSON.stringify(payload)}),
  deleteTransaction: (id: number) => fetch(`${API_URL}/transactions/${id}`, { method: "DELETE", headers: {...authHeaders()} }),

  summaryMonth: (month: string) => http<{month: string; total: number; by_category: {category_id: number; total: number}[]}>(`/summary/month?month=${encodeURIComponent(month)}`),
};