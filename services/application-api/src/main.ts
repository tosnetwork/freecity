import { createPool } from "@freecity/district-runtime";

import { buildServer } from "./server.js";

const databaseUrl = process.env["DATABASE_URL"];
if (!databaseUrl) {
  console.error("DATABASE_URL is required");
  process.exit(1);
}

const authMode = process.env["AUTH_MODE"] === "production" ? "production" : "dev";
const port = Number(process.env["PORT"] ?? 3001);

const enableTestControls = process.env["FREECITY_TEST_CONTROLS"] === "1";
const testControlKey = process.env["FREECITY_TEST_CONTROL_KEY"];
if (enableTestControls && !testControlKey) {
  console.error("FREECITY_TEST_CONTROLS=1 requires FREECITY_TEST_CONTROL_KEY");
  process.exit(1);
}

const app = await buildServer({
  pool: createPool(databaseUrl),
  config: {
    districtId: process.env["FREECITY_DISTRICT_ID"] ?? "district-zero",
    seasonId: process.env["FREECITY_SEASON_ID"] ?? "season-0",
  },
  authMode,
  webOrigin: process.env["FREECITY_WEB_ORIGIN"] ?? "http://localhost:3000",
  enableTestControls,
  ...(testControlKey ? { testControlKey } : {}),
});

await app.listen({ port, host: "0.0.0.0" });
console.log(`application-api listening on :${port} (auth mode: ${authMode})`);
