import { createPool } from "@freecity/district-runtime";

import { buildServer } from "./server.js";

const databaseUrl = process.env["DATABASE_URL"];
if (!databaseUrl) {
  console.error("DATABASE_URL is required");
  process.exit(1);
}

const authMode = process.env["AUTH_MODE"] === "production" ? "production" : "dev";
const port = Number(process.env["PORT"] ?? 3001);

const app = await buildServer({
  pool: createPool(databaseUrl),
  config: { districtId: "district-zero", seasonId: "season-0" },
  authMode,
});

await app.listen({ port, host: "0.0.0.0" });
console.log(`application-api listening on :${port} (auth mode: ${authMode})`);
