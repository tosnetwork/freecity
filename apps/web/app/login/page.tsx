"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

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
    <>
      <h1>Sign in</h1>
      {phase === "email" ? (
        <form onSubmit={submitEmail}>
          <p>
            <label>
              Email address{" "}
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </label>{" "}
            <button className="primary" type="submit" disabled={busy}>
              {busy ? "Sending…" : "Send code"}
            </button>
          </p>
        </form>
      ) : (
        <form onSubmit={submitCode}>
          <p>
            A six-digit code was issued for <strong>{email}</strong>.
          </p>
          {devCode !== null && (
            <p className="muted">
              Development mode: your code is <strong data-testid="dev-code">{devCode}</strong>.
            </p>
          )}
          <p>
            <label>
              Code{" "}
              <input
                inputMode="numeric"
                pattern="\d{6}"
                required
                autoComplete="one-time-code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
              />
            </label>{" "}
            <button className="primary" type="submit" disabled={busy}>
              {busy ? "Verifying…" : "Sign in"}
            </button>{" "}
            <button type="button" onClick={() => setPhase("email")}>
              Use a different email
            </button>
          </p>
        </form>
      )}
      {error !== null && (
        <p role="alert" className="status-warn">
          {error}
        </p>
      )}
    </>
  );
}
