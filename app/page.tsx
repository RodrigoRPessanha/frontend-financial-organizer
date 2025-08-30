"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { api } from "../lib/api";
import { Bar } from "react-chartjs-2";
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from "chart.js";
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

type Cat = { id: number; name: string; kind: "expense" | "income" };
type Sub = { id: number; category_id: number; name: string };
type Acc = { id: number; name: string; type: string };
type Tx = { id: number; account_id: number; category_id: number; subcategory_id?: number | null; amount: number; date: string; note?: string; payment_method?: "cash"|"pix"|"card"|"vr"; installments?: number; installment_index?: number };

function formatBRL(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
function monthOf(d: string){ return d.slice(0,7); }
function formatDateBR(dateStr: string) {
  const [y, m, d] = dateStr.split("-").map(Number);
  if (!y || !m || !d) return dateStr;
  const dt = new Date(Date.UTC(y, m - 1, d));
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "UTC" }).format(dt);
}

function useAuth() {
  const [token, setToken] = useState<string | null>(null);
  useEffect(() => { setToken(localStorage.getItem("token")); }, []);
  function logout(){
    localStorage.removeItem("token");
    localStorage.removeItem("email");
    location.reload();
  }
  return { token, logout, setToken };
}

export default function Page() {
  const { token, logout, setToken } = useAuth();
  const [hasUser, setHasUser] = useState<boolean | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [cats, setCats] = useState<Cat[]>([]);
  const [subs, setSubs] = useState<Sub[]>([]);
  const [accs, setAccs] = useState<Acc[]>([]);
  const [txs, setTxs] = useState<Tx[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<string | null>(null);

  const [month, setMonth] = useState<string>(new Date().toISOString().slice(0,7));
  const [filterCat, setFilterCat] = useState<number | "">("");
  const [filterSub, setFilterSub] = useState<number | "">("");
  const [filterDay, setFilterDay] = useState<string>("");

  // NEW: filtro apenas para o gráfico
  const [payChart, setPayChart] = useState<""|"cash"|"pix"|"card"|"vr">("");

  const [catName, setCatName] = useState("");
  const [subName, setSubName] = useState("");
  const [subParent, setSubParent] = useState<number | "">("");

  const [tx, setTx] = useState({category_id: "", subcategory_id: "", amount: "", date: new Date().toISOString().slice(0,10), note: "", payment_method: "cash", installments: 1});
  const [filter, setFilter] = useState<"all"|"in"|"out">("all"); // se você já removeu, pode apagar este state e o seu uso

  const catById = useMemo(() => Object.fromEntries(cats.map(c => [c.id, c])), [cats]);
  const subsByCat = useMemo(() => {
    const m: Record<number, Sub[]> = {};
    for (const s of subs) { (m[s.category_id] ||= []).push(s); }
    return m;
  }, [subs]);

  function showToast(msg: string) {
    setToast(msg); setTimeout(() => setToast(null), 1800);
  }

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
      localStorage.setItem("email", email);
      setToken(r.token);
      showToast(mode === "register" ? "Conta criada!" : "Login feito!");
      setTimeout(() => location.reload(), 300);
    } catch (e:any) { alert(e.message || "erro"); }
  }

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    (async () => {
      const [c, a, t, s] = await Promise.all([api.listCategories(), api.listAccounts(), api.listTransactions(), api.listSubcategories()]);
      let accounts = a as any[];
      if (accounts.length === 0) {
        const created = await api.createAccount({ name: "Pessoal", type: "other" }) as any;
        accounts = [created];
      }
      setAccs(accounts as any);
      setCats(c as any);
      setTxs(t as any);
      setSubs(s as any);
      setTx(x => ({...x, category_id: (c as any[])[0]?.id || ""}));
    })().finally(() => setLoading(false));
  }, [token]);

  const availableSubs = Number(tx.category_id) ? (subsByCat[Number(tx.category_id)] || []) : [];
  const filterSubsAvail = filterCat ? (subsByCat[Number(filterCat)] || []) : [];

  const filteredTxs = useMemo(() => {
    return txs.filter(t => {
      if (month && monthOf(t.date) !== month) return false;
      if (filterDay && t.date !== filterDay) return false;
      if (filterCat && t.category_id !== Number(filterCat)) return false;
      if (filterSub && (t.subcategory_id || null) !== Number(filterSub)) return false;
      if (filter !== "all") {
        const isIncome = (catById[t.category_id]?.kind === "income");
        if (filter === "in" && !isIncome) return false;
        if (filter === "out" && isIncome) return false;
      }
      return true;
    });
  }, [txs, month, filterDay, filterCat, filterSub, filter, catById]);

  // Chart-only filter by payment method
  const chartSource = useMemo(() => {
    if (!payChart) return filteredTxs;
    return filteredTxs.filter(t => t.payment_method === payChart);
  }, [filteredTxs, payChart]);

  const chartAgg = useMemo(() => {
    const map = new Map<number, number>();
    for (const t of chartSource) {
      const prev = map.get(t.category_id) || 0;
      map.set(t.category_id, prev + t.amount);
    }
    const labels = Array.from(map.keys()).map(id => catById[id]?.name || String(id));
    const values = Array.from(map.values()).map(v => Math.abs(v));
    return { labels, values };
  }, [chartSource, catById]);

  const data = { labels: chartAgg.labels, datasets: [{ label: "Despesas por categoria", data: chartAgg.values, backgroundColor: chartAgg.labels.map((_, i) => i % 3 === 0 ? "rgba(99,102,241,.8)" : i % 3 === 1 ? "rgba(16,185,129,.8)" : "rgba(239,68,68,.8)") }] };

  async function addCategory() {
    if(!catName.trim()) return;
    const created = await api.createCategory({ name: catName.trim(), kind: "expense" });
    setCats(prev => [...prev, created as any]);
    setCatName(""); showToast("Categoria adicionada");
  }

  async function addSubcategory() {
    if (!subName.trim() || !subParent) return;
    const created = await api.createSubcategory({ category_id: Number(subParent), name: subName.trim() }) as any;
    setSubs(prev => [...prev, created]);
    setSubName(""); showToast("Subcategoria adicionada");
  }

  async function addTx() {
    const payload: any = {
      account_id: accs[0]?.id,
      category_id: Number(tx.category_id),
      subcategory_id: tx.subcategory_id ? Number(tx.subcategory_id) : undefined,
      amount: -Math.abs(parseFloat(String(tx.amount).replace(",", "."))),
      date: tx.date,
      note: tx.note || undefined,
      payment_method: tx.payment_method,
      installments: Number(tx.installments || 1)
    };
    if(!payload.account_id || !payload.category_id || isNaN(payload.amount)) return;
    const created = await api.createTransaction(payload);
    if (Array.isArray(created)) {
      setTxs(prev => [...created as any[], ...prev]);
    } else {
      setTxs(prev => [created as any, ...prev]);
    }
    setTx(s => ({...s, amount: ""}));
    showToast(payload.installments > 1 ? "Parcelas lançadas" : "Custo lançado");
  }

  async function removeTx(id: number) {
    await api.deleteTransaction(id);
    setTxs(prev => prev.filter(x => x.id !== id));
    showToast("Transação removida");
  }

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

  return (
    <div className="grid gap-6">
      {toast && <div className="toast">{toast}</div>}

      {/* Filtros em uma linha (inclui filtro do gráfico por pagamento) */}
      <div className="flex items-end gap-3 overflow-x-auto whitespace-nowrap pb-2 -mx-1 px-1">
        <div className="flex flex-col gap-1 shrink-0">
          <label className="label">Mês</label>
          <input type="month" className="input w-[170px]" value={month} onChange={e=>setMonth(e.target.value)} />
        </div>
        <div className="flex flex-col gap-1 shrink-0">
          <label className="label">Dia (opcional)</label>
          <input type="date" className="input w-[160px]" value={filterDay} onChange={e=>setFilterDay(e.target.value)} />
        </div>
        <div className="flex flex-col gap-1 shrink-0">
          <label className="label">Categoria</label>
          <select className="select w-[220px]" value={filterCat} onChange={e=>{ const v=e.target.value; setFilterCat(v? Number(v):""); setFilterSub(""); }}>
            <option value="">Todas</option>
            {cats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div className="flex flex-col gap-1 shrink-0">
          <label className="label">Subcategoria</label>
          <select className="select w-[220px]" value={filterSub} onChange={e=>setFilterSub(e.target.value? Number(e.target.value):"")} disabled={!filterCat || ((subsByCat[Number(filterCat)]||[]).length===0)}>
            <option value="">Todas</option>
            {(subsByCat[Number(filterCat)] || []).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>

        {/* NOVO: filtro do gráfico por método de pagamento */}
        <div className="flex flex-col gap-1 shrink-0">
          <label className="label">Gráfico · Pagamento</label>
          <select className="select w-[180px]" value={payChart} onChange={e=>setPayChart(e.target.value as any)}>
            <option value="">Todos</option>
            <option value="cash">Dinheiro</option>
            <option value="pix">PIX</option>
            <option value="card">Cartão</option>
            <option value="vr">VR</option>
          </select>
        </div>

        <button className="btn btn-outline shrink-0" onClick={() => { setFilterDay(""); setFilterCat(""); setFilterSub(""); setPayChart(""); }} title="Limpar filtros">Limpar</button>
      </div>

      {/* Gráfico */}
      <section className="card">
        <div className="card-header">
          <h3 className="card-title">Despesas por categoria</h3>
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
          <div className="card-header"><h3 className="card-title">Categorias/Subcategorias</h3></div>
          <div className="card-content">
            <div className="flex gap-2">
              <input className="input flex-1" placeholder="Ex.: Mercado" value={catName} onChange={e=>setCatName(e.target.value)} />
              <button onClick={addCategory} className="btn btn-primary">Add</button>
            </div>
            <div className="mt-4 grid gap-2">
              <select className="select" value={subParent} onChange={e=>setSubParent((e.target.value ? Number(e.target.value) : "") as any)}>
                <option value="">Categoria…</option>
                {cats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <div className="flex gap-2">
                <input className="input flex-1" placeholder="Ex.: Verduras" value={subName} onChange={e=>setSubName(e.target.value)} />
                <button onClick={addSubcategory} className="btn btn-primary">Add</button>
              </div>
            </div>
          </div>
        </div>

        <div className="card md:col-span-2">
          <div className="card-header"><h3 className="card-title">Lançar custo</h3></div>
          <div className="card-content grid sm:grid-cols-2 gap-2">
            <select className="select" value={tx.category_id} onChange={e=>setTx(s=>({...s, category_id: e.target.value, subcategory_id: ""}))}>
              <option value="">Categoria…</option>
              {cats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <select className="select" value={tx.subcategory_id} onChange={e=>setTx(s=>({...s, subcategory_id: e.target.value}))} disabled={!Number(tx.category_id) || ( (subsByCat[Number(tx.category_id)]||[]).length === 0)}>
              <option value="">(opcional) Subcategoria…</option>
              {(subsByCat[Number(tx.category_id)] || []).map(sc => <option key={sc.id} value={sc.id}>{sc.name}</option>)}
            </select>
            <input className="input" placeholder="Valor (ex.: 35,90)" value={tx.amount} onChange={e=>setTx(s=>({...s, amount: e.target.value}))}/>
            <input type="date" className="input" value={tx.date} onChange={e=>setTx(s=>({...s, date: e.target.value}))}/>
            <input className="input" placeholder="Observação" value={tx.note} onChange={e=>setTx(s=>({...s, note: e.target.value}))}/>

            <div className="grid gap-1">
              <label className="label">Forma de pagamento</label>
              <select className="select" value={tx.payment_method} onChange={e=>setTx(s=>({...s, payment_method: e.target.value as any, installments: e.target.value==='card' ? Math.max(1, Number(s.installments||1)) : 1}))}>
                <option value="cash">Dinheiro</option>
                <option value="pix">PIX</option>
                <option value="card">Cartão</option>
                <option value="vr">VR</option>
              </select>
            </div>

            <div className="grid gap-1">
              <label className="label">Parcelas</label>
              <select className="select" value={tx.installments} onChange={e=>setTx(s=>({...s, installments: Number(e.target.value)}))} disabled={tx.payment_method !== 'card'}>
                {Array.from({length:12}, (_,i)=>i+1).map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>

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
                <th className="py-2">Valor</th>
                <th>Pagamento</th>
                <th>Obs.</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {loading && (<tr><td colSpan={6} className="py-6 text-center text-muted">Carregando…</td></tr>)}
              {!loading && filteredTxs.map(t => (
                <tr key={t.id}>
                  <td className="py-2">{formatDateBR(t.date)}</td>
                  <td>
                    {catById[t.category_id]?.name || t.category_id}
                    {t.subcategory_id ? <span className="text-muted"> / {(subs.find(s => s.id === t.subcategory_id)?.name || t.subcategory_id)}</span> : null}
                  </td>
                  <td className="text-expense">{formatBRL(Math.abs(t.amount))}</td>
                  <td className="text-xs">
                    {t.payment_method === 'card' ? `Cartão ${t.installment_index}/${t.installments}`
                      : t.payment_method === 'pix' ? 'PIX'
                      : t.payment_method === 'vr' ? 'VR'
                      : 'Dinheiro'}
                  </td>
                  <td className="truncate max-w-xs">{t.note}</td>
                  <td className="text-right">
                    <button onClick={()=>removeTx(t.id)} className="text-[rgb(var(--danger))] hover:underline">Excluir</button>
                  </td>
                </tr>
              ))}
              {!loading && filteredTxs.length === 0 && (
                <tr><td colSpan={6} className="py-6 text-center text-muted">Sem lançamentos no filtro atual.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}