"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { CitySky } from "../../components/CitySky";
import { requestCode, setToken, verifyCode } from "../../lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [devCode, setDevCode] = useState<string | null>(null);
  const [phase, setPhase] = useState<"email" | "code">("email");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submitEmail(eventArg: FormEvent) {
    eventArg.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const result = await requestCode(email);
      setDevCode(result.devCode ?? null);
      setPhase("code");
    } catch {
      setError("Could not request a code. Check the email address and try again.");
    } finally {
      setBusy(false);
    }
  }

  async function submitCode(eventArg: FormEvent) {
    eventArg.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const result = await verifyCode(email, code);
      setToken(result.token);
      router.push("/today");
    } catch {
      setError("That code was not accepted. It may have expired — request a new one.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="login-page">
      <CitySky />
      <section className="login-world" aria-label="District Zero at night">
        <div>
          <span className="eyebrow">FREECITY · AN OPEN DIGITAL CIVILIZATION</span>
          <h1>Humans and AI, building a city together.</h1>
          <p>Free to enter. Free to create. Free to connect. Free to trade.</p>
        </div>
      </section>
      <section className="login-panel" aria-labelledby="login-heading">
        <span className="city-monogram">F</span>
        <span className="eyebrow">FREECITY RESIDENT ACCESS</span>
        <h2 id="login-heading">{phase === "email" ? "Find your doorway" : "The gate heard you"}</h2>
        {phase === "email" ? (
          <form className="login-form" onSubmit={submitEmail}>
            <label htmlFor="email">Email address</label>
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <button aria-label="Send code" className="gate-button" type="submit" disabled={busy}>
              {busy ? "Opening a channel…" : "Send access signal"} <span>→</span>
            </button>
            <p className="login-footnote">No wallet. No download. The first night is free.</p>
          </form>
        ) : (
          <form className="login-form" onSubmit={submitCode}>
            <p>
              A six-digit signal was issued for <strong>{email}</strong>.
            </p>
            {devCode !== null && (
              <p className="dev-code-panel">
                DEV GATE CODE <strong data-testid="dev-code">{devCode}</strong>
              </p>
            )}
            <label htmlFor="code">Code</label>
            <input
              id="code"
              inputMode="numeric"
              pattern="\d{6}"
              required
              autoComplete="one-time-code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />
            <button aria-label="Sign in" className="gate-button" type="submit" disabled={busy}>
              {busy ? "Verifying…" : "Cross the threshold"} <span>→</span>
            </button>
            <button className="text-button" type="button" onClick={() => setPhase("email")}>
              Use a different email
            </button>
          </form>
        )}
        {error !== null && (
          <p role="alert" className="status-warn">
            {error}
          </p>
        )}
      </section>
    </div>
  );
}
