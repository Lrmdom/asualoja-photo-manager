import fs from "fs/promises";
import path from "path";
import crypto from "crypto";
import db from "../../lib/db";

const TMP_DIR = path.join(process.cwd(), "tmp-uploads");

function getFinalDir() {
  const row = db.prepare("SELECT value FROM studio_settings WHERE key = 'path'").get() as { value: string } | undefined;
  return row ? path.resolve(row.value) : path.join(process.cwd(), "photos");
}

export async function action({ request }: { request: Request }) {
  try {
    const FINAL_DIR = getFinalDir();
    await fs.mkdir(TMP_DIR, { recursive: true });
    await fs.mkdir(FINAL_DIR, { recursive: true });

    // Web API standard parsing
    const formData = await request.formData();
    const file = formData.get("photo") as File | null;
    const sku = formData.get("sku") as string | null;
    const sessionId = formData.get("sessionId") as string | null;

    if (!file || !sku || !sessionId || !(file instanceof File)) {
      return new Response(JSON.stringify({ error: "Dados incompletos" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    const timestamp = Date.now();
    const randomHex = crypto.randomBytes(4).toString("hex");
    const newFilename = `${sku}_${timestamp}_${randomHex}.jpg`;

    const tmpPath = path.join(TMP_DIR, `tmp_${newFilename}`);
    const finalPath = path.join(FINAL_DIR, newFilename);

    // Converter o File recebido para Buffer e gravar temporariamente
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    await fs.writeFile(tmpPath, buffer);

    // Mover atomicamente para a pasta final do worker
    await fs.rename(tmpPath, finalPath);

    return new Response(JSON.stringify({ success: true, filename: newFilename }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  } catch (error) {
    console.error("Erro no upload:", error);
    return new Response(JSON.stringify({ error: "Falha ao processar upload" }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}