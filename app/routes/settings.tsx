import { Form, redirect, useLoaderData } from "react-router";
import db from "../db.server";

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
    <div className="p-8 bg-slate-900 min-h-screen text-slate-100">
      <h1 className="text-3xl font-bold mb-6">Configurações</h1>
      <Form method="post" className="bg-slate-800 p-6 rounded-lg max-w-md">
        <label className="block mb-4">
          Pasta de Fotos:
          <input type="text" name="path" className="w-full bg-slate-700 p-2 mt-1" defaultValue={settings.path || "photos"} />
        </label>
        <label className="block mb-4">
          Pasta de Quarentena:
          <input type="text" name="quarantine_path" className="w-full bg-slate-700 p-2 mt-1" defaultValue={settings.quarantine_path || "quarantine"} />
        </label>
        <button type="submit" className="bg-blue-600 px-4 py-2 rounded">Salvar</button>
      </Form>
    </div>
  );
}
