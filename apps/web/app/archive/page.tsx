"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import type { CommittedEventView } from "@freecity/client-world";

import { fetchArchive, isNotAResident } from "../../lib/api";

export default function ArchivePage() {
  const router = useRouter();
  const [entries, setEntries] = useState<CommittedEventView[] | null>(null);

  useEffect(() => {
    void fetchArchive()
      .then((response) => setEntries(response.entries))
      .catch((error: unknown) => {
        if (isNotAResident(error)) {
          router.replace("/enter");
          return;
        }
        throw error;
      });
  }, [router]);

  if (entries === null) return <p>Loading Archive…</p>;

  return (
    <>
      <h1>Archive</h1>
      <p className="muted">
        Your durable district record — every entry cites a committed event and stays replayable.
      </p>
      {entries.length === 0 ? (
        <p className="muted">No archive entries yet. Choices and consequences will land here.</p>
      ) : (
        <ol data-testid="archive">
          {entries.map((view) => {
            const event = view.event;
            if (event.eventType !== "ArchiveEntryRecorded") return null;
            return (
              <li key={`${view.sequence}:${view.eventSeq}`}>
                <strong style={{ textTransform: "capitalize" }}>
                  {event.entryType.replaceAll("_", " ")}
                </strong>
                : {event.summary}{" "}
                <span className="muted">
                  (event {view.sequence}:{view.eventSeq})
                </span>
              </li>
            );
          })}
        </ol>
      )}
    </>
  );
}
