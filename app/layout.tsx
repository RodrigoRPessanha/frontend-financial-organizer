export const metadata = { title: "Organizador Financeiro", description: "Next.js + Auth" };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="min-h-screen">
        <div className="max-w-5xl mx-auto p-6">
          <header className="mb-6">
            <h1 className="text-2xl font-bold">Organizador Financeiro</h1>
            <p className="text-sm text-gray-600">Next.js + Flask API (JWT)</p>
          </header>
          {children}
        </div>
      </body>
    </html>
  );
}