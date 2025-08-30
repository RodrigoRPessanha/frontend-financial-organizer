import { NextResponse } from "next/server";

export async function GET() {
  // Exemplo: cotações baseadas em BRL
  const upstream = "https://api.exchangerate.host/latest?base=BRL";
  const r = await fetch(upstream, { cache: "no-store" });
  if (!r.ok) {
    return NextResponse.json({ error: "upstream error" }, { status: 502 });
  }
  const data = await r.json();
  return NextResponse.json(data);
}