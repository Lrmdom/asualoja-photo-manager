import { useState, useMemo, useRef, useEffect } from "react";
import { useLoaderData, Form, redirect, Link, useSubmit } from "react-router";
import { toast } from "sonner";
import { LayoutGrid, Settings, AlertTriangle, Camera, StopCircle, RefreshCcw, Search, FolderOpen, Upload } from "lucide-react";
import db from "../db.server";
import { sanityClient } from "../sanity.server";
import { cloudinary } from "../cloudinary.server";
import { defineQuery } from "groq";
import { Button } from "../../components/ui/button";
import { cn } from "../../lib/utils";
import { PhotoManagerModal } from "../../components/PhotoManagerModal";

const TAXONS_QUERY = defineQuery(/* groq */ `*[_type == "brand" && slug.current == $brand][0]{
  _id,
  name,
  slug,
  "taxonomies": *[_type == "taxonomy" && references(^._id)]{
    _id,
    name,
    slug,
    "taxons": coalesce(
      taxons[]->{
        _id,
        name,
        "products": coalesce(products[]->{
          _id,
          "sku": code,
          name,
          "variantes": variants[]->{
            _id,
            name,
            sku,
            cloudinaryList
          }
        }, [])
      },
      *[_type == "taxon" && taxonomy._ref == ^._id]{
        _id,
        name,
        "products": coalesce(products[]->{
          _id,
          "sku": code,
          name,
          "variantes": variants[]->{
            _id,
            name,
            sku,
            cloudinaryList
          }
        }, [])
      },
      []
    )
  }
}`);

export async function loader() {
  const brandSetting = db.prepare("SELECT value FROM studio_settings WHERE key = 'brand_slug'").get() as { value: string } | undefined;
  const brand = brandSetting?.value || "corvo";

  const brandData = await sanityClient.fetch(TAXONS_QUERY, { brand });
  const taxonomies = brandData?.taxonomies || [];

  const brandProductsQuery = defineQuery(/* groq */ `*[_type == "product" && (
    references(*[_type == "taxon" && taxonomy->brand->slug.current == $brand]._id) ||
    references(*[_type == "taxonomy" && brand->slug.current == $brand]._id)
  )]{
    _id,
    "sku": code,
    name,
    "variantes": variants[]->{
      _id,
      name,
      sku,
      cloudinaryList
    }
  }`);

  const allProducts = await sanityClient.fetch(brandProductsQuery, { brand });

  const productsWithTaxons = new Set(
    taxonomies.flatMap((t: any) =>
      (t.taxons || []).flatMap((tx: any) =>
        (tx.products || []).map((p: any) => p._id)
      )
    )
  );

  const uncategorizedProducts = (allProducts || []).filter((p: any) => !productsWithTaxons.has(p._id));

  const sessions = db.prepare("SELECT * FROM sessions WHERE estado != 'Terminada'").all();
  const quarentena = db.prepare("SELECT * FROM upload_queue WHERE estado = 'Falhou'").all();

  return { taxonomies, uncategorizedProducts, sessions, quarentena };
}

