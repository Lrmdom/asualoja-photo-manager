import { json } from "react-router";

export async function loader() {
  return json({
    sanity: true,
    cloudinary: true,
    worker: true,
    dir: true
  });
}
