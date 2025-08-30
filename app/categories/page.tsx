"use client";

import React, { useEffect, useMemo, useState } from "react";
import { api } from "../../lib/api";

type Cat = { id: number; name: string; kind: "expense" | "income" };
type Sub = { id: number; category_id: number; name: string };

function useAuth(){
  const [token, setToken] = useState<string | null>(null);
  useEffect(() => { setToken(localStorage.getItem("token")); }, []);
  return { token, setToken };
}

function LoginCard(){
  const [hasUser, setHasUser] = useState<boolean | null>(null);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => { api.listCategories().then(()=>setHasUser(true)).catch(()=>setHasUser(false)); }, []);

  async function submit(mode: "register"|"login"){
    try{
      const r = await (mode === "register" ? api.register({ username, password }) : api.login({ username, password }));
      localStorage.setItem("token", r.token);
      localStorage.setItem("username", username);
      location.reload();
    }catch(e:any){ alert(e.message || "erro"); }
  }

  return (
    <div className="max-w-md mx-auto mt-6">
      <div className="card p-6">
        <h2 className="text-xl font-semibold mb-1">{hasUser ? "Entrar" : "Criar sua conta"}</h2>
        <p className="text-sm text-muted mb-4">{hasUser ? "Use seu usuário e senha" : "Primeiro usuário do sistema"}</p>
        <label className="label">Usuário</label>
        <input className="input mb-3" placeholder="seu_usuario" value={username} onChange={e=>setUsername(e.target.value)} />
        <label className="label">Senha</label>
        <input type="password" className="input mb-4" placeholder="Sua senha" value={password} onChange={e=>setPassword(e.target.value)} />
        <div className="flex gap-2">
          {!hasUser && <button onClick={()=>submit("register")} className="btn btn-primary w-full">Criar conta</button>}
          <button onClick={()=>submit("login")} className="btn btn-outline w-full">Entrar</button>
        </div>
      </div>
    </div>
  );
}

