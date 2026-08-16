"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import type { Role } from "@freecity/contracts";

import { enterSeason, setMembership } from "../../lib/api";

const ROLES: { role: Role; blurb: string }[] = [
  { role: "builder", blurb: "Make systems work: diagnose, build, test, repair." },
  { role: "creator", blurb: "Give the district culture: imagine, compose, remix, exhibit." },
  { role: "merchant", blurb: "Connect needs and services: discover, quote, coordinate." },
  { role: "reporter", blurb: "Make events understandable: investigate, verify, publish." },
  { role: "mediator", blurb: "Repair relationships: listen, clarify, negotiate, reconcile." },
];

export default function EnterPage() {
  const router = useRouter();
  const [role, setRole] = useState<Role>("builder");
  const [displayName, setDisplayName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(eventArg: FormEvent) {
    eventArg.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const membership = await enterSeason(role, displayName);
      setMembership(membership);
      router.push("/today");
    } catch {
      setError("Entering the district failed. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <h1>Enter District Zero</h1>
      <p>
        Choose a role and a name. You will meet your AI resident, Mira, on the other side. Your role
        shapes which cards find you first; it is a starting point, not a cage.
      </p>
      <form onSubmit={submit}>
        <fieldset>
          <legend>Your role</legend>
          {ROLES.map((entry) => (
            <p key={entry.role}>
              <label>
                <input
                  type="radio"
                  name="role"
                  value={entry.role}
                  checked={role === entry.role}
                  onChange={() => setRole(entry.role)}
                />{" "}
                <strong style={{ textTransform: "capitalize" }}>{entry.role}</strong> —{" "}
                <span className="muted">{entry.blurb}</span>
              </label>
            </p>
          ))}
        </fieldset>
        <p>
          <label>
            Your name{" "}
            <input
              required
              maxLength={60}
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
            />
          </label>
        </p>
        <p>
          <button className="primary" type="submit" disabled={busy || displayName.length === 0}>
            {busy ? "Entering…" : "Enter the district"}
          </button>
        </p>
      </form>
      {error !== null && (
        <p role="alert" className="status-warn">
          {error}
        </p>
      )}
    </>
  );
}
