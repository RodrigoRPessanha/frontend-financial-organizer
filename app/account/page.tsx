"use client";

import { useEffect, useState } from "react";
import { api } from "../../lib/api";

function useAuth(){
  const [token, setToken] = useState<string | null>(null);
  useEffect(() => { setToken(localStorage.getItem("token")); }, []);
  function logout(){ localStorage.removeItem("token"); localStorage.removeItem("username"); location.reload(); }
  return { token, setToken, logout };
}

export default function AccountPage(){
  const { token, setToken, logout } = useAuth();
  const [hasUser, setHasUser] = useState<boolean | null>(null);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const [oldPwd, setOldPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");

  useEffect(() => {
    (async () => {
      try { await api.listCategories(); setHasUser(true); }
      catch { setHasUser(false); }
    })();
  }, [token]);

  async function handleRegisterOrLogin(mode: "register" | "login") {
    try {
      const r = await (mode === "register" ? api.register({ username, password }) : api.login({ username, password }));
      localStorage.setItem("token", r.token);
      localStorage.setItem("username", username);
      setToken(r.token); 
      setTimeout(() => location.reload(), 300);
    } catch (e:any) { alert(e.message || "erro"); }
  }

  async function changePassword(){
    if (newPwd.length < 6) return alert("Nova senha precisa de 6+ caracteres.");
    try{
      await api.changePassword({ old_password: oldPwd, new_password: newPwd });
      setOldPwd(""); setNewPwd("");
      alert("Senha alterada com sucesso.");
    }catch(e:any){
      alert(e.message || "Erro ao alterar senha.");
    }
  }

  if (!token) {
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
            {!hasUser && <button onClick={()=>handleRegisterOrLogin("register")} className="btn btn-primary w-full">Criar conta</button>}
            <button onClick={()=>handleRegisterOrLogin("login")} className="btn btn-outline w-full">Entrar</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-6 max-w-xl mx-auto">
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Conta</h3>
        </div>
        <div className="card-content grid gap-3">
          <div className="grid gap-1">
            <label className="label">Nova senha</label>
            <input type="password" className="input" value={newPwd} onChange={(e)=>setNewPwd(e.target.value)} placeholder="••••••"/>
          </div>
          <div className="grid gap-1">
            <label className="label">Senha atual</label>
            <input type="password" className="input" value={oldPwd} onChange={(e)=>setOldPwd(e.target.value)} placeholder="••••••"/>
          </div>
          <div className="flex gap-2">
            <button className="btn btn-primary" onClick={changePassword}>Alterar senha</button>
            <button className="btn btn-outline" onClick={logout}>Sair</button>
          </div>
        </div>
      </div>
    </div>
  );
}