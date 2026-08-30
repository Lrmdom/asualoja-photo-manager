import chokidar from "chokidar";
import db from "../lib/db.ts";
import crypto from "crypto";
import { sanityClient } from "../app/sanity.server.ts";
import { cloudinary } from "../app/cloudinary.server.ts";

export async function processQueue() {
  const item = db.prepare("SELECT * FROM upload_queue WHERE estado = 'Pendente' OR estado = 'Falhou' LIMIT 1").get() as any;
  if (!item) return;

  console.log(`Processing: ${item.caminho_local}`);
  
  try {
    db.prepare("UPDATE upload_queue SET estado = 'Em Upload' WHERE id = ?").run(item.id);

    // Upload to Cloudinary
    const result = await cloudinary.uploader.upload(item.caminho_local, {
      folder: "ecommerce_photos",
    });

    // Update Sanity (Placeholder logic - need session mapping)
    // For now, simple patch to a document
    await sanityClient.patch("product-placeholder").setIfMissing({ images: [] }).insert("after", "images[-1]", [{
      _type: "image",
      url: result.secure_url,
      publicId: result.public_id,
      uploadedAt: new Date().toISOString(),
    }]).commit();

    db.prepare("UPDATE upload_queue SET estado = 'Concluído' WHERE id = ?").run(item.id);
    console.log(`Uploaded: ${result.secure_url}`);
  } catch (error) {
    console.error("Upload failed:", error);
    db.prepare("UPDATE upload_queue SET estado = 'Falhou', tentativas = tentativas + 1 WHERE id = ?").run(item.id);
  }
}

export function handleFileAdded(filePath: string) {
  console.log(`New file detected: ${filePath}`);

  try {
    const id = crypto.randomUUID();
    
    // Add to queue
    const stmt = db.prepare(
      "INSERT INTO upload_queue (id, caminho_local, estado) VALUES (?, ?, ?)"
    );
    stmt.run(id, filePath, "Pendente");

    // Log
    const logStmt = db.prepare(
      "INSERT INTO system_logs (timestamp, nivel, mensagem) VALUES (?, ?, ?)"
    );
    logStmt.run(new Date().toISOString(), "info", `Ficheiro detetado: ${filePath}`);

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

export async function processQueue() {
  const stmt = db.prepare("SELECT * FROM upload_queue WHERE estado = 'Pendente' LIMIT 1");
  const task = stmt.get();

  if (task) {
    console.log(`Processing task: ${task.id}`);
    
    // Update state to 'Em Upload'
    db.prepare("UPDATE upload_queue SET estado = 'Em Upload' WHERE id = ?").run(task.id);

    // TODO: Implement Cloudinary + Sanity logic
    
    // For now, mark as Concluido
    db.prepare("UPDATE upload_queue SET estado = 'Concluido' WHERE id = ?").run(task.id);
    console.log(`Task ${task.id} completed.`);
  }
}

// Start processing loop
setInterval(processQueue, 5000);
