import { randomUUID } from "node:crypto";

import type { DistrictCommand, DistrictCommandEnvelope, Role } from "@freecity/contracts";
import {
  enqueueCommand,
  initDistrict,
  processDistrict,
  withTransaction,
  type Pool,
} from "@freecity/district-runtime";

import { AUTHORED_CARDS } from "./authored-cards.js";

export interface SeasonConfig {
  districtId: string;
  seasonId: string;
}

export interface Membership {
  residentId: string;
  aiResidentId: string;
  role: Role;
  displayName: string;
}

function systemEnvelope(
  config: SeasonConfig,
  command: DistrictCommand,
  idempotencyKey: string,
  now: string,
  actorRef: string,
): DistrictCommandEnvelope {
  return {
    commandId: randomUUID(),
    idempotencyKey,
    commandType: command.type,
    schemaVersion: 1,
    districtId: config.districtId,
    seasonId: config.seasonId,
    actorRef,
    actorAuthority: "system",
    sourceRef: "application-api",
    serverReceivedAt: now,
    correlationId: idempotencyKey,
    privacyScope: "district",
    payload: command.payload,
  };
}

export async function ensureDistrict(pool: Pool, config: SeasonConfig, now: string): Promise<void> {
  await initDistrict(pool, {
    districtId: config.districtId,
    seasonId: config.seasonId,
    rngSeed: `${config.districtId}:${config.seasonId}`,
    initialStepTime: now,
  });
}

export async function findMembership(
  pool: Pool,
  config: SeasonConfig,
  accountId: string,
): Promise<Membership | null> {
  const result = await pool.query(
    `SELECT r.resident_id, r.role, r.display_name, m.sponsored_ai_resident_id
       FROM app.resident r
       JOIN app.season_member m
         ON m.resident_id = r.resident_id
        AND m.district_id = $2 AND m.season_id = $3
      WHERE r.account_id = $1`,
    [accountId, config.districtId, config.seasonId],
  );
  const row = result.rows[0];
  if (!row) return null;
  return {
    residentId: row.resident_id as string,
    aiResidentId: row.sponsored_ai_resident_id as string,
    role: row.role as Role,
    displayName: row.display_name as string,
  };
}

/**
 * "Enter District Zero": create the human resident and its pre-provisioned AI
 * resident, journal the provisioning and the three authored cards, and
 * process the district. Idempotent per account, and safe to retry from any
 * partial state: the app rows are upserts and every runtime command carries a
 * stable idempotency key, so a crash between the membership commit and the
 * command journal is healed by simply calling enter again — the journal
 * collapses duplicates and the step applies whatever is still missing.
 */
export async function enterSeason(
  pool: Pool,
  config: SeasonConfig,
  accountId: string,
  requestedRole: Role,
  requestedDisplayName: string,
  now: string,
): Promise<Membership> {
  // A pre-existing membership pins role and display name; the request only
  // supplies them on first entry.
  const existing = await findMembership(pool, config, accountId);
  const role = existing?.role ?? requestedRole;
  const displayName = existing?.displayName ?? requestedDisplayName;

  const residentId = existing?.residentId ?? `human-${accountId}`;
  const aiResidentId = existing?.aiResidentId ?? `ai-${accountId}`;
  const aiDisplayName = "Mira";

  await withTransaction(pool, async (client) => {
    await client.query(
      `INSERT INTO app.resident (resident_id, account_id, kind, role, display_name)
       VALUES ($1, $2, 'human', $3, $4)
       ON CONFLICT (resident_id) DO NOTHING`,
      [residentId, accountId, role, displayName],
    );
    await client.query(
      `INSERT INTO app.resident (resident_id, account_id, kind, role, display_name)
       VALUES ($1, NULL, 'ai', 'mediator', $2)
       ON CONFLICT (resident_id) DO NOTHING`,
      [aiResidentId, aiDisplayName],
    );
    await client.query(
      `INSERT INTO app.season_member
         (district_id, season_id, resident_id, role, sponsored_ai_resident_id)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT DO NOTHING`,
      [config.districtId, config.seasonId, residentId, role, aiResidentId],
    );
  });

  const commands: { command: DistrictCommand; key: string }[] = [
    {
      key: `provision:${residentId}`,
      command: {
        type: "season.provision_resident",
        payload: {
          residentId,
          kind: "human",
          role,
          displayName,
          sponsoredAiResidentId: aiResidentId,
        },
      },
    },
    {
      key: `provision:${aiResidentId}`,
      command: {
        type: "season.provision_resident",
        payload: {
          residentId: aiResidentId,
          kind: "ai",
          role: "mediator",
          displayName: aiDisplayName,
          sponsoredAiResidentId: null,
        },
      },
    },
    ...AUTHORED_CARDS.map(({ templateKey, card }) => ({
      key: `assign:${templateKey}:${residentId}`,
      command: {
        type: "card.assign" as const,
        payload: {
          residentId,
          card: { cardId: `${templateKey}:${residentId}`, ...card },
        },
      },
    })),
  ];
  for (const { command, key } of commands) {
    await enqueueCommand(pool, systemEnvelope(config, command, key, now, `account:${accountId}`));
  }
  await processDistrict(pool, config.districtId, config.seasonId, { stepTime: now });

  return { residentId, aiResidentId, role, displayName };
}
