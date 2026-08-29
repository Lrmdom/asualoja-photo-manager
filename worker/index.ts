import chokidar from "chokidar";
import db from "../lib/db.ts";
import crypto from "crypto";

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
  console.log(`Watching for new files in: ${watchDir}`);
  return watcher;
}

// Simple check for main execution in ESM
const isMain = import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
  const WATCH_DIR = process.env.WATCH_DIR || "./estudio_fotos";
  startWatcher(WATCH_DIR);
}
