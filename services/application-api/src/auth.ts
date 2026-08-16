import { randomBytes, randomInt, randomUUID } from "node:crypto";

import type { Pool } from "@freecity/district-runtime";

/**
 * Phase 1 dev email-code authentication (Implementation Plan §7.1): a
 * six-digit code per email, ten-minute expiry, single use, bearer-token
 * session. In `dev` mode the code is returned in the response instead of
 * being emailed; passkeys replace this before any external cohort.
 */

const CODE_TTL_MS = 10 * 60_000;
const SESSION_TTL_MS = 14 * 24 * 3_600_000;

export async function requestCode(pool: Pool, email: string): Promise<{ devCode: string }> {
  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  await pool.query(`INSERT INTO app.auth_code (email, code, expires_at) VALUES ($1, $2, $3)`, [
    email,
    code,
    new Date(Date.now() + CODE_TTL_MS),
  ]);
  return { devCode: code };
}

export async function verifyCode(
  pool: Pool,
  email: string,
  code: string,
): Promise<{ token: string; accountId: string } | null> {
  const consumed = await pool.query(
    `UPDATE app.auth_code SET consumed_at = now()
      WHERE email = $1 AND code = $2 AND consumed_at IS NULL AND expires_at > now()
      RETURNING email`,
    [email, code],
  );
  if (!consumed.rows[0]) return null;

  const accountId = randomUUID();
  const account = await pool.query(
    `INSERT INTO app.account (account_id, email) VALUES ($1, $2)
     ON CONFLICT (email) DO UPDATE SET email = EXCLUDED.email
     RETURNING account_id`,
    [accountId, email],
  );
  const resolvedAccountId = account.rows[0].account_id as string;

  const token = randomBytes(32).toString("hex");
  await pool.query(`INSERT INTO app.session (token, account_id, expires_at) VALUES ($1, $2, $3)`, [
    token,
    resolvedAccountId,
    new Date(Date.now() + SESSION_TTL_MS),
  ]);
  return { token, accountId: resolvedAccountId };
}

export async function resolveSession(pool: Pool, token: string): Promise<string | null> {
  const result = await pool.query(
    `SELECT account_id FROM app.session WHERE token = $1 AND expires_at > now()`,
    [token],
  );
  return (result.rows[0]?.account_id as string | undefined) ?? null;
}