export default function CategoriesPage(){
  const { token } = useAuth();
  const [cats, setCats] = useState<Cat[]>([]);
  const [subs, setSubs] = useState<Sub[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<string | null>(null);

  const [newCat, setNewCat] = useState("");
  const [newSub, setNewSub] = useState("");
  const [newSubParent, setNewSubParent] = useState<number | "">("");

  const [editCat, setEditCat] = useState<{id:number; name:string} | null>(null);
  const [editSub, setEditSub] = useState<{id:number; name:string; category_id:number} | null>(null);

  const subsByCat = useMemo(() => {
    const m: Record<number, Sub[]> = {};
    for (const s of subs) { (m[s.category_id] ||= []).push(s); }
    return m;
  }, [subs]);

  function showToast(msg: string){ setToast(msg); setTimeout(()=>setToast(null), 1600); }

  useEffect(() => {
    if (!token) return;
    (async () => {
      setLoading(true);
      const [c, s] = await Promise.all([api.listCategories(), api.listSubcategories()]);
      setCats(c as any); setSubs(s as any); setLoading(false);
    })();
  }, [token]);

  if (!token) return <LoginCard />;

  async function addCategory(){
    if(!newCat.trim()) return;
    const created = await api.createCategory({ name: newCat.trim(), kind: "expense" });
    setCats(prev => [...prev, created as any]);
    setNewCat(""); showToast("Categoria adicionada");
  }

  async function addSubcategory(){
    if (!newSub.trim() || !newSubParent) return;
    const created = await api.createSubcategory({ category_id: Number(newSubParent), name: newSub.trim() });
    setSubs(prev => [...prev, created as any]);
    setNewSub(""); showToast("Subcategoria adicionada");
  }

  async function saveCat(){
    if (!editCat) return;
    const updated = await api.updateCategory(editCat.id, { name: editCat.name });
    setCats(prev => prev.map(c => c.id === editCat.id ? { ...c, name: (updated as any).name } : c));
    setEditCat(null); showToast("Categoria salva");
  }

  async function saveSub(){
    if (!editSub) return;
    const updated = await api.updateSubcategory(editSub.id, { name: editSub.name, category_id: editSub.category_id });
    setSubs(prev => prev.map(s => s.id === editSub.id ? { ...s, name: (updated as any).name, category_id: (updated as any).category_id } : s));
    setEditSub(null); showToast("Subcategoria salva");
  }

  return (
    <div className="grid gap-6">
      {toast && <div className="toast">{toast}</div>}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-xl font-semibold">Categorias & Subcategorias</h2>
        <a href="/" className="btn btn-outline">← Voltar</a>
      </div>

      <section className="card">
        <div className="card-header"><h3 className="card-title">Nova categoria</h3></div>
        <div className="card-content flex gap-2 flex-wrap">
          <input className="input" placeholder="Ex.: Mercado" value={newCat} onChange={e=>setNewCat(e.target.value)} />
          <button className="btn btn-primary" onClick={addCategory}>Adicionar</button>
        </div>
      </section>

      <section className="card">
        <div className="card-header"><h3 className="card-title">Nova subcategoria</h3></div>
        <div className="card-content grid sm:grid-cols-3 gap-2">
          <select className="select" value={newSubParent} onChange={e=>setNewSubParent(e.target.value ? Number(e.target.value) : "")}>
            <option value="">Categoria…</option>
            {cats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <input className="input" placeholder="Ex.: Carnes" value={newSub} onChange={e=>setNewSub(e.target.value)} />
          <button className="btn btn-primary" onClick={addSubcategory} disabled={!newSubParent}>Adicionar</button>
        </div>
      </section>

      <section className="card">
        <div className="card-header"><h3 className="card-title">Lista</h3></div>
        <div className="card-content">
          {loading && <p className="text-muted">Carregando…</p>}
          {!loading && cats.length === 0 && <p className="text-muted">Sem categorias ainda.</p>}
          {!loading && cats.length > 0 && (
            <ul className="space-y-4">
              {cats.map(cat => (
                <li key={cat.id} className="rounded-xl border border-[rgb(var(--border))] bg-card p-3">
                  <div className="flex items-center gap-2">
                    {editCat?.id === cat.id ? (
                      <>
                        <input className="input flex-1" value={editCat.name} onChange={e=>setEditCat({...editCat, name: e.target.value})} />
                        <button className="btn btn-primary" onClick={saveCat}>Salvar</button>
                        <button className="btn btn-outline" onClick={()=>setEditCat(null)}>Cancelar</button>
                      </>
                    ) : (
                      <>
                        <h4 className="font-semibold flex-1">{cat.name}</h4>
                        <button className="btn btn-outline" onClick={()=>setEditCat({id: cat.id, name: cat.name})}>Editar</button>
                      </>
                    )}
                  </div>

                  <div className="mt-3 pl-3 border-l border-[rgb(var(--border))]">
                    {(subsByCat[cat.id] || []).length === 0 ? (
                      <p className="text-sm text-muted">Sem subcategorias.</p>
                    ) : (
                      <ul className="grid gap-2">
                        {(subsByCat[cat.id] || []).map(sc => (
                          <li key={sc.id} className="flex items-center gap-2">
                            {editSub?.id === sc.id ? (
                              <div className="grid grid-cols-[minmax(180px,1fr)_220px_auto_auto] gap-2 w-full">
                                <input className="input w-full" value={editSub.name} onChange={e=>setEditSub({...editSub, name: e.target.value})} />
                                <select className="select w-[220px]" value={editSub.category_id} onChange={e=>setEditSub({...editSub, category_id: Number(e.target.value)})}>
                                  {cats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                                <button className="btn btn-primary" onClick={saveSub}>Salvar</button>
                                <button className="btn btn-outline" onClick={()=>setEditSub(null)}>Cancelar</button>
                              </div>
                            ) : (
                              <>
                                <span className="flex-1">{sc.name}</span>
                                <button className="btn btn-outline" onClick={()=>setEditSub({id: sc.id, name: sc.name, category_id: sc.category_id})}>Editar</button>
                              </>
                            )}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}