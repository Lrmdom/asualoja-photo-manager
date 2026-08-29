import chokidar from "chokidar";
import db from "../lib/db.ts";
import crypto from "crypto";

const WATCH_DIR = process.env.WATCH_DIR || "./estudio_fotos";

const watcher = chokidar.watch(WATCH_DIR, {
  ignored: /(^|[\/\\])\../,
  persistent: true,
  awaitWriteFinish: {
    stabilityThreshold: 2000,
    pollInterval: 100,
  },
});

watcher.on("add", (filePath) => {
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
});

console.log(`Watching for new files in: ${WATCH_DIR}`);
