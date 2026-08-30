import { env } from "../env.server";
import fs from "fs";
import db from "../db.server";
import path from "path";

export async function loader() {
  const pathSetting = db.prepare("SELECT value FROM studio_settings WHERE key = 'path'").get() as { value: string } | undefined;
  const watchPath = path.resolve(process.cwd(), pathSetting?.value || "photos");
  
  const health = {
    sanity: !!env.SANITY_PROJECT_ID,
    cloudinary: !!env.CLOUDINARY_CLOUD_NAME,
    worker: true, 
    storage_folder: fs.existsSync(watchPath),
  };
  
  return Response.json(health);
}
