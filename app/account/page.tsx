"use client";

import { useEffect, useState } from "react";
import { api } from "../../lib/api";

/** Guard e helpers */
function useAuth(){
  const [token, setToken] = useState<string | null>(null);
  useEffect(() => { setToken(localStorage.getItem("token")); }, []);
  function logout(){ localStorage.removeItem("token"); localStorage.removeItem("username"); location.reload(); }
  return { token, setToken, logout };
}

function LoginCard(){
  const [hasUser, setHasUser] = useState<boolean | null>(null);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => { api.listCategories().then(()=>setHasUser(true)).catch(()=>setHasUser(false)); }, []);

  async function submit(mode: "register"|"login"){
    try{
      const r = await (mode === "register"
        ? api.register({ username, password })
        : api.login({ username, password }));
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

export default function AccountPage(){
  const { token, setToken, logout } = useAuth();
  const [usernameShown, setUsernameShown] = useState("");

  // segurança
  const [oldPwd, setOldPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");

  // exportação
  const [monthExport, setMonthExport] = useState<string>("");

  // apagar conta
  const [confirmText, setConfirmText] = useState("");

  useEffect(() => {
    if (token) setUsernameShown(localStorage.getItem("username") || "");
  }, [token]);

  if (!token) return <LoginCard />;

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

  async function doExportCsv(){
    try{
      const blob = await api.exportCsv(monthExport || undefined);
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href = url;
      a.download = monthExport ? `transacoes-${monthExport}.csv` : "transacoes.csv";
      document.body.appendChild(a); a.click(); a.remove();
      URL.revokeObjectURL(url);
    }catch(e:any){
      alert(e.message || "Erro ao exportar CSV.");
    }
  }

  async function deleteAccount(){
    if (confirmText !== "APAGAR") return alert('Digite "APAGAR" para confirmar.');
    try{
      await api.deleteAccount();
      alert("Conta removida.");
      logout();
    }catch(e:any){
      alert(e.message || "Erro ao apagar conta.");
    }
  }

  return (
    <div className="grid gap-6 max-w-3xl mx-auto">
      {/* Perfil */}
      <section className="card">
        <div className="card-header"><h3 className="card-title">Perfil</h3></div>
        <div className="card-content grid sm:grid-cols-2 gap-3">
          <div className="grid gap-1">
            <label className="label">Usuário</label>
            <input className="input" value={usernameShown} readOnly />
          </div>
          <div className="grid gap-1">
            <label className="label">Sessão</label>
            <div className="flex gap-2">
              <button className="btn btn-outline" onClick={logout}>Sair</button>
            </div>
          </div>
        </div>
      </section>

      {/* Exportar dados */}
      <section className="card">
        <div className="card-header"><h3 className="card-title">Exportar dados (CSV)</h3></div>
        <div className="card-content flex flex-wrap items-end gap-3">
          <div className="grid gap-1">
            <label className="label">Mês (opcional)</label>
            <input type="month" className="input w-[170px]" value={monthExport} onChange={e=>setMonthExport(e.target.value)} />
          </div>
          <button className="btn btn-primary" onClick={doExportCsv}>Baixar CSV</button>
        </div>
      </section>

      {/* Segurança */}
      <section className="card">
        <div className="card-header"><h3 className="card-title">Segurança</h3></div>
        <div className="card-content grid gap-3">
          <div className="grid gap-1">
            <label className="label">Nova senha</label>
            <input type="password" className="input" value={newPwd} onChange={(e)=>setNewPwd(e.target.value)} placeholder="••••••"/>
          </div>
          <div className="grid gap-1">
            <label className="label">Senha atual</label>
            <input type="password" className="input" value={oldPwd} onChange={(e)=>setOldPwd(e.target.value)} placeholder="••••••"/>
          </div>
          <div>
            <button className="btn btn-primary" onClick={changePassword}>Alterar senha</button>
          </div>
        </div>
      </section>

      {/* Zona de perigo */}
      <section className="card">
        <div className="card-header"><h3 className="card-title text-[rgb(var(--danger))]">Zona de perigo</h3></div>
        <div className="card-content grid gap-3">
          <p className="text-sm text-muted">
            Apagar sua conta remove permanentemente categorias, subcategorias e transações.
          </p>
          <div className="grid sm:grid-cols-[240px_1fr_auto] gap-2">
            <input className="input" placeholder='Digite APAGAR' value={confirmText} onChange={e=>setConfirmText(e.target.value)} />
            <div />
            <button className="btn btn-outline text-[rgb(var(--danger))]" onClick={deleteAccount}>Apagar conta</button>
          </div>
        </div>
      </section>
    </div>
  );
}
