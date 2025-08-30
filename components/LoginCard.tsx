"use client";
import { useEffect, useState } from "react";
import { api } from "../lib/api";

export default function LoginCard(){
  const [hasUser, setHasUser] = useState<boolean | null>(null);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => { api.listCategories().then(()=>setHasUser(true)).catch(()=>setHasUser(false)); }, []);

  async function submit(mode: "register"|"login"){
    try{
      if(mode === "register") await api.register({ username, password });
      else await api.login({ username, password });
      localStorage.setItem("username", username);
      location.reload();
    }catch(e:any){
      alert(e.message || "erro");
    }
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