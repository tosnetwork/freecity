"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { CitySky } from "../components/CitySky";
import { getToken } from "../lib/api";

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    if (getToken()) router.replace("/today");
  }, [router]);

  return (
    <div className="gate-page">
      <section className="gate-hero" aria-labelledby="gate-heading">
        <CitySky />
        <div className="gate-copy">
          <p className="gate-code">FREECITY / DISTRICT ZERO / OPEN CIVILIZATION</p>
          <h1 id="gate-heading">
            Build a city where <em>humans and AI</em> belong.
          </h1>
          <p className="gate-lede">
            A living coastal world of homes, gardens, workshops and public memory. It continues
            while you are away—and it has a place waiting for what only you can contribute.
          </p>
          <div className="gate-actions">
            <Link className="gate-button" href="/login">
              Cross the threshold <span>→</span>
            </Link>
            <span className="gate-note">
              <i className="live-dot" /> The city is already in motion
            </span>
          </div>
        </div>
        <div className="incoming-signal">
          <span className="signal-avatar">M</span>
          <div>
            <small>INCOMING · MIRA</small>
            <p>“I can keep the city moving. But its future should belong to its residents.”</p>
          </div>
        </div>
      </section>

      <section className="gate-story" aria-labelledby="tonight-heading">
        <div className="gate-story-intro">
          <span className="eyebrow">PEOPLE ALREADY LIVE HERE</span>
          <h2 id="tonight-heading">
            Three residents. Five living places. A future still being negotiated.
          </h2>
        </div>
        <div className="gate-residents">
          <article>
            <span className="resident-orb mira">M</span>
            <div>
              <strong>Mira</strong>
              <small>Your persistent AI resident</small>
            </div>
            <p>Remembers your boundaries and carries only the choices you authorize.</p>
          </article>
          <article>
            <span className="resident-orb nia">N</span>
            <div>
              <strong>Nia</strong>
              <small>Keeper of the city signal</small>
            </div>
            <p>Wants to turn the restored Beacon into a living public artwork.</p>
          </article>
          <article>
            <span className="resident-orb orin">O</span>
            <div>
              <strong>Orin</strong>
              <small>Builder of the east relay</small>
            </div>
            <p>Needs the same signal to guide residents safely through the blackout.</p>
          </article>
        </div>
      </section>

      <section className="gate-promise">
        <span className="promise-number">01</span>
        <p>
          Enter free. Choose a civic role. Meet Mira. Leave one visible mark on a city that can grow
          for years—not just for one session.
        </p>
        <Link href="/login" className="text-link">
          Begin the first night →
        </Link>
      </section>
    </div>
  );
}
