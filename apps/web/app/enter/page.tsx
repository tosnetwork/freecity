"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import type { Role } from "@freecity/contracts";

import { CitySky } from "../../components/CitySky";
import { enterSeason, setMembership } from "../../lib/api";

const ROLES: { role: Role; symbol: string; blurb: string; home: string; tension: string }[] = [
  {
    role: "builder",
    symbol: "⌁",
    blurb: "Make broken systems hold.",
    home: "Night Workshop",
    tension: "speed / care",
  },
  {
    role: "creator",
    symbol: "✦",
    blurb: "Give the city a voice.",
    home: "Echo Studio",
    tension: "vision / belonging",
  },
  {
    role: "merchant",
    symbol: "◇",
    blurb: "Connect need with capability.",
    home: "Beacon Market",
    tension: "margin / trust",
  },
  {
    role: "reporter",
    symbol: "◉",
    blurb: "Make hidden events legible.",
    home: "Signal Garden",
    tension: "access / privacy",
  },
  {
    role: "mediator",
    symbol: "∞",
    blurb: "Turn conflict into a third path.",
    home: "Arrival Hall",
    tension: "neutrality / loyalty",
  },
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
    <div className="entry-page">
      <section className="entry-header">
        <CitySky compact />
        <div>
          <span className="eyebrow">ARRIVAL HALL · IDENTITY DESK</span>
          <h1>Who will the city meet tonight?</h1>
          <p>
            A role changes where you begin and why residents seek you out. It is a first promise,
            not a permanent class.
          </p>
        </div>
      </section>

      <form className="entry-form" onSubmit={submit}>
        <fieldset className="role-fieldset">
          <legend>Choose your first way of mattering</legend>
          <div className="role-grid">
            {ROLES.map((entry) => (
              <label
                className={`role-card${role === entry.role ? " selected" : ""}`}
                key={entry.role}
              >
                <input
                  type="radio"
                  name="role"
                  value={entry.role}
                  checked={role === entry.role}
                  onChange={() => setRole(entry.role)}
                />
                <span className="role-symbol" aria-hidden="true">
                  {entry.symbol}
                </span>
                <strong>{entry.role}</strong>
                <span>{entry.blurb}</span>
                <small>
                  {entry.home} · {entry.tension}
                </small>
              </label>
            ))}
          </div>
        </fieldset>

        <div className="identity-panel">
          <div className="name-field">
            <label htmlFor="resident-name">What should residents call you?</label>
            <input
              id="resident-name"
              aria-label="Your name"
              required
              maxLength={60}
              placeholder="Your resident name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
            />
            <small>This identity will own your committed choices and Archive.</small>
          </div>
          <div className="mira-waiting">
            <span className="resident-orb mira">M</span>
            <div>
              <strong>Mira is already inside.</strong>
              <small>Authored AI resident · observe + suggest only</small>
            </div>
          </div>
          <button
            className="gate-button entry-submit"
            type="submit"
            disabled={busy || displayName.length === 0}
          >
            {busy ? "Opening the gate…" : "Enter the district"} <span>→</span>
          </button>
        </div>
      </form>
      {error !== null && (
        <p role="alert" className="status-warn">
          {error}
        </p>
      )}
    </div>
  );
}
