"use client";
import { useEffect, useState } from "react";

export default function RatesDemoPage() {
  const [data, setData] = useState<any>(null);
  const [err, setErr] = useState<string| null>(null);

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch("/api/rates", { cache: "no-store" });
        if (!r.ok) throw new Error(await r.text());
        setData(await r.json());
      } catch (e:any) {
        setErr(e.message || "erro");
      }
    })();
  }, []);

  return (
    <main className="max-w-xl mx-auto bg-white rounded-xl shadow p-6">
      <h1 className="text-xl font-semibold mb-2">Cotações (via Vercel API)</h1>
      <p className="text-sm text-gray-600 mb-4">Esta página chama <code>/api/rates</code>, que por sua vez chama a API externa do lado do servidor (na Vercel).</p>
      {err && <div className="text-red-600">{err}</div>}
      {!data && !err && <div>Carregando…</div>}
      {data && (
        <div className="text-sm">
          <div className="mb-2">Base: <b>{data.base}</b> | Data: <b>{data.date}</b></div>
          <ul className="grid grid-cols-2 gap-2">
            {Object.entries(data.rates || {}).slice(0, 12).map(([k,v]) => (
              <li key={k} className="border rounded px-3 py-2 flex justify-between">
                <span>{k}</span>
                <span>{Number(v).toFixed(4)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </main>
  );
}