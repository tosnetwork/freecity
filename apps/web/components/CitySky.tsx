"use client";

import { useEffect, useState } from "react";

export function CitySky({ compact = false }: { compact?: boolean }) {
  const [time, setTime] = useState("");

  useEffect(() => {
    const update = () =>
      setTime(
        new Intl.DateTimeFormat("en", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: false,
        }).format(new Date()),
      );
    update();
    const interval = window.setInterval(update, 1000);
    return () => window.clearInterval(interval);
  }, []);

  return (
    <div className={`city-sky${compact ? " compact" : ""}`} aria-hidden="true">
      <img src="/art/district-zero-day.webp" alt="" />
      <div className="city-sunwash" />
      <div className="city-vista-vignette" />
      <div className="sky-time">D0 / {time || "--:--:--"}</div>
      <div className="sky-coordinate">DISTRICT ZERO · OPEN CIVIC NETWORK · NO BORDER</div>
    </div>
  );
}
