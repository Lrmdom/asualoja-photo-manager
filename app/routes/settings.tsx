import { Form, redirect } from "react-router";

export async function action({ request }: { request: Request }) {
  const formData = await request.formData();
  // Simplified config saving
  console.log("Saving config:", Object.fromEntries(formData));
  return redirect("/settings");
}

export default function Settings() {
  return (
    <div className="p-8 bg-slate-900 min-h-screen text-slate-100">
      <h1 className="text-3xl font-bold mb-6">Configurações</h1>
      <Form method="post" className="bg-slate-800 p-6 rounded-lg max-w-md">
        <label className="block mb-4">
          Pasta de Fotos:
          <input type="text" name="path" className="w-full bg-slate-700 p-2 mt-1" defaultValue="/Estúdio/NovasFotos" />
        </label>
        <button type="submit" className="bg-blue-600 px-4 py-2 rounded">Salvar</button>
      </Form>
    </div>
  );
}
