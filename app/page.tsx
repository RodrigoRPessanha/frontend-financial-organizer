"use client";

import { useEffect, useMemo, useState } from "react";
import { api } from "../lib/api";
import { Bar } from "react-chartjs-2";
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from "chart.js";
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

type Cat = { id: number; name: string; kind: "expense" | "income" };
type Acc = { id: number; name: string; type: string };
type Tx = { id: number; account_id: number; category_id: number; amount: number; date: string; note?: string };

function formatBRL(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function useAuth() {
  const [token, setToken] = useState<string | null>(null);
  useEffect(() => { setToken(localStorage.getItem("token")); }, []);
  function logout(){ localStorage.removeItem("token"); location.reload(); }
  return { token, logout, setToken };
}

export default function Page() {
  const { token, logout, setToken } = useAuth();
  const [hasUser, setHasUser] = useState<boolean | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [cats, setCats] = useState<Cat[]>([]);
  const [accs, setAccs] = useState<Acc[]>([]);
  const [txs, setTxs] = useState<Tx[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<string | null>(null);

  const [month, setMonth] = useState<string>(new Date().toISOString().slice(0,7));
  const [summary, setSummary] = useState<{ total: number; by_category: {category_id: number; total: number}[] } | null>(null);

  const [catName, setCatName] = useState("");
  const [tx, setTx] = useState({category_id: "", amount: "", date: new Date().toISOString().slice(0,10), note: ""});
  const [filter, setFilter] = useState<"all"|"in"|"out">("all");

  const catById = useMemo(() => Object.fromEntries(cats.map(c => [c.id, c])), [cats]);
  const accById = useMemo(() => Object.fromEntries(accs.map(a => [a.id, a])), [accs]);

  function showToast(msg: string) {
    setToast(msg); setTimeout(() => setToast(null), 1800);
  }

  // Verifica se há usuário
  useEffect(() => {
    (async () => {
      try { await api.listCategories(); setHasUser(true); }
      catch { setHasUser(false); }
    })();
  }, [token]);

  async function handleRegisterOrLogin(mode: "register" | "login") {
    try {
      const r = await (mode === "register" ? api.register({ email, password }) : api.login({ email, password }));
      localStorage.setItem("token", r.token);
      setToken(r.token); showToast(mode === "register" ? "Conta criada!" : "Login feito!");
      setTimeout(() => location.reload(), 300);
    } catch (e:any) { alert(e.message || "erro"); }
  }

  // Carrega dados + garante conta padrão
  useEffect(() => {
    if (!token) return;
    setLoading(true);
    (async () => {
      const [c, a, t] = await Promise.all([api.listCategories(), api.listAccounts(), api.listTransactions()]);
      let accounts = a as any[];
      if (accounts.length === 0) {
        // cria uma conta padrão "Pessoal" nos bastidores
        const created = await api.createAccount({ name: "Pessoal", type: "other" }) as any;
        accounts = [created];
      }
      setAccs(accounts as any);
      setCats(c as any);
      setTxs(t as any);
      setTx(s => ({...s, category_id: (c as any[])[0]?.id || ""}));
    })().finally(() => setLoading(false));
  }, [token]);

  useEffect(() => {
    if (!token) return;
    api.summaryMonth(month).then(s => setSummary({ total: s.total, by_category: s.by_category })).catch(()=>setSummary(null));
  }, [month, token, txs.length]);

  async function addCategory() {
    if(!catName.trim()) return;
    const created = await api.createCategory({ name: catName.trim(), kind: "expense" });
    setCats(prev => [...prev, created as any]);
    setCatName(""); showToast("Categoria adicionada");
  }

  async function addTx() {
    const payload = {
      account_id: accs[0]?.id, // usa conta padrão
      category_id: Number(tx.category_id),
      amount: -Math.abs(parseFloat(String(tx.amount).replace(",", "."))), // custo diário = negativo
      date: tx.date,
      note: tx.note || undefined
    };
    if(!payload.account_id || !payload.category_id || isNaN(payload.amount)) return;
    const created = await api.createTransaction(payload as any);
    setTxs(prev => [created as any, ...prev]);
    setTx(s => ({...s, amount: ""}));
    showToast("Custo lançado");
  }

  async function removeTx(id: number) {
    await api.deleteTransaction(id);
    setTxs(prev => prev.filter(x => x.id !== id));
    showToast("Transação removida");
  }

  const filteredTxs = txs.filter(t => {
    if (filter === "all") return true;
    const isIncome = (catById[t.category_id]?.kind === "income");
    return filter === "in" ? isIncome : !isIncome;
  });

  if (!token) {
    return (
      <div className="max-w-md mx-auto mt-6">
        <div className="card p-6">
          <h2 className="text-xl font-semibold mb-1">{hasUser ? "Entrar" : "Criar sua conta"}</h2>
          <p className="text-sm text-muted mb-4">{hasUser ? "Use seu e-mail e senha" : "Primeiro usuário do sistema"}</p>
          <label className="label">E-mail</label>
          <input className="input mb-3" placeholder="voce@email.com" value={email} onChange={e=>setEmail(e.target.value)} />
          <label className="label">Senha</label>
          <input type="password" className="input mb-4" placeholder="Sua senha" value={password} onChange={e=>setPassword(e.target.value)} />
          <div className="flex gap-2">
            {!hasUser && <button onClick={()=>handleRegisterOrLogin("register")} className="btn btn-primary w-full">Criar conta</button>}
            <button onClick={()=>handleRegisterOrLogin("login")} className="btn btn-outline w-full">Entrar</button>
          </div>
        </div>
      </div>
    );
  }

  const labels = (summary?.by_category || []).map(row => catById[row.category_id]?.name || String(row.category_id));
  const values = (summary?.by_category || []).map(row => Math.abs(row.total || 0));
  const barColors = labels.map((_, i) => i % 3 === 0 ? "rgba(99,102,241,.8)" : i % 3 === 1 ? "rgba(16,185,129,.8)" : "rgba(239,68,68,.8)");
  const data = { labels, datasets: [{ label: "Despesas por categoria", data: values, backgroundColor: barColors }] };

  return (
    <div className="grid gap-6">
      {toast && <div className="toast">{toast}</div>}

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
        <div className="flex items-center gap-2">
          <input type="month" className="input w-auto" value={month} onChange={e=>setMonth(e.target.value)} />
          <span className="text-sm text-muted">Total:</span>
          <span className="text-sm font-semibold text-expense">{summary ? formatBRL(summary.total) : "--"}</span>
        </div>
        <div className="sm:ml-auto flex items-center gap-2">
          <div className="inline-flex rounded-xl border border-[rgb(var(--border))] overflow-hidden">
            <button className={"px-3 py-1.5 text-sm transition " + (filter==="all" ? "bg-[rgb(var(--primary))] text-white" : "bg-[rgb(var(--card))] hover:bg-[rgb(var(--fg))]/5")} onClick={()=>setFilter("all")}>Tudo</button>
            <button className={"px-3 py-1.5 text-sm transition " + (filter==="out" ? "bg-[rgb(var(--primary))] text-white" : "bg-[rgb(var(--card))] hover:bg-[rgb(var(--fg))]/5")} onClick={()=>setFilter("out")}>Despesas</button>
            <button className={"px-3 py-1.5 text-sm transition " + (filter==="in" ? "bg-[rgb(var(--primary))] text-white" : "bg-[rgb(var(--card))] hover:bg-[rgb(var(--fg))]/5")} onClick={()=>setFilter("in")}>Receitas</button>
          </div>
          <button onClick={logout} className="btn btn-outline">Sair</button>
        </div>
      </div>

      {/* KPIs */}
      <section className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="kpi"><div className="hint">Categorias</div><div className="value">{cats.length}</div></div>
        <div className="kpi"><div className="hint">Transações</div><div className="value">{txs.length}</div></div>
        <div className="kpi"><div className="hint">Mês</div><div className="value">{month}</div></div>
        <div className="kpi"><div className="hint">Gasto total</div><div className="value text-expense">{summary ? formatBRL(summary.total) : "--"}</div></div>
      </section>

      {/* Gráfico */}
      <section className="card">
        <div className="card-header">
          <h3 className="card-title">Despesas por categoria</h3>
          <span className="text-xs text-muted">{summary ? formatBRL(summary.total) : "--"}</span>
        </div>
        <div className="card-content">
          <div className="w-full md:max-w-3xl md:h-72">
            <Bar data={data} />
          </div>
        </div>
      </section>

      {/* Cadastro rápido */}
      <section className="grid md:grid-cols-3 gap-6">
        <div className="card">
          <div className="card-header"><h3 className="card-title">Categorias (despesa)</h3></div>
          <div className="card-content">
            <div className="flex gap-2">
              <input className="input flex-1" placeholder="Ex.: Mercado" value={catName} onChange={e=>setCatName(e.target.value)} />
            </div>
            <button onClick={addCategory} className="btn btn-primary w-full mt-3">Adicionar</button>
            <ul className="mt-3 text-sm space-y-1 max-h-40 overflow-auto pr-1">
              {cats.map(c => <li key={c.id} className="flex justify-between"><span>{c.name}</span><span className="text-muted">(despesa)</span></li>)}
            </ul>
          </div>
        </div>

        <div className="card md:col-span-2">
          <div className="card-header"><h3 className="card-title">Lançar custo diário</h3></div>
          <div className="card-content grid sm:grid-cols-2 gap-2">
            <select className="select" value={tx.category_id} onChange={e=>setTx(s=>({...s, category_id: e.target.value}))}>
              <option value="">Categoria…</option>
              {cats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <input className="input" placeholder="Valor (ex.: 35,90)" value={tx.amount} onChange={e=>setTx(s=>({...s, amount: e.target.value}))}/>
            <input type="date" className="input" value={tx.date} onChange={e=>setTx(s=>({...s, date: e.target.value}))}/>
            <input className="input" placeholder="Observação" value={tx.note} onChange={e=>setTx(s=>({...s, note: e.target.value}))}/>
            <button onClick={addTx} className="btn btn-primary w-full sm:col-span-2">Adicionar</button>
          </div>
        </div>
      </section>

      {/* Tabela de transações */}
      <section className="card">
        <div className="card-header"><h3 className="card-title">Histórico</h3></div>
        <div className="card-content overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left">
                <th className="py-2">Data</th>
                <th>Categoria</th>
                <th className="text-right">Valor</th>
                <th>Obs.</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {loading && (<tr><td colSpan={5} className="py-6 text-center text-muted">Carregando…</td></tr>)}
              {!loading && filteredTxs.map(t => (
                <tr key={t.id}>
                  <td className="py-2">{t.date}</td>
                  <td>{catById[t.category_id]?.name || t.category_id}</td>
                  <td className="text-right text-expense">{formatBRL(Math.abs(t.amount))}</td>
                  <td className="truncate max-w-xs">{t.note}</td>
                  <td className="text-right">
                    <button onClick={()=>removeTx(t.id)} className="text-[rgb(var(--danger))] hover:underline">Excluir</button>
                  </td>
                </tr>
              ))}
              {!loading && filteredTxs.length === 0 && (
                <tr><td colSpan={5} className="py-6 text-center text-muted">Sem lançamentos ainda.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}