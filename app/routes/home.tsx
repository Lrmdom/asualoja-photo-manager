import { useLoaderData, useEventSource, Form, redirect, Link } from "react-router";
import { useEffect, useState } from "react";
import db from "../db.server";
import crypto from "crypto";

export async function loader() {
  const products = [{ sku: "TSHIRT001", name: "T-Shirt Básica", images: 2 }];
  const sessions = db.prepare("SELECT * FROM sessions WHERE estado != 'Terminada'").all();
  return { products, sessions };
}

export async function action({ request }: { request: Request }) {
  const formData = await request.formData();
  const intent = formData.get("intent");
  
  if (intent === "start") {
    const sku = formData.get("sku") as string;
    db.prepare("INSERT INTO sessions (id, sku, data_inicio, estado) VALUES (?, ?, ?, ?)")
      .run(crypto.randomUUID(), sku, new Date().toISOString(), "Ativa");
  } else if (intent === "stop") {
    const id = formData.get("id") as string;
    db.prepare("UPDATE sessions SET estado = 'Terminada' WHERE id = ?").run(id);
  }
  
  return redirect("/");
}

export default function Home() {
  const { products, sessions } = useLoaderData<typeof loader>();
  const logs = useEventSource("/api/logs", { event: "message" });
  const [health, setHealth] = useState<any>(null);

  useEffect(() => {
    fetch("/api/health").then(res => res.json()).then(setHealth);
  }, []);

  return (
    <div className="p-8 bg-slate-900 min-h-screen text-slate-100">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Dashboard de Estúdio</h1>
        <Link to="/settings" className="bg-slate-700 px-4 py-2 rounded">Configurações</Link>
      </div>

      <div className="flex gap-4 mb-6">
        {health && Object.entries(health).map(([key, value]) => (
          <div key={key} className={`px-3 py-1 rounded ${value ? 'bg-green-600' : 'bg-red-600'}`}>
            {key}: {value ? 'ON' : 'OFF'}
          </div>
        ))}
      </div>
      
      <div className="grid grid-cols-2 gap-8">
        <div className="bg-slate-800 p-6 rounded-lg">
          <h2 className="text-xl mb-4">Produtos</h2>
          {products.map(p => (
            <Form key={p.sku} method="post" className="border-b border-slate-700 py-2 flex justify-between">
              <span>{p.sku} - {p.name}</span>
              <input type="hidden" name="sku" value={p.sku} />
              <button type="submit" name="intent" value="start" className="bg-blue-600 px-2 py-1 rounded">Iniciar</button>
            </Form>
          ))}
          
          <h2 className="text-xl mt-6 mb-4">Sessões Ativas</h2>
          {sessions.map((s: any) => (
            <div key={s.id} className="border-b border-slate-700 py-2 flex justify-between">
              <span>{s.sku} ({s.estado})</span>
              <Form method="post">
                <input type="hidden" name="id" value={s.id} />
                <button type="submit" name="intent" value="stop" className="bg-red-600 px-2 py-1 rounded">Terminar</button>
              </Form>
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
