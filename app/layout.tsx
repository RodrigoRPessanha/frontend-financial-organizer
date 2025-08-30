export const metadata = {
  title: "Organizador Financeiro",
  description: "Controle simples de custos diários",
};

import "./globals.css";
import ThemeToggle from "../components/ThemeToggle";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const initTheme = `
  try {
    const saved = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const theme = saved || (prefersDark ? 'dark' : 'light');
    document.documentElement.setAttribute('data-theme', theme);
  } catch (e) {}
  `;

  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: initTheme }} />
      </head>
      <body className="min-h-screen bg-bg text-fg">
        <div className="min-h-screen flex flex-col">
          <header className="sticky top-0 z-40 bg-card/80 backdrop-blur border-b border-border">
            <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-4">
              <span className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-primary text-white font-bold">OF</span>
              <div className="flex-1">
                <h1 className="text-lg font-semibold leading-tight">Organizador Financeiro</h1>
                <p className="text-xs text-muted">Next.js + Flask (JWT)</p>
              </div>
              <a href="/" className="navlink">Dashboard</a>
              <a href="/rates-demo" className="navlink hidden sm:inline">Cotações</a>
              <a href="/account" className="navlink">Conta</a>
              <ThemeToggle />
            </div>
          </header>
          <main className="flex-1">
            <div className="max-w-6xl mx-auto px-4 py-6">{children}</div>
          </main>
          <footer className="border-t border-border bg-card">
            <div className="max-w-6xl mx-auto px-4 py-4 text-xs text-muted flex flex-wrap items-center gap-2">
              <span>© {new Date().getFullYear()} Organizador Financeiro</span>
              <span className="hidden sm:inline">•</span>
              <span className="hidden sm:inline">Feito com Next.js + Tailwind</span>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}