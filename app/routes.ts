import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("settings", "routes/settings.tsx"),
  route("api/health", "routes/api.health.ts"),
  route("api/logs", "routes/api.logs.ts"),
  route("api/upload-photo", "routes/api.upload-photo.ts"),
] satisfies RouteConfig;
