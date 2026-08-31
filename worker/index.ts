import "dotenv/config";
import chokidar from "chokidar";
import db from "../lib/db";
import crypto from "crypto";
import fs from "fs";
import path from "path";
import { sanityClient } from "../app/sanity.server";
import { cloudinary } from "../app/cloudinary.server";

const MAX_RETRIES = 3;

// ... (resto do código igual) ...
import url from "url";

// ... (imports) ...

// Corrigir verificação de ESM para execução direta
if (import.meta.url === url.pathToFileURL(process.argv[1]).href) {
  const watchDir = db.prepare("SELECT value FROM studio_settings WHERE key = 'path'").get() as { value: string };
  if (watchDir) {
    startWatcher(watchDir.value);
  } else {
    console.error("Caminho monitorizado não configurado na DB.");
  }
}

export async function processQueue() {
  const stmt = db.prepare(`
    SELECT q.*, s.sku 
    FROM upload_queue q 
    JOIN sessions s ON q.sessao_id = s.id 
    WHERE (q.estado = 'Pendente' OR q.estado = 'Falhou')
    AND (q.tentativas < ?)
    ORDER BY q.tentativas ASC
    LIMIT 1
  `);
  const item = stmt.get(MAX_RETRIES) as any;

  if (!item) return;

  console.log(`Processing: ${item.caminho_local} (Attempt: ${item.tentativas + 1})`);
  
  try {
    db.prepare("UPDATE upload_queue SET estado = 'Em Upload' WHERE id = ?").run(item.id);

    // Upload to Cloudinary
    const result = await cloudinary.uploader.upload(item.caminho_local, {
      folder: "ecommerce_photos",
    });

    // Patch Sanity
    await sanityClient
      .fetch(`*[_type == "variant" && sku == $sku][0]`, { sku: item.sku })
      .then((variant) => {
        if (!variant) throw new Error(`Variant not found: ${item.sku}`);
        return sanityClient
          .patch(variant._id)
          .setIfMissing({ cloudinaryList: [] })
          .append("cloudinaryList", [
            {
              _key: crypto.randomUUID(),
              _type: "cloudinary.asset",
              public_id: result.public_id,
              resource_type: result.resource_type || "image",
              type: result.type || "upload",
              format: result.format,
              version: result.version,
              url: result.url,
              secure_url: result.secure_url,
              width: result.width,
              height: result.height,
              bytes: result.bytes,
              created_at: result.created_at || new Date().toISOString(),
              raw: result,
            }
          ])
          .commit({ autoGenerateArrayKeys: true });
      });

    db.prepare("UPDATE upload_queue SET estado = 'Concluído' WHERE id = ?").run(item.id);
    console.log(result);
    console.log(`Uploaded and patched: ${result.secure_url}`);
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Unknown error";
    console.error("Upload/Patch failed:", errorMsg);
    
    const newTentativas = item.tentativas + 1;
    
    if (newTentativas >= MAX_RETRIES) {
      // Quarantine
      const quarantineDir = db.prepare("SELECT value FROM studio_settings WHERE key = 'quarantine_path'").get() as { value: string } | undefined;
      const destDir = path.resolve(quarantineDir?.value || "quarantine");
      
      // Criar diretório se não existir
      if (!fs.existsSync(destDir)) {
        fs.mkdirSync(destDir, { recursive: true });
      }
      
      const destPath = path.join(destDir, path.basename(item.caminho_local));
      
      // Verificar se o ficheiro existe antes de mover
      if (fs.existsSync(item.caminho_local)) {
        fs.renameSync(item.caminho_local, destPath);
        console.log(`Ficheiro movido para quarentena: ${destPath}`);
      }
      
      db.prepare("UPDATE upload_queue SET estado = 'Falhou', tentativas = ?, erro_mensagem = ? WHERE id = ?")
        .run(newTentativas, `Max retries reached. Moved to ${destPath}`, item.id);
    } else {
      db.prepare("UPDATE upload_queue SET estado = 'Falhou', tentativas = ?, erro_mensagem = ? WHERE id = ?")
        .run(newTentativas, errorMsg, item.id);
    }
  }
}

export function handleFileAdded(filePath: string) {
  console.log(`New file detected: ${filePath}`);

  try {
    const sessaoAtiva = db.prepare("SELECT id FROM sessions WHERE estado = 'Ativa' LIMIT 1").get() as { id: string } | undefined;
    if (!sessaoAtiva) {
      console.warn("Nenhuma sessão ativa encontrada. Ficheiro ignorado.");
      return;
    }

    const id = crypto.randomUUID();
    
    // Add to queue with sessao_id
    const stmt = db.prepare(
      "INSERT INTO upload_queue (id, caminho_local, estado, sessao_id) VALUES (?, ?, ?, ?)"
    );
    stmt.run(id, filePath, "Pendente", sessaoAtiva.id);

    // Log
    const logStmt = db.prepare(
      "INSERT INTO system_logs (timestamp, nivel, mensagem, sessao_id) VALUES (?, ?, ?, ?)"
    );
    logStmt.run(new Date().toISOString(), "info", `Ficheiro detetado e associado: ${filePath}`, sessaoAtiva.id);

  } catch (error) {
    console.error("Error processing file:", error);
  }
}

export function startWatcher(watchDir: string) {
  const watcher = chokidar.watch(watchDir, {
    ignored: /(^|[\/\\])\../,
    persistent: true,
    awaitWriteFinish: {
      stabilityThreshold: 2000,
      pollInterval: 100,
    },
  });

  watcher.on("add", handleFileAdded);
  
  // Periodically process queue
  setInterval(processQueue, 5000);

  console.log(`Watching for new files in: ${watchDir}`);
  return watcher;
}
