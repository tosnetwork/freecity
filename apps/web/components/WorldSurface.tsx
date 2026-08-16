"use client";

import type { ReactNode } from "react";

import { CitySky } from "./CitySky";

export function WorldSurface({
  eyebrow,
  title,
  introduction,
  notice,
  children,
}: {
  eyebrow: string;
  title: string;
  introduction: string;
  notice?: string | null;
  children: ReactNode;
}) {
  return (
    <div className="world-surface">
      <CitySky compact />
      <header className="world-surface-header">
        <span className="eyebrow">{eyebrow}</span>
        <h1>{title}</h1>
        <p>{introduction}</p>
      </header>
      {notice && (
        <p className="world-notice" role="status">
          {notice}
        </p>
      )}
      <div className="world-surface-content">{children}</div>
    </div>
  );
}

export function WorldLoading({ label = "Loading the committed city…" }: { label?: string }) {
  return (
    <p className="world-loading" role="status">
      {label}
    </p>
  );
}
