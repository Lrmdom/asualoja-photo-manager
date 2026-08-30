import { Form, redirect, useLoaderData, Link } from "react-router";
import db from "../db.server";
import { Button } from "../../components/ui/button";

export async function loader() {
  const settings = db.prepare("SELECT * FROM studio_settings").all() as { key: string; value: string }[];
  return Object.fromEntries(settings.map(s => [s.key, s.value]));
}

export async function action({ request }: { request: Request }) {
  const formData = await request.formData();
  const settings = Object.fromEntries(formData);
  
  const stmt = db.prepare("INSERT OR REPLACE INTO studio_settings (key, value) VALUES (?, ?)");
  const transaction = db.transaction((data) => {
    for (const [key, value] of Object.entries(data)) {
      stmt.run(key, value);
    }
  });
  
  transaction(settings);
  return redirect("/settings");
}

export default function Settings() {
  const settings = useLoaderData<typeof loader>();
  
  return (
    <div className="p-4 md:p-8 bg-background min-h-screen text-foreground">
      <div className="flex items-center gap-4 mb-6">
        <Button asChild variant="outline" size="sm">
          <Link to="/">Voltar</Link>
        </Button>
        <h1 className="text-3xl font-bold">Configurações</h1>
      </div>
      
      <Form method="post" className="bg-card border border-border p-6 rounded-lg max-w-md shadow-sm">
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">Pasta de Fotos:</label>
            <input type="text" name="path" className="w-full bg-background border border-input p-2 mt-1 rounded-md focus:outline-none focus:ring-2 focus:ring-ring" defaultValue={settings.path || "photos"} />
          </div>
          <div>
            <label className="text-sm font-medium">Pasta de Quarentena:</label>
            <input type="text" name="quarantine_path" className="w-full bg-background border border-input p-2 mt-1 rounded-md focus:outline-none focus:ring-2 focus:ring-ring" defaultValue={settings.quarantine_path || "quarantine"} />
          </div>
          <Button type="submit">Salvar Alterações</Button>
        </div>
      </Form>
    </div>
  );
}
