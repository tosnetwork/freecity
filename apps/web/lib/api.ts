"use client";

import type { CardInstance, PendingConsequence, Role } from "@freecity/contracts";
import type { CommittedEventView } from "@freecity/client-world";

/**
 * Client API helpers. The bearer token lives in localStorage (dev auth); a
 * 401 clears it and sends the visitor back to the login page. All gameplay
 * mutations go through the server's command gateway — nothing here commits
 * state client-side.
 */

const TOKEN_KEY = "freecity_token";
const MEMBER_KEY = "freecity_membership";

/**
 * Direct API origin for the SSE stream. REST calls go through the same-origin
 * proxy; the event stream connects directly because dev proxies buffer
 * streaming responses.
 */
export function apiOrigin(): string {
  return process.env.NEXT_PUBLIC_API_ORIGIN ?? "http://localhost:3001";
}

export interface Membership {
  residentId: string;
  aiResidentId: string;
  role: Role;
  displayName: string;
}

export interface TodayResponse {
  residentId: string;
  focus: number;
  stateVersion: number;
  lastSequence: number;
  activeCards: CardInstance[];
  pendingConsequences: PendingConsequence[];
  whileYouWereAway: CommittedEventView[];
}

export interface CommandResponse {
  commandId: string;
  duplicate: boolean;
  status: "applied" | "rejected" | "received";
  districtSequence: number | null;
  result: { ok: boolean; code?: string; message?: string } | null;
}

export function getToken(): string | null {
  return typeof window === "undefined" ? null : window.localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  window.localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  window.localStorage.removeItem(TOKEN_KEY);
  window.localStorage.removeItem(MEMBER_KEY);
}

export function getMembership(): Membership | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(MEMBER_KEY);
  return raw ? (JSON.parse(raw) as Membership) : null;
}

export function setMembership(membership: Membership): void {
  window.localStorage.setItem(MEMBER_KEY, JSON.stringify(membership));
}

export class ApiError extends Error {
  constructor(
    public status: number,
    public body: unknown,
  ) {
    super(`API error ${status}`);
  }
}

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getToken();
  const response = await fetch(path, {
    ...init,
    headers: {
      "content-type": "application/json",
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...(init?.headers ?? {}),
    },
  });
  if (response.status === 401) {
    clearToken();
    window.location.assign("/login");
    throw new ApiError(401, null);
  }
  const body: unknown = await response.json();
  if (!response.ok) throw new ApiError(response.status, body);
  return body as T;
}

/** true when the error is the API telling us this account has not entered yet. */
export function isNotAResident(error: unknown): boolean {
  return (
    error instanceof ApiError &&
    error.status === 409 &&
    typeof error.body === "object" &&
    error.body !== null &&
    (error.body as Record<string, unknown>)["error"] === "not_a_resident"
  );
}

/**
 * Command submissions surface a 409 as a structured rejection instead of a
 * thrown error: a rejected command body already has the CommandResponse
 * shape, and an idempotency-key conflict is normalized into one.
 */
async function commandRequest(path: string, payload: unknown): Promise<CommandResponse> {
  try {
    return await api<CommandResponse>(path, { method: "POST", body: JSON.stringify(payload) });
  } catch (error) {
    if (error instanceof ApiError && error.status === 409) {
      const body = error.body as Record<string, unknown>;
      if (typeof body["status"] === "string") return error.body as CommandResponse;
      return {
        commandId: typeof body["originalCommandId"] === "string" ? body["originalCommandId"] : "",
        duplicate: false,
        status: "rejected",
        districtSequence: null,
        result: {
          ok: false,
          code: typeof body["error"] === "string" ? body["error"].toUpperCase() : "REJECTED",
          ...(typeof body["message"] === "string" ? { message: body["message"] } : {}),
        },
      };
    }
    throw error;
  }
}

export function requestCode(email: string): Promise<{ sent: boolean; devCode?: string }> {
  return api("/api/auth/request-code", { method: "POST", body: JSON.stringify({ email }) });
}

export function verifyCode(email: string, code: string): Promise<{ token: string }> {
  return api("/api/auth/verify", { method: "POST", body: JSON.stringify({ email, code }) });
}

export function enterSeason(role: Role, displayName: string): Promise<Membership> {
  return api("/api/season/enter", { method: "POST", body: JSON.stringify({ role, displayName }) });
}

export function fetchToday(): Promise<TodayResponse> {
  return api("/api/today");
}

/**
 * Returns the stored membership, refetching it from the API when local
 * storage lost it (e.g. after sign-out/sign-in on the same account).
 * Throws not_a_resident for accounts that have not entered yet.
 */
export async function ensureMembership(): Promise<Membership> {
  const stored = getMembership();
  if (stored) return stored;
  const fetched = await api<Membership>("/api/membership");
  setMembership(fetched);
  return fetched;
}

export function fetchArchive(): Promise<{ entries: CommittedEventView[] }> {
  return api("/api/archive");
}

/** Advances the While You Were Away marker; idempotent and monotonic. */
export function ackToday(sequence: number): Promise<{ acknowledged: number }> {
  return api("/api/today/ack", { method: "POST", body: JSON.stringify({ sequence }) });
}

export function chooseOption(cardId: string, optionId: string): Promise<CommandResponse> {
  return commandRequest(`/api/cards/${encodeURIComponent(cardId)}/choose`, {
    optionId,
    expectedStateVersion: null,
  });
}

export function declineCard(cardId: string): Promise<CommandResponse> {
  return commandRequest(`/api/cards/${encodeURIComponent(cardId)}/decline`, { reason: null });
}

export function upgradeBuilding(
  buildingId: string,
  expectedLevel: number,
): Promise<CommandResponse> {
  return commandRequest(`/api/city/buildings/${encodeURIComponent(buildingId)}/upgrade`, {
    expectedLevel,
  });
}

export function expandDistrict(parcelId: string): Promise<CommandResponse> {
  return commandRequest(`/api/city/parcels/${encodeURIComponent(parcelId)}/expand`, {});
}
