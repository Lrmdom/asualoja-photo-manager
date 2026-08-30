import { useLoaderData, Form, redirect, Link } from "react-router";
import { useEventSource } from "remix-utils/sse/react";
import { useEffect, useState, useMemo } from "react";
import db from "../db.server";
import crypto from "crypto";
import { sanityClient } from "../sanity.server";
import { defineQuery } from "groq";

const PRODUCTS_QUERY = defineQuery(/* groq */ `*[_type == "product"]{
  _id,
  "sku": code,
  name,
  "variantes": variants[]->{
    _id,
    name,
    sku
  }
}`);

export async function loader() {
  const products = await sanityClient.fetch(PRODUCTS_QUERY);
  const sessions = db.prepare("SELECT * FROM sessions WHERE estado != 'Terminada'").all();
  const quarentena = db.prepare("SELECT * FROM upload_queue WHERE estado = 'Falhou'").all();
  return { products, sessions, quarentena };
}

export async function action({ request }: { request: Request }) {
  const formData = await request.formData();
  const intent = formData.get("intent");
  
  if (intent === "start") {
    const activeSessions = db.prepare("SELECT COUNT(*) as count FROM sessions WHERE estado = 'Ativa'").get() as { count: number };
    if (activeSessions.count > 0) {
      console.error("Já existe uma sessão ativa.");
      return { error: "Já existe uma sessão ativa. Por favor, termine a sessão atual antes de iniciar uma nova." };
    }
    const sku = formData.get("sku") as string;
    const variante = formData.get("variante") as string;
    console.log("Intent 'start' recebido:", { sku, variante });
    try {
      const result = db.prepare("INSERT INTO sessions (id, sku, variante_nome, data_inicio, estado) VALUES (?, ?, ?, ?, ?)")
        .run(crypto.randomUUID(), sku, variante, new Date().toISOString(), "Ativa");
      console.log("Sessão inserida:", result);
    } catch (error) {
      console.error("Erro ao inserir sessão:", error);
    }
  } else if (intent === "stop") {
    const id = formData.get("id") as string;
    db.prepare("UPDATE sessions SET estado = 'Terminada' WHERE id = ?").run(id);
  } else if (intent === "reprocess") {
    const id = formData.get("id") as string;
    db.prepare("UPDATE upload_queue SET estado = 'Pendente', tentativas = 0, erro_mensagem = NULL WHERE id = ?").run(id);
  }
  
  return redirect("/");
}

export default function Home() {
  const { products, sessions, quarentena } = useLoaderData<typeof loader>();
  const logs = useEventSource("/api/logs", { event: "message" });
  const [health, setHealth] = useState<any>(null);
  const [filter, setFilter] = useState("");

  useEffect(() => {
    fetch("/api/health").then(res => res.json()).then(setHealth);
  }, []);

  const filteredProducts = useMemo(() => {
    return products.filter((p: any) => 
      (p.sku?.toLowerCase() || "").includes(filter.toLowerCase()) || 
      (p.name?.toLowerCase() || "").includes(filter.toLowerCase())
    );
  }, [products, filter]);

  return (
    <div className="p-8 bg-slate-900 min-h-screen text-slate-100">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Dashboard de Estúdio</h1>
        <Link to="/settings" className="bg-slate-700 px-4 py-2 rounded">Configurações</Link>
      </div>

      <div className="flex gap-4 mb-6">
        {health ? (
          Object.entries(health).map(([key, value]) => (
            <div 
              key={key} 
              className={`px-4 py-2 rounded-full font-semibold text-sm flex items-center gap-2 ${
                value ? 'bg-green-900 text-green-100 border border-green-700' : 'bg-red-900 text-red-100 border border-red-700'
              }`}
            >
              <div className={`w-2 h-2 rounded-full ${value ? 'bg-green-400' : 'bg-red-400'}`} />
              {key.replace('_', ' ').toUpperCase()}: {value ? 'ONLINE' : 'OFFLINE'}
            </div>
          ))
        ) : (
          <div className="text-slate-500 italic">A verificar estado do sistema...</div>
        )}
      </div>

      <input 
        type="text" 
        placeholder="Filtrar por SKU ou Nome..." 
        className="w-full bg-slate-800 p-3 rounded-lg mb-6"
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
      />
      
      <div className="grid grid-cols-2 gap-8">
        <div className="bg-slate-800 p-6 rounded-lg">
          <h2 className="text-xl mb-4">Catálogo de Produtos</h2>
          <div className="space-y-2 max-h-96 overflow-y-auto pr-2">
            {filteredProducts.map((p: any) => (
              <details key={p._id} className="bg-slate-700 rounded p-2">
                <summary className="font-bold cursor-pointer">
                  {p.name} <span className="text-cyan-400 font-normal">({p.variantes?.length || 0})</span>
                </summary>
                <table className="w-full text-left mt-2 border-t border-slate-600">
                  <tbody>
                    {p.variantes?.map((v: any) => (
                      <tr key={v.sku} className="border-b border-slate-600 text-sm">
                        <td className="py-2 font-mono text-xs text-yellow-400">{v.sku}</td>
                        <td className="py-2 text-slate-100">{v.name}</td>
                        <td className="py-2">
                          <Form method="post" className="flex gap-2">
                            <input type="hidden" name="sku" value={v.sku} />
                            <input type="hidden" name="variante" value={v.name} />
                            <button type="submit" name="intent" value="start" className="bg-blue-600 px-2 py-1 rounded text-xs">Iniciar</button>
                          </Form>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </details>
            ))}
          </div>
          
          <h2 className="text-xl mt-8 mb-4">Sessões Ativas</h2>
          {sessions.map((s: any) => (
            <div key={s.id} className="border-b border-slate-700 py-2 flex justify-between items-center text-sm">
              <span>{s.sku} ({s.variante_nome}) - <span className="text-green-400">{s.estado}</span></span>
              <Form method="post">
                <input type="hidden" name="id" value={s.id} />
                <button type="submit" name="intent" value="stop" className="bg-red-600 px-2 py-1 rounded">Terminar</button>
              </Form>
            </div>
          ))}

          <h2 className="text-xl mt-8 mb-4 text-red-400">Quarentena / Falhas</h2>
          {quarentena.map((q: any) => (
            <div key={q.id} className="border-b border-slate-700 py-2 flex justify-between items-center text-sm">
              <span className="truncate text-red-300" title={q.erro_mensagem}>{q.caminho_local.split('/').pop()}</span>
              <Form method="post">
                <input type="hidden" name="id" value={q.id} />
                <button type="submit" name="intent" value="reprocess" className="bg-orange-600 px-2 py-1 rounded text-white">Reprocessar</button>
              </Form>
            </div>
          ))}
        </div>

        <div className="bg-slate-800 p-6 rounded-lg">
          <h2 className="text-xl mb-4">Logs em Tempo Real</h2>
          <div className="h-64 overflow-y-auto font-mono text-xs bg-slate-950 p-2 rounded">
            {logs && JSON.parse(logs).map((log: any) => (
              <div key={log.id} className="mb-1 text-slate-300">[{log.timestamp}] {log.mensagem}</div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
