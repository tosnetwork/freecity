/**
 * Replay verification CLI (release gate):
 *
 *   pnpm replay --district district-zero --season season-0 [--snapshot <id>]
 *
 * Exit code 0 on checksum match, 1 on divergence.
 */
import { createPool } from "../src/db.js";
import { replayDistrict } from "../src/replay.js";

function arg(name: string): string | undefined {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

const districtId = arg("district");
const seasonId = arg("season");
const snapshot = arg("snapshot");

if (!districtId || !seasonId) {
  console.error("usage: replay-cli --district <id> --season <id> [--snapshot <snapshotId>]");
  process.exit(2);
}

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("DATABASE_URL is required");
  process.exit(2);
}

const pool = createPool(databaseUrl);
const report = await replayDistrict(pool, districtId, seasonId, {
  ...(snapshot ? { fromSnapshotId: Number(snapshot) } : {}),
});
await pool.end();

console.log(JSON.stringify(report, null, 2));
if (!report.match) {
  console.error("REPLAY DIVERGENCE — release blocker");
  process.exit(1);
}