export async function action({ request }: { request: Request }) {
  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent === "start") {
    const activeSessions = db.prepare("SELECT COUNT(*) as count FROM sessions WHERE estado = 'Ativa'").get() as { count: number };
    if (activeSessions.count > 0) {
      return { error: "Já existe uma sessão ativa." };
    }
    const sku = formData.get("sku") as string;
    const variante = formData.get("variante") as string;
    db.prepare("INSERT INTO sessions (id, sku, variante_nome, data_inicio, estado) VALUES (?, ?, ?, ?, ?)")
      .run(crypto.randomUUID(), sku, variante, new Date().toISOString(), "Ativa");
  } else if (intent === "stop") {
    db.prepare("UPDATE sessions SET estado = 'Terminada' WHERE id = ?").run(formData.get("id"));
  } else if (intent === "reprocess") {
    db.prepare("UPDATE upload_queue SET estado = 'Pendente', tentativas = 0, erro_mensagem = NULL WHERE id = ?").run(formData.get("id"));
  } else if (intent === "delete-photo") {
    const variantId = formData.get("variantId") as string;
    const key = formData.get("key") as string;
    const public_id = formData.get("public_id") as string;
    await sanityClient.patch(variantId).unset([`cloudinaryList[_key=="${key}"]`]).commit();
    await cloudinary.uploader.destroy(public_id);
    return redirect("/");
  } else if (intent === "reorder-photos") {
    const variantId = formData.get("variantId") as string;
    const order = JSON.parse(formData.get("order") as string);
    await sanityClient.patch(variantId).set({ cloudinaryList: order }).commit();
    return redirect("/");
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
          <mark key={index} className="bg-sky-200 text-sky-900 rounded-sm px-0.5">{part}</mark>
        ) : (
          part
        )
      )}
    </>
  );
}

