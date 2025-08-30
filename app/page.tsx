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

  const [month, setMonth] = useState<string>(new Date().toISOString().slice(0,7));
  const [summary, setSummary] = useState<{ total: number; by_category: {category_id: number; total: number}[] } | null>(null);

  const [catName, setCatName] = useState("");
  const [catKind, setCatKind] = useState<"expense"|"income">("expense");

  const [accName, setAccName] = useState("");
  const [accType, setAccType] = useState("checking");

  const [tx, setTx] = useState({account_id: "", category_id: "", amount: "", date: new Date().toISOString().slice(0,10), note: ""});
  const [filter, setFilter] = useState<"all"|"in"|"out">("all");

  const catById = useMemo(() => Object.fromEntries(cats.map(c => [c.id, c])), [cats]);
  const accById = useMemo(() => Object.fromEntries(accs.map(a => [a.id, a])), [accs]);

  // Detecta se há usuário e token válido
  useEffect(() => {
    (async () => {
      try {
        await api.listCategories();
        setHasUser(true);
      } catch {
        setHasUser(false);
      }
    })();
  }, [token]);

  async function handleRegisterOrLogin(mode: "register" | "login") {
    try {
      const r = await (mode === "register" ? api.register({ email, password }) : api.login({ email, password }));
      localStorage.setItem("token", r.token);
      setToken(r.token);
      location.reload();
    } catch (e:any) { alert(e.message || "erro"); }
  }

  // carrega dados
  useEffect(() => {
    if (!token) return;
    setLoading(true);
    (async () => {
      const [c, a, t] = await Promise.all([api.listCategories(), api.listAccounts(), api.listTransactions()]);
      setCats(c as any);
      setAccs(a as any);
      setTxs(t as any);
      setTx(s => ({...s, account_id: (a as any[])[0]?.id || "", category_id: (c as any[])[0]?.id || ""}));
    })().finally(() => setLoading(false));
  }, [token]);

  useEffect(() => {
    if (!token) return;
    api.summaryMonth(month).then(s => setSummary({ total: s.total, by_category: s.by_category })).catch(()=>setSummary(null));
  }, [month, token, txs.length]);

  async function addCategory() {
    if(!catName.trim()) return;
    const created = await api.createCategory({ name: catName.trim(), kind: catKind });
    setCats(prev => [...prev, created as any]);
    setCatName("");
  }

  async function addAccount() {
    if(!accName.trim()) return;
    const created = await api.createAccount({ name: accName.trim(), type: accType });
    setAccs(prev => [...prev, created as any]);
    setAccName("");
  }

  async function addTx() {
    const payload = {
      account_id: Number(tx.account_id),
      category_id: Number(tx.category_id),
      amount: parseFloat(String(tx.amount).replace(",", ".")),
      date: tx.date,
      note: tx.note || undefined
    };
    if(!payload.account_id || !payload.category_id || isNaN(payload.amount)) return;
    const created = await api.createTransaction(payload as any);
    setTxs(prev => [created as any, ...prev]);
    setTx(s => ({...s, amount: ""}));
  }

  async function removeTx(id: number) {
    await api.deleteTransaction(id);
    setTxs(prev => prev.filter(x => x.id !== id));
  }

  // Filtragem simples (apenas exibição)
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
          <p className="text-sm text-gray-600 mb-4">{hasUser ? "Use seu e-mail e senha" : "Primeiro usuário do sistema"}</p>
          <label className="label">E-mail</label>
          <input className="input mb-3" placeholder="voce@email.com" value={email} onChange={e=>setEmail(e.target.value)} />
          <label className="label">Senha</label>
          <input type="password" className="input mb-4" placeholder="Sua senha" value={password} onChange={e=>setPassword(e.target.value)} />
          <div className="flex gap-2">
            {!hasUser && <button onClick={()=>handleRegisterOrLogin("register")} className="btn btn-primary">Criar conta</button>}
            <button onClick={()=>handleRegisterOrLogin("login")} className="btn btn-outline">Entrar</button>
          </div>
        </div>
      </div>
    );
  }

  // Chart data
  const labels = (summary?.by_category || []).map(row => catById[row.category_id]?.name || String(row.category_id));
  const values = (summary?.by_category || []).map(row => row.total || 0);
  const data = { labels, datasets: [{ label: "Total por categoria", data: values }] };

  return (
    <div className="grid gap-6">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
        <div className="flex items-center gap-2">
          <input type="month" className="input w-auto" value={month} onChange={e=>setMonth(e.target.value)} />
          <span className="text-sm text-gray-600">Total:</span>
          <span className="text-sm font-semibold">{summary ? formatBRL(summary.total) : "--"}</span>
        </div>
        <div className="sm:ml-auto flex items-center gap-2">
          <div className="inline-flex rounded-xl border overflow-hidden">
            <button className={"px-3 py-1.5 text-sm " + (filter==="all" ? "bg-black text-white" : "bg-white")} onClick={()=>setFilter("all")}>Tudo</button>
            <button className={"px-3 py-1.5 text-sm " + (filter==="in" ? "bg-black text-white" : "bg-white")} onClick={()=>setFilter("in")}>Receitas</button>
            <button className={"px-3 py-1.5 text-sm " + (filter==="out" ? "bg-black text-white" : "bg-white")} onClick={()=>setFilter("out")}>Despesas</button>
          </div>
          <button onClick={logout} className="btn btn-outline">Sair</button>
        </div>
      </div>

      {/* KPIs */}
      <section className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="kpi">
          <div className="hint">Categorias</div>
          <div className="value">{cats.length}</div>
        </div>
        <div className="kpi">
          <div className="hint">Contas</div>
          <div className="value">{accs.length}</div>
        </div>
        <div className="kpi">
          <div className="hint">Transações</div>
          <div className="value">{txs.length}</div>
        </div>
        <div className="kpi">
          <div className="hint">Mês</div>
          <div className="value">{month}</div>
        </div>
      </section>

      {/* Gráfico */}
      <section className="card">
        <div className="card-header">
          <h3 className="card-title">Resumo por categoria</h3>
          <span className="text-xs text-gray-500">{summary ? formatBRL(summary.total) : "--"}</span>
        </div>
        <div className="card-content">
          <div className="w-full md:max-w-3xl">
            <Bar data={data} />
          </div>
        </div>
      </section>

      {/* Cadastro rápido */}
      <section className="grid md:grid-cols-3 gap-6">
        <div className="card">
          <div className="card-header"><h3 className="card-title">Categorias</h3></div>
          <div className="card-content">
            <div className="flex gap-2">
              <input className="input flex-1" placeholder="Nome" value={catName} onChange={e=>setCatName(e.target.value)} />
              <select className="select" value={catKind} onChange={e=>setCatKind(e.target.value as any)}>
                <option value="expense">Despesa</option>
                <option value="income">Receita</option>
              </select>
            </div>
            <button onClick={addCategory} className="btn btn-primary w-full mt-3">Adicionar</button>
            <ul className="mt-3 text-sm text-gray-700 space-y-1 max-h-40 overflow-auto pr-1">
              {cats.map(c => <li key={c.id} className="flex justify-between"><span>{c.name}</span><span className="text-gray-400">({c.kind})</span></li>)}
            </ul>
          </div>
        </div>

        <div className="card">
          <div className="card-header"><h3 className="card-title">Contas</h3></div>
          <div className="card-content">
            <div className="flex gap-2">
              <input className="input flex-1" placeholder="Nome" value={accName} onChange={e=>setAccName(e.target.value)} />
              <select className="select" value={accType} onChange={e=>setAccType(e.target.value)}>
                <option value="checking">Conta corrente</option>
                <option value="savings">Poupança</option>
                <option value="credit">Cartão de crédito</option>
                <option value="cash">Dinheiro</option>
                <option value="other">Outra</option>
              </select>
            </div>
            <button onClick={addAccount} className="btn btn-primary w-full mt-3">Adicionar</button>
            <ul className="mt-3 text-sm text-gray-700 space-y-1 max-h-40 overflow-auto pr-1">
              {accs.map(a => <li key={a.id} className="flex justify-between"><span>{a.name}</span><span className="text-gray-400">({a.type})</span></li>)}
            </ul>
          </div>
        </div>

        <div className="card">
          <div className="card-header"><h3 className="card-title">Lançar transação</h3></div>
          <div className="card-content space-y-2">
            <select className="select" value={tx.account_id} onChange={e=>setTx(s=>({...s, account_id: e.target.value}))}>
              <option value="">Conta…</option>
              {accs.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
            <select className="select" value={tx.category_id} onChange={e=>setTx(s=>({...s, category_id: e.target.value}))}>
              <option value="">Categoria…</option>
              {cats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <input className="input" placeholder="Valor" value={tx.amount} onChange={e=>setTx(s=>({...s, amount: e.target.value}))}/>
            <input type="date" className="input" value={tx.date} onChange={e=>setTx(s=>({...s, date: e.target.value}))}/>
            <input className="input" placeholder="Observação" value={tx.note} onChange={e=>setTx(s=>({...s, note: e.target.value}))}/>
            <button onClick={addTx} className="btn btn-primary w-full">Adicionar</button>
          </div>
        </div>
      </section>

      {/* Tabela de transações */}
      <section className="card">
        <div className="card-header"><h3 className="card-title">Transações</h3></div>
        <div className="card-content overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500">
                <th className="py-2">Data</th>
                <th>Conta</th>
                <th>Categoria</th>
                <th className="text-right">Valor</th>
                <th>Obs.</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={6} className="py-6 text-center text-gray-500">Carregando…</td></tr>
              )}
              {!loading && filteredTxs.map(t => (
                <tr key={t.id} className="border-t">
                  <td className="py-2">{t.date}</td>
                  <td>{accById[t.account_id]?.name || t.account_id}</td>
                  <td>{catById[t.category_id]?.name || t.category_id}</td>
                  <td className={"text-right " + (catById[t.category_id]?.kind === "income" ? "text-emerald-600" : "text-red-600")}>
                    {formatBRL(t.amount)}
                  </td>
                  <td className="truncate max-w-xs">{t.note}</td>
                  <td className="text-right">
                    <button onClick={()=>removeTx(t.id)} className="text-red-600 hover:underline">Excluir</button>
                  </td>
                </tr>
              ))}
              {!loading && filteredTxs.length === 0 && (
                <tr><td colSpan={6} className="py-6 text-center text-gray-500">Sem transações ainda.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
