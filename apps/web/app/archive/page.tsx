"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import type { CommittedEventView } from "@freecity/client-world";

import { fetchArchive, isNotAResident } from "../../lib/api";
import { storyForCardId } from "../../lib/story";

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
    <div className="archive-page">
      <header className="archive-header">
        <div>
          <span className="eyebrow">PERSONAL CITY MEMORY · REPLAYABLE</span>
          <h1>Archive</h1>
          <p>
            The city remembers choices, boundaries and consequences—not clicks or decorative motion.
          </p>
        </div>
        <div className="archive-seal" aria-hidden="true">
          <span>F</span>
          <small>
            DISTRICT
            <br />
            ZERO
          </small>
        </div>
      </header>
      {entries.length === 0 ? (
        <div className="empty-archive">
          <span>◇</span>
          <h2>No chapters yet</h2>
          <p>Your first committed choice will open this Archive.</p>
        </div>
      ) : (
        <ol className="archive-timeline" data-testid="archive">
          {entries.map((view) => {
            const event = view.event;
            if (event.eventType !== "ArchiveEntryRecorded") return null;
            const story = event.cardId ? storyForCardId(event.cardId) : null;
            return (
              <li
                key={`${view.sequence}:${view.eventSeq}`}
                className={`archive-entry ${story ? `tone-${story.tone}` : ""}`}
              >
                <span className="archive-node" aria-hidden="true" />
                <article>
                  <div className="archive-entry-topline">
                    <span>{event.entryType.replaceAll("_", " ")}</span>
                    <small>
                      committed event {view.sequence}:{view.eventSeq}
                    </small>
                  </div>
                  <h2>{story?.title ?? "District consequence"}</h2>
                  <p>{event.summary}</p>
                  {story && (
                    <footer>
                      {story.place} · {story.resident}
                    </footer>
                  )}
                </article>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
