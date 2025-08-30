"use client";

import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import { useSession } from "../../lib/useSession";
import LoginCard from "../../components/LoginCard";

function getInitials(username?: string | null){
  if(!username) return "U";
  const parts = username.split(/[._-]+/).filter(Boolean);
  const base = parts[0] || username;
  const chars = (base[0] || "U") + (parts[1]?.[0] || "");
  return chars.toUpperCase();
}

export default function AccountPage(){
  const { loggedIn, loading, user } = useSession();
  const [oldPwd, setOldPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [month, setMonth] = useState<string>(new Date().toISOString().slice(0,7));
  const [confirm, setConfirm] = useState("");

  async function logout(){
    try { await api.logout(); } catch {}
    localStorage.removeItem("username");
    location.href = "/";
  }

  async function changePassword(){
    if (newPwd.length < 6) return alert("Nova senha precisa de 6+ caracteres.");
    try {
      await api.changePassword({ old_password: oldPwd, new_password: newPwd });
      setOldPwd(""); setNewPwd("");
      alert("Senha alterada com sucesso.");
    } catch (e:any) {
      alert(e.message || "Erro ao alterar senha.");
    }
  }

  async function exportCsv(){
    try {
      const blob = await api.exportCsv(month);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `transacoes-${month}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e:any) {
      alert(e.message || "Erro no export.");
    }
  }

  async function deleteAccount(){
    if (confirm.toLowerCase() !== "deletar") {
      return alert("Digite 'deletar' para confirmar.");
    }
    if (!window.confirm("Tem certeza? Esta ação remove TODOS os seus dados.")) return;
    try {
      await api.deleteAccount();
      alert("Conta deletada.");
      logout();
    } catch (e:any) {
      alert(e.message || "Erro ao deletar conta.");
    }
  }

  if (loading) return <div className="p-6 text-sm text-muted">Verificando sessão…</div>;
  if (!loggedIn) return <LoginCard />;

  const username = user?.username || localStorage.getItem("username") || "usuario";

  return (
    <div className="grid gap-6 max-w-2xl">
      <section className="card p-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-accent text-white flex items-center justify-center text-xl font-bold">
            {getInitials(username)}
          </div>
          <div>
            <h2 className="text-lg font-semibold">Sua conta</h2>
            <p className="text-sm text-muted">{username || "—"}</p>
          </div>
        </div>
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <button onClick={logout} className="btn btn-outline">Sair</button>
        </div>
      </section>

      <section className="card p-6">
        <h3 className="font-semibold mb-3">Alterar senha</h3>
        <div className="grid gap-2">
          <input type="password" className="input" placeholder="Senha atual" value={oldPwd} onChange={e=>setOldPwd(e.target.value)} />
          <input type="password" className="input" placeholder="Nova senha (6+ caracteres)" value={newPwd} onChange={e=>setNewPwd(e.target.value)} />
          <div className="flex gap-2">
            <button onClick={changePassword} className="btn btn-primary">Salvar nova senha</button>
          </div>
        </div>
      </section>

      <section className="card p-6">
        <h3 className="font-semibold mb-3">Exportar CSV</h3>
        <div className="flex items-center gap-2">
          <input type="month" className="input w-auto" value={month} onChange={e=>setMonth(e.target.value)} />
          <button onClick={exportCsv} className="btn btn-outline">Baixar CSV</button>
        </div>
        <p className="text-xs text-muted mt-2">O arquivo inclui data, valor, categoria e observação.</p>
      </section>

      <section className="card p-6 border-red-200">
        <h3 className="font-semibold mb-2 text-red-600">Excluir conta e dados</h3>
        <p className="text-sm text-muted mb-3">Esta ação é permanente. Digite <b>deletar</b> para confirmar.</p>
        <div className="grid gap-2 sm:grid-cols-2">
          <input className="input" placeholder="digite: deletar" value={confirm} onChange={e=>setConfirm(e.target.value)} />
          <button onClick={deleteAccount} className="btn btn-outline">Excluir tudo</button>
        </div>
      </section>
    </div>
  );
}