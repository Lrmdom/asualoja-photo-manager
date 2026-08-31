import { useLoaderData, Form, redirect, Link } from "react-router";
import { useEventSource } from "remix-utils/sse/react";
import { useEffect, useState, useMemo, useRef } from "react";
import { toast } from "sonner";
import db from "../db.server";
import crypto from "crypto";
import { sanityClient } from "../sanity.server";
import { defineQuery } from "groq";
import { Button } from "../../components/ui/button";
import { cn } from "../../lib/utils";

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
    try {
      db.prepare("INSERT INTO sessions (id, sku, variante_nome, data_inicio, estado) VALUES (?, ?, ?, ?, ?)")
        .run(crypto.randomUUID(), sku, variante, new Date().toISOString(), "Ativa");
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


function Highlight({ text, query }: { text: string; query: string }) {
  if (!query) return <>{text}</>;
  const parts = text.split(new RegExp(`(${query})`, "gi"));
  return (
    <>
      {parts.map((part, index) =>
        part.toLowerCase() === query.toLowerCase() ? (
          <mark key={index} className="bg-yellow-200 text-foreground">{part}</mark>
        ) : (
          part
        )
      )}
    </>
  );
}

export default function Home() {
  const { products, sessions, quarentena } = useLoaderData<typeof loader>();
  const logs = useEventSource("/api/logs", { event: "message" });
  const [health, setHealth] = useState<any>(null);
  const [filter, setFilter] = useState("");
  const [notification, setNotification] = useState<string | null>(null);
  const sessionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/health").then(res => res.json()).then(setHealth);
  }, []);

  const handleStartSession = (e: React.FormEvent, sku: string) => {
    if (sessions.length > 0) {
      e.preventDefault();
      setNotification(`Sessão ativa para ${sessions[0].sku}. Termine-a antes de iniciar uma nova.`);
      sessionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setTimeout(() => setNotification(null), 5000);
    }
  };

  const filteredProducts = useMemo(() => {
    return products.filter((p: any) =>
      (p.sku?.toLowerCase() || "").includes(filter.toLowerCase()) ||
      (p.name?.toLowerCase() || "").includes(filter.toLowerCase()) ||
      p.variantes?.some((v: any) =>
        (v.sku?.toLowerCase() || "").includes(filter.toLowerCase()) ||
        (v.name?.toLowerCase() || "").includes(filter.toLowerCase())
      )
    );
  }, [products, filter]);

  return (
    <div className="p-4 md:p-8 bg-background min-h-screen text-foreground">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Dashboard de Estúdio</h1>
        <Button asChild variant="outline">
          <Link to="/settings">Configurações</Link>
        </Button>
      </div>

      {sessions.length > 0 && (
        <div
          ref={sessionRef}
          className={cn(
            "mb-6 bg-blue-50 border border-blue-200 shadow-sm p-4 rounded-lg transition-all duration-300",
            notification && "ring-2 ring-blue-500 ring-offset-2 animate-pulse"
          )}
        >
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <h2 className="text-sm font-semibold text-blue-900">Sessão Ativa:</h2>
            {sessions.map((s: any) => (
              <div key={s.id} className="flex items-center gap-4 text-sm text-blue-900">
                <UploadCamera sessionId={s.id} sku={s.sku} />
                <a href={`#variant-${s.sku}`} className="font-medium hover:underline cursor-pointer">{s.sku}</a>
                <span className="text-blue-900">- <span className="text-green-700 font-bold">{s.estado}</span></span>
                <Form method="post">
                  <input type="hidden" name="id" value={s.id} />
                  <Button type="submit" name="intent" value="stop" size="sm" variant="destructive">
                    Terminar
                  </Button>
                </Form>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-2 mb-6">
        {health ? (
          Object.entries(health).map(([key, value]) => (
            <div
              key={key}
              className={`px-3 py-1 rounded-full font-semibold text-xs flex items-center gap-2 ${
                value ? 'bg-green-100 text-green-800 border border-green-200' : 'bg-red-100 text-red-800 border border-red-200'
              }`}
            >
              <div className={`w-2 h-2 rounded-full ${value ? 'bg-green-500' : 'bg-red-500'}`} />
              {key.replace('_', ' ').toUpperCase()}
            </div>
          ))
        ) : (
          <div className="text-muted-foreground italic text-sm">A verificar sistema...</div>
        )}
      </div>

      <input
        type="text"
        placeholder="Filtrar por SKU ou Nome..."
        className="w-full bg-background border border-input p-3 rounded-md mb-6 focus:outline-none focus:ring-2 focus:ring-ring"
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-card border border-border p-6 rounded-lg shadow-sm">
          <h2 className="text-xl font-semibold mb-4">Catálogo</h2>
          <div className="space-y-2 max-h-96 overflow-y-auto pr-2">
            {filteredProducts.map((p: any) => {
              const hasActiveVariant = p.variantes?.some((v: any) => sessions.some((s: any) => s.sku === v.sku));
              return (
                <details key={p._id} className={cn("bg-muted rounded p-2 transition-all", hasActiveVariant && "ring-2 ring-sky-500")} open={filter.length > 0}>
                  <summary className={cn("font-medium cursor-pointer text-sm flex items-center justify-between", hasActiveVariant && "text-sky-700")}>
                    <div className="flex items-center">
                      <span className="font-mono text-xs text-primary mr-2">
                          <Highlight text={p.sku || ""} query={filter} />
                      </span>
                      <span className="text-foreground">
                          <Highlight text={p.name || ""} query={filter} />
                      </span>
                    </div>
                    <div className="flex items-center">
                      {hasActiveVariant && <div className="w-2 h-2 rounded-full bg-sky-500 mr-2 animate-pulse" />}
                      <span className="text-blue-500 font-normal">({p.variantes?.length || 0})</span>
                    </div>
                  </summary>
                  <div className="w-full mt-2 border-t border-border">
                    {p.variantes?.map((v: any) => {
                      const isActive = sessions.some((s: any) => s.sku === v.sku);
                      return (
                        <div id={`variant-${v.sku}`} key={v.sku} className="flex items-center justify-between py-2 border-b border-border text-sm">
                          <span className="font-mono text-xs text-sky-600">
                            <Highlight text={v.sku || ""} query={filter} />
                          </span>
                          <span className="truncate mx-2">
                            <Highlight text={v.name || ""} query={filter} />
                          </span>
                          {isActive ? (
                            <Form method="post" className="flex gap-2">
                              <Button disabled size="sm" variant="outline" className="text-sky-600 border-sky-600">
                                Ativo
                              </Button>
                              <input type="hidden" name="id" value={sessions.find(s => s.sku === v.sku)?.id} />
                              <Button
                                type="submit"
                                name="intent"
                                value="stop"
                                size="sm"
                                className="bg-amber-500 text-gray-900 hover:bg-amber-600 hover:scale-105 transition-all duration-200"
                              >
                                Parar
                              </Button>
                            </Form>
                          ) : (
                            <Form method="post" onSubmit={(e) => handleStartSession(e, v.sku)}>
                              <input type="hidden" name="sku" value={v.sku} />
                              <input type="hidden" name="variante" value={v.name} />
                              <Button type="submit" name="intent" value="start" size="sm">
                                Iniciar
                              </Button>
                            </Form>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </details>
              );
            })}
          </div>


          <h2 className="text-lg font-semibold mt-8 mb-4 text-destructive">Falhas</h2>
          {quarentena.map((q: any) => (
            <div key={q.id} className="flex justify-between items-center py-2 border-b border-border text-sm">
              <span className="truncate text-destructive" title={q.erro_mensagem}>{q.caminho_local.split('/').pop()}</span>
              <Form method="post">
                <input type="hidden" name="id" value={q.id} />
                <Button type="submit" name="intent" value="reprocess" size="sm" variant="outline">Reprocessar</Button>
              </Form>
            </div>
          ))}
        </div>

        <div className="bg-card border border-border p-6 rounded-lg shadow-sm">
          <h2 className="text-xl font-semibold mb-4">Logs</h2>
          <div className="h-64 overflow-y-auto font-mono text-xs bg-muted p-2 rounded-md">
            {logs && JSON.parse(logs).map((log: any) => (
              <div key={log.id} className="mb-1 text-foreground">[{log.timestamp}] {log.mensagem}</div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// Componente Auxiliar isolado (Fora da função Home)
// -----------------------------------------------------------------------------

interface UploadCameraProps {
  sessionId: string;
  sku: string;
}

function UploadCamera(props: UploadCameraProps) {
  const [uploading, setUploading] = useState(false);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    setUploading(true);
    const toastId = toast.loading("A enviar foto...");
    const formData = new FormData();
    formData.append("photo", e.target.files[0]);
    formData.append("sku", props.sku);
    formData.append("sessionId", props.sessionId);

    try {
      const res = await fetch("/api/upload-photo", { method: "POST", body: formData });
      if (!res.ok) throw new Error("Falha no upload");
      toast.success("Foto enviada com sucesso!", { id: toastId });
    } catch (err) {
      toast.error("Erro ao enviar foto.", { id: toastId, duration: Infinity, dismissible: true });
    } finally {
      setUploading(false);
    }
  };

  return (
    <label className={cn("cursor-pointer p-2 rounded-full transition-colors", uploading ? "opacity-50 cursor-not-allowed" : "hover:bg-blue-100")}>
      <span role="img" aria-label="camera" className="text-xl">{uploading ? "⏳" : "📷"}</span>
      <input type="file" accept="image/*" capture="environment" className="hidden" disabled={uploading} onChange={handleUpload} />
    </label>
  );
}