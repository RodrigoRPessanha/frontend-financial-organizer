// app/components/SessionLoading.tsx
"use client";
import ForceLogoutLink from "./ForceLogoutLink";

export default function SessionLoading({ onRetry, onGuest }: { onRetry: () => void; onGuest: () => void }) {
  return (
    <div className="p-6 text-sm text-muted flex items-center gap-3 flex-wrap">
      <span>Verificando sessão…</span>
      <button onClick={onRetry} className="underline hover:opacity-80">Tentar novamente</button>
      <button onClick={onGuest} className="underline hover:opacity-80">Entrar assim mesmo</button>
      <ForceLogoutLink className="underline hover:opacity-80">Forçar sair</ForceLogoutLink>
    </div>
  );
}
