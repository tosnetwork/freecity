"use client";

import Link from "next/link";

import { WorldLoading, WorldSurface } from "../../components/WorldSurface";
import { getMembership, joinProject } from "../../lib/api";
import { useCityWorld } from "../../lib/use-city-world";

export default function ProjectsPage() {
  const { world, busy, notice, act } = useCityWorld();
  if (!world) return <WorldLoading />;
  const me = getMembership()?.residentId ?? "";
  const projects = Object.values(world.world.projects);
  return (
    <WorldSurface
      eyebrow="PROJECTS · WORK THAT CHANGES THE MAP"
      title="Build with humans and AI, then leave evidence."
      introduction="Projects bind a place, multiple roles, claimable tasks, reviewed contributions and a permanent event trail. Approved work reaches the Beacon once."
      notice={notice}
    >
      <section className="project-board">
        {projects.map((project) => {
          const joined = project.memberIds.includes(me);
          const approved = project.contributions.filter(
            (item) => item.status === "approved",
          ).length;
          return (
            <article className="world-panel project-card" key={project.projectId}>
              <div className="project-place-mark">{project.placeId === "workshop" ? "⚒" : "✦"}</div>
              <span className="eyebrow">
                {project.status} · {project.placeId.replaceAll("-", " ")}
              </span>
              <h2>
                <Link href={`/projects/${project.projectId}`}>{project.title}</Link>
              </h2>
              <p>{project.description}</p>
              <dl className="project-stats">
                <div>
                  <dt>Members</dt>
                  <dd>{project.memberIds.length}</dd>
                </div>
                <div>
                  <dt>Open tasks</dt>
                  <dd>{project.tasks.filter((item) => item.status === "open").length}</dd>
                </div>
                <div>
                  <dt>Beacon work</dt>
                  <dd>{approved}</dd>
                </div>
              </dl>
              <div className="world-actions">
                {!joined && (
                  <button
                    disabled={busy !== null}
                    onClick={() =>
                      void act(`join:${project.projectId}`, () => joinProject(project.projectId))
                    }
                  >
                    Join project
                  </button>
                )}
                <Link className="text-link" href={`/projects/${project.projectId}`}>
                  Open project room →
                </Link>
              </div>
            </article>
          );
        })}
      </section>
    </WorldSurface>
  );
}
