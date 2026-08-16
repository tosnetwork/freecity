"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import type { CommittedEventView } from "@freecity/client-world";

import { fetchArchive, isNotAResident } from "../../lib/api";
import { storyForCardId } from "../../lib/story";
import { CitySky } from "../../components/CitySky";

export default function ArchivePage() {
  const router = useRouter();
  const [entries, setEntries] = useState<CommittedEventView[] | null>(null);
  const [entryType, setEntryType] = useState("all");
  const [query, setQuery] = useState("");

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
  const archiveEvents = entries.filter(
    (
      view,
    ): view is CommittedEventView & {
      event: Extract<CommittedEventView["event"], { eventType: "ArchiveEntryRecorded" }>;
    } => view.event.eventType === "ArchiveEntryRecorded",
  );
  const entryTypes = [...new Set(archiveEvents.map((view) => view.event.entryType))].sort();
  const visibleEntries = archiveEvents.filter(
    (view) =>
      (entryType === "all" || view.event.entryType === entryType) &&
      `${view.event.entryType} ${view.event.summary}`.toLowerCase().includes(query.toLowerCase()),
  );
  const entryTitles: Record<string, string> = {
    relationship: "Relationship chapter",
    circle: "Circle chapter",
    project: "Project chapter",
    contribution: "Contribution chapter",
    artifact: "Artifact recorded",
    market: "Market chapter",
    civic: "Civic chapter",
    beacon: "Beacon chapter",
    place_visit: "Place visited",
  };
  const entryTitle = (type: string) => entryTitles[type] ?? "District consequence";

  return (
    <div className="archive-page">
      <CitySky compact />
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
      {archiveEvents.length > 0 && (
        <section className="world-toolbar archive-toolbar" aria-label="Archive filters">
          <label>
            Search memory
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Summary or event type"
            />
          </label>
          <label>
            Chapter type
            <select value={entryType} onChange={(event) => setEntryType(event.target.value)}>
              <option value="all">All chapters</option>
              {entryTypes.map((type) => (
                <option key={type} value={type}>
                  {type.replaceAll("_", " ")}
                </option>
              ))}
            </select>
          </label>
        </section>
      )}
      {archiveEvents.length === 0 ? (
        <div className="empty-archive">
          <span>◇</span>
          <h2>No chapters yet</h2>
          <p>Your first committed choice will open this Archive.</p>
        </div>
      ) : (
        <ol className="archive-timeline" data-testid="archive">
          {visibleEntries.map((view) => {
            const event = view.event;
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
                  <h2>{story?.title ?? entryTitle(event.entryType)}</h2>
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
          {visibleEntries.length === 0 && (
            <li className="archive-entry">
              <article>
                <h2>No matching chapters</h2>
                <p>Change the search or chapter filter to reopen more of the city memory.</p>
              </article>
            </li>
          )}
        </ol>
      )}
    </div>
  );
}
