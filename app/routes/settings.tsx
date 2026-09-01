import { Form, useLoaderData, Link, useActionData } from "react-router";
import { useEffect } from "react";
import { useEventSource } from "remix-utils/sse/react";
import { toast } from "sonner";
import { Settings as SettingsIcon, Database, Folder, Tag, FileText, Save, ArrowLeft } from "lucide-react";
import db from "../db.server";
import { Button } from "../../components/ui/button";

export async function loader() {
  const settings = db.prepare("SELECT * FROM studio_settings").all() as { key: string; value: string }[];
  return Object.fromEntries(settings.map(s => [s.key, s.value]));
}

export async function action({ request }: { request: Request }) {
  const formData = await request.formData();
  const settings = Object.fromEntries(formData);
  
  // Ensure checkbox values are explicitly set
  const finalSettings = {
    ...settings,
    bg_removal: formData.has("bg_removal") ? "true" : "false"
  };
  
  const stmt = db.prepare("INSERT OR REPLACE INTO studio_settings (key, value) VALUES (?, ?)");
  const transaction = db.transaction((data) => {
    for (const [key, value] of Object.entries(data)) {
      stmt.run(key, value);
    }
  });
  
  transaction(finalSettings);
  return { success: true };
}

export default function Settings() {
  const settings = useLoaderData<typeof loader>();
  const actionData = useActionData<{ success?: boolean }>();
  const logs = useEventSource("/api/logs", { event: "message" });
  const parsedLogs = logs ? JSON.parse(logs) : [];

  useEffect(() => {
    if (actionData?.success) {
      toast.success("Configurações salvas com sucesso!");
    }
  }, [actionData]);
  
  return (
    <div className="p-4 md:p-8 bg-slate-50 min-h-screen text-slate-900">
      <div className="flex items-center gap-4 mb-8">
        <Button asChild variant="ghost" size="sm" className="gap-2">
          <Link to="/"><ArrowLeft className="h-4 w-4" /> Voltar</Link>
        </Button>
        <h1 className="text-3xl font-extrabold tracking-tight">Configurações e Logs</h1>
      </div>
      
      <div className="grid lg:grid-cols-2 gap-8">
        <Form method="post" className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm h-fit">
          <div className="flex items-center gap-3 mb-6">
             <div className="p-2 bg-slate-100 rounded-lg text-slate-600">
                <SettingsIcon className="h-6 w-6" />
             </div>
             <h2 className="text-xl font-bold">Configurações do Estúdio</h2>
          </div>

          <div className="space-y-5">
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                <Folder className="h-4 w-4 text-slate-400" /> Pasta de Fotos:
              </label>
              <input type="text" name="path" className="w-full bg-slate-50 border border-slate-300 p-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500" defaultValue={settings.path || "photos"} />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                <Folder className="h-4 w-4 text-slate-400" /> Pasta de Quarentena:
              </label>
              <input type="text" name="quarantine_path" className="w-full bg-slate-50 border border-slate-300 p-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500" defaultValue={settings.quarantine_path || "quarantine"} />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                <Database className="h-4 w-4 text-slate-400" /> Pasta Cloudinary:
              </label>
              <input type="text" name="cloudinary_folder" className="w-full bg-slate-50 border border-slate-300 p-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500" defaultValue={settings.cloudinary_folder || "ecommerce_photos"} />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                <Tag className="h-4 w-4 text-slate-400" /> Brand Slug:
              </label>
              <input type="text" name="brand_slug" className="w-full bg-slate-50 border border-slate-300 p-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500" defaultValue={settings.brand_slug || ""} />
            </div>
            <div className="space-y-4 border-t pt-4 mt-4">
              <h3 className="font-semibold text-slate-800">Processamento de Imagem</h3>
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-slate-700">Largura Máxima (px):</label>
                <input type="number" name="max_width" className="w-full bg-slate-50 border border-slate-300 p-2.5 rounded-lg" defaultValue={settings.max_width || "1200"} />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-slate-700">Qualidade:</label>
                <select name="image_quality" className="w-full bg-slate-50 border border-slate-300 p-2.5 rounded-lg" defaultValue={settings.image_quality || "auto"}>
                  <option value="auto">Automática</option>
                  <option value="80">80%</option>
                  <option value="90">90%</option>
                </select>
              </div>
            </div>

            <div className="space-y-1.5 flex items-center justify-between border-t pt-4 mt-2">
              <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                <SettingsIcon className="h-4 w-4 text-slate-400" /> Remover Fundo (AI)
              </label>
              <input 
                type="checkbox" 
                name="bg_removal" 
                className="w-5 h-5 accent-sky-600 cursor-pointer" 
                defaultChecked={settings.bg_removal === "true"} 
              />
            </div>
            <Button type="submit" className="w-full gap-2 mt-4">
                <Save className="h-4 w-4" /> Salvar Alterações
            </Button>
          </div>
        </Form>

        <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm">
          <div className="flex items-center gap-3 mb-6">
             <div className="p-2 bg-slate-100 rounded-lg text-slate-600">
                <FileText className="h-6 w-6" />
             </div>
             <h2 className="text-xl font-bold">Logs do Sistema</h2>
          </div>
          <div className="h-[400px] overflow-y-auto font-mono text-xs bg-slate-950 p-4 rounded-xl text-slate-300 scrollbar-thin scrollbar-thumb-slate-700">
            {parsedLogs.length === 0 && (
              <div className="text-slate-500 italic">À espera de registos...</div>
            )}
            {parsedLogs.map((log: any) => (
              <div key={log.id} className="mb-1 border-b border-slate-800 py-1 flex gap-2">
                <span className="text-slate-600 shrink-0">[{log.timestamp}]</span>
                <span className="text-slate-200 break-all">{log.mensagem}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
