import { useLoaderData, useEventSource } from "react-router";
import db from "../db.server";

export async function loader() {
  const products = [{ sku: "TSHIRT001", name: "T-Shirt Básica", images: 2 }];
  return { products };
}

export default function Home() {
  const { products } = useLoaderData<typeof loader>();
  const logs = useEventSource("/api/logs", { event: "message" });

  return (
    <div className="p-8 bg-slate-900 min-h-screen text-slate-100">
      <h1 className="text-3xl font-bold mb-6">Dashboard de Estúdio</h1>
      
      <div className="grid grid-cols-2 gap-8">
        <div className="bg-slate-800 p-6 rounded-lg">
          <h2 className="text-xl mb-4">Produtos</h2>
          {products.map(p => (
            <div key={p.sku} className="border-b border-slate-700 py-2">
              {p.sku} - {p.name} ({p.images} fotos)
            </div>
          ))}
        </div>

        <div className="bg-slate-800 p-6 rounded-lg">
          <h2 className="text-xl mb-4">Logs em Tempo Real</h2>
          <div className="h-64 overflow-y-auto font-mono text-xs">
            {logs && JSON.parse(logs).map((log: any) => (
              <div key={log.id}>[{log.timestamp}] {log.mensagem}</div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