export default function Home() {
  const { taxonomies, uncategorizedProducts, sessions, quarentena } = useLoaderData<typeof loader>();
  const [selectedVariant, setSelectedVariant] = useState<any>(null);
  const [filter, setFilter] = useState("");
  const sessionRef = useRef<HTMLDivElement>(null);

  const groupedProducts = useMemo(() => {
    const filterLower = filter.toLowerCase();
    const filterProducts = (products: any[]) =>
      (products || []).filter((p: any) =>
        (p.sku?.toLowerCase() || "").includes(filterLower) ||
        (p.name?.toLowerCase() || "").includes(filterLower) ||
        p.variantes?.some((v: any) =>
          (v.sku?.toLowerCase() || "").includes(filterLower) ||
          (v.name?.toLowerCase() || "").includes(filterLower)
        )
      );

    const tree: Record<string, Record<string, any[]>> = {};

    (taxonomies || []).forEach((taxonomy: any) => {
      const taxonomyName = taxonomy.name || "Sem Taxonomia";
      if (!tree[taxonomyName]) tree[taxonomyName] = {};
      (taxonomy.taxons || []).forEach((taxon: any) => {
        const taxonName = taxon.name || "Geral";
        const filteredProds = filterProducts(taxon.products || []);
        if (filteredProds.length > 0 || filter.length === 0) {
          tree[taxonomyName][taxonName] = filteredProds;
        }
      });
    });

    const uncategorized = filterProducts(uncategorizedProducts || []);
    if (uncategorized.length > 0) {
      if (!tree["Sem Categoria"]) tree["Sem Categoria"] = {};
      tree["Sem Categoria"]["Geral"] = uncategorized;
    }
    return tree;
  }, [taxonomies, uncategorizedProducts, filter]);

  const handleStartSession = (e: React.FormEvent, sku: string) => {
    if (sessions.length > 0) {
      e.preventDefault();
      toast.error(`Sessão ativa para ${sessions[0].sku}. Termine-a primeiro.`);
      sessionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  return (
    <div className="p-4 md:p-8 bg-slate-50 min-h-screen text-slate-900">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 flex items-center gap-3">
          <LayoutGrid className="h-8 w-8 text-sky-600" />
          Dashboard de Estúdio
        </h1>
        <Button asChild variant="outline" className="gap-2">
          <Link to="/settings"><Settings className="h-4 w-4" /> Configurações</Link>
        </Button>
      </div>

      {sessions.length > 0 && (
        <div ref={sessionRef} className="sticky top-4 z-40 mb-8 bg-slate-900 text-white shadow-2xl p-6 rounded-2xl flex flex-col md:flex-row justify-between items-center gap-4 border-l-4 border-amber-500">
          <div className="flex items-center gap-4">
            <div className="bg-amber-500/20 p-3 rounded-xl"><Camera className="h-6 w-6 text-amber-400" /></div>
            <div>
                <h2 className="font-bold text-lg text-slate-100">Sessão Fotográfica Ativa</h2>
                <a 
                    href={`#sku-${sessions[0].sku}`}
                    onClick={(e) => {
                        e.preventDefault();
                        // 1. Clear any filters to ensure element isn't hidden
                        setFilter("");
                        
                        // 2. Wait a moment for UI to render if filter was active
                        setTimeout(() => {
                            const element = document.getElementById(`sku-${sessions[0].sku}`);
                            if (element) {
                                // 3. Expand all parent details elements
                                let parent = element.parentElement;
                                while (parent) {
                                    if (parent.tagName === 'DETAILS') {
                                        (parent as HTMLDetailsElement).open = true;
                                    }
                                    parent = parent.parentElement;
                                }
                                // 4. Scroll into view
                                element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                // 5. Visual highlight effect
                                element.classList.add('ring-2', 'ring-amber-500');
                                setTimeout(() => element.classList.remove('ring-2', 'ring-amber-500'), 2000);
                            } else {
                                toast.error("Produto não encontrado no catálogo.");
                            }
                        }, 100);
                    }}
                    className="text-amber-300 font-mono font-bold text-xl tracking-wider hover:underline cursor-pointer"
                >
                    {sessions[0].sku}
                </a>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <UploadCamera sessionId={sessions[0].id} sku={sessions[0].sku} />
            <Form method="post" className="flex items-center gap-2">
                <input type="hidden" name="id" value={sessions[0].id} />
                <Button type="submit" name="intent" value="stop" variant="outline" className="gap-2 bg-transparent border-red-500 text-red-500 hover:bg-red-500 hover:text-white transition-all duration-300 hover:scale-105 active:scale-95">
                    <StopCircle className="h-4 w-4" /> Terminar Sessão
                </Button>
            </Form>
          </div>
        </div>
      )}

      <div className="relative mb-8">
        <Search className="absolute left-3 top-3.5 h-5 w-5 text-slate-400" />
        <input
          type="text"
          placeholder="Filtrar por SKU ou Nome..."
          className="w-full bg-white border border-slate-200 p-3 pl-10 rounded-2xl shadow-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
        {filter && (
          <button
            onClick={() => setFilter("")}
            className="absolute right-4 top-3.5 text-slate-400 hover:text-slate-600"
          >
            ✕
          </button>
        )}
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <h2 className="text-xl font-bold text-slate-800">Catálogo</h2>
          <div className="space-y-6">
            {Object.entries(groupedProducts).map(([taxonomyName, taxonsGroup]: [string, any]) => (
              <div key={taxonomyName} className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-sm">
                <div className="bg-slate-50 px-5 py-4 border-b border-slate-200 flex justify-between items-center">
                  <h3 className="font-bold text-slate-800 uppercase text-xs tracking-widest flex items-center gap-2">
                    <FolderOpen className="h-4 w-4 text-sky-600" /> {taxonomyName}
                  </h3>
                </div>
                <div className="divide-y divide-slate-100">
                  {Object.entries(taxonsGroup).map(([taxonName, products]: [string, any]) => (
                    <details key={taxonName} className="group" open>
                      <summary className="px-5 py-3 cursor-pointer hover:bg-slate-50 flex justify-between items-center text-slate-700 font-semibold text-sm list-none">
                        <span className="flex items-center gap-2 text-slate-600">
                            <span className="group-open:rotate-90 transition-transform text-[10px] text-slate-400">▶</span>
                            {taxonName}
                        </span>
                        <span className="text-xs bg-slate-100 px-2 py-0.5 rounded-full text-slate-500">{products.length}</span>
                      </summary>
                      <div className="px-5 pb-4 pt-1 bg-white grid md:grid-cols-2 gap-3">
                        {products.map((p: any) => {
                          const hasActiveVariant = p.variantes?.some((v: any) => sessions.some((s: any) => s.sku === v.sku));
                          return (
                           <div key={p._id} className={cn("border border-slate-100 rounded-xl p-3 bg-slate-50/50 hover:border-slate-200 transition-all flex flex-col gap-2", hasActiveVariant && "ring-1 ring-sky-500 bg-sky-50/30")}>
                                <div className="flex justify-between items-start gap-2">
                                    <span className="text-sm font-semibold text-slate-900 leading-tight">
                                      <Highlight text={p.name || ""} query={filter} />
                                    </span>
                                    <span className="text-xs text-slate-500 whitespace-nowrap">({p.variantes?.length || 0} var)</span>
                                </div>
                                <span className="font-mono text-[10px] font-medium text-slate-500 bg-slate-100 px-1.5 py-0 rounded w-fit">
                                  <Highlight text={p.sku || ""} query={filter} />
                                </span>
                                <div className="flex flex-col gap-2 mt-1">
                                    {p.variantes?.map((v: any) => {
                                        const isActive = sessions.some((s: any) => s.sku === v.sku);
                                        const photoCount = v.cloudinaryList?.length || 0;
                                        return (
                                          <div id={`sku-${v.sku}`} key={v.sku} className="flex justify-between items-center bg-white border border-slate-200 px-2 py-1.5 rounded-lg hover:border-sky-300">
                                            <div className="flex flex-col truncate mr-2">
                                                <span className="text-[10px] font-mono text-slate-400">
                                                  <Highlight text={v.sku || ""} query={filter} />
                                                </span>
                                                <span className="text-xs font-medium text-slate-700 truncate">
                                                  <Highlight text={v.name || ""} query={filter} />
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-2 shrink-0">
                                                <button onClick={() => setSelectedVariant(v)} className="text-[10px] flex items-center gap-1 text-slate-500 hover:text-sky-600">
                                                    📷 {photoCount}
                                                </button>
                                                {isActive ? (
                                                  <div className="text-[10px] bg-sky-100 text-sky-800 border border-sky-200 px-2 py-1 rounded-md font-bold">
                                                      Ativo
                                                  </div>
                                                ) : (
                                                  <Form method="post" onSubmit={(e) => handleStartSession(e, v.sku)}>
                                                    <input type="hidden" name="sku" value={v.sku} />
                                                    <input type="hidden" name="variante" value={v.name} />
                                                    <button type="submit" name="intent" value="start" className="text-[10px] bg-slate-100 px-2 py-1 rounded-md hover:bg-slate-200">
                                                        Iniciar
                                                    </button>
                                                  </Form>
                                                )}
                                            </div>
                                          </div>
                                        );
                                    })}
                                </div>
                           </div>
                          );
                        })}
                      </div>
                    </details>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm h-fit">
             <h2 className="text-xl font-bold mb-4 text-slate-800 flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-500" /> Falhas ({quarentena.length})
             </h2>
             <div className="space-y-2">
              {quarentena.map((q: any) => (
                <div key={q.id} className="flex justify-between items-center p-3 bg-red-50 border border-red-100 rounded-xl text-sm">
                  <span className="text-red-700 truncate font-medium">{q.caminho_local.split('/').pop()}</span>
                  <Form method="post">
                    <input type="hidden" name="id" value={q.id} />
                    <Button type="submit" name="intent" value="reprocess" size="sm" variant="ghost" className="text-red-700 hover:bg-red-100">
                      <RefreshCcw className="h-4 w-4" />
                    </Button>
                  </Form>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {selectedVariant && (
        <PhotoManagerModal variant={selectedVariant} onClose={() => setSelectedVariant(null)} />
      )}
    </div>
  );
}

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
    <label className={cn("cursor-pointer bg-amber-500/20 p-3 rounded-xl transition-colors hover:bg-amber-500/30")}>
      <Camera className="h-6 w-6 text-amber-400" />
      <input type="file" accept="image/*" capture="environment" className="hidden" disabled={uploading} onChange={handleUpload} />
    </label>
  );
}