"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";

import type { ContributionKind } from "@freecity/contracts";

import { WorldLoading, WorldSurface } from "../../../components/WorldSurface";
import {
  claimProjectTask,
  getMembership,
  joinProject,
  reviewProjectContribution,
  submitProjectContribution,
} from "../../../lib/api";
import { useCityWorld } from "../../../lib/use-city-world";

export default function ProjectRoomPage() {
  const params = useParams<{ projectId: string }>();
  const { world, busy, notice, act } = useCityWorld();
  const [summary, setSummary] = useState("");
  const [kind, setKind] = useState<ContributionKind>("work");
  const [artifactUrl, setArtifactUrl] = useState("");
  const [taskId, setTaskId] = useState("");
  if (!world) return <WorldLoading />;
  const project = world.world.projects[params.projectId];
  if (!project)
    return (
      <WorldSurface
        eyebrow="PROJECTS"
        title="Project not found"
        introduction="This project is not part of the committed district."
        notice={notice}
      >
        <Link href="/projects">Return to Projects</Link>
      </WorldSurface>
    );
  const me = getMembership()?.residentId ?? "";
  const joined = project.memberIds.includes(me);
  const myClaimedTasks = project.tasks.filter(
    (task) => task.assigneeId === me && task.status === "claimed",
  );
  const residentName = (id: string | null) =>
    id ? (world.residents.find((item) => item.residentId === id)?.displayName ?? id) : "Unclaimed";
  return (
    <WorldSurface
      eyebrow={`${project.placeId.replaceAll("-", " ")} · COMMITTED PROJECT ROOM`}
      title={project.title}
      introduction={project.description}
      notice={notice}
    >
      <div className="project-room-actions">
        <Link href={`/places/${project.placeId}`} className="text-link">
          Visit project place →
        </Link>
        {!joined && (
          <button
            disabled={busy !== null}
            onClick={() => void act("join", () => joinProject(project.projectId))}
          >
            Join this project
          </button>
        )}
      </div>
      <section className="world-grid">
        <article className="world-panel world-panel-wide">
          <span className="eyebrow">TASK BOARD</span>
          <h2>Work has owners and evidence.</h2>
          <ul className="world-list">
            {project.tasks.map((task) => (
              <li key={task.taskId}>
                <div>
                  <b>{task.title}</b>
                  <span>
                    {task.roleHint} · {task.status}
                  </span>
                </div>
                <small>{residentName(task.assigneeId)}</small>
                {joined && task.status === "open" && (
                  <button
                    disabled={busy !== null}
                    onClick={() =>
                      void act(`task:${task.taskId}`, () =>
                        claimProjectTask(project.projectId, task.taskId),
                      )
                    }
                  >
                    Claim
                  </button>
                )}
              </li>
            ))}
          </ul>
        </article>
        <article className="world-panel">
          <span className="eyebrow">MEMBERS</span>
          <h2>{project.memberIds.length} residents</h2>
          <p>{project.memberIds.map(residentName).join(" · ")}</p>
        </article>
        <article className="world-panel contribution-form">
          <span className="eyebrow">SUBMIT EVIDENCE</span>
          <h2>Contribute</h2>
          <label>
            Linked claimed task (optional)
            <select value={taskId} onChange={(event) => setTaskId(event.target.value)}>
              <option value="">General contribution</option>
              {myClaimedTasks.map((task) => (
                <option key={task.taskId} value={task.taskId}>
                  {task.title}
                </option>
              ))}
            </select>
          </label>
          <label>
            Contribution path
            <select
              value={kind}
              onChange={(event) => setKind(event.target.value as ContributionKind)}
            >
              <option value="work">Work</option>
              <option value="creation">Creation</option>
              <option value="care">Care</option>
              <option value="circle">Circle</option>
              <option value="civic">Civic</option>
            </select>
          </label>
          <label>
            What changed
            <textarea
              value={summary}
              onChange={(event) => setSummary(event.target.value)}
              maxLength={500}
            />
          </label>
          <label>
            Artifact URL (optional)
            <input
              value={artifactUrl}
              onChange={(event) => setArtifactUrl(event.target.value)}
              type="url"
            />
          </label>
          <button
            disabled={!joined || busy !== null || !summary.trim()}
            onClick={() =>
              void act("contribute", () =>
                submitProjectContribution(
                  project.projectId,
                  taskId || null,
                  kind,
                  summary.trim(),
                  artifactUrl.trim() || null,
                ),
              ).then((ok) => {
                if (ok) {
                  setSummary("");
                  setArtifactUrl("");
                  setTaskId("");
                }
              })
            }
          >
            {joined ? "Submit for review" : "Join before contributing"}
          </button>
        </article>
        <article className="world-panel world-panel-wide">
          <span className="eyebrow">CONTRIBUTION TRAIL</span>
          <h2>Review before Beacon.</h2>
          {project.contributions.length === 0 ? (
            <p className="muted">No contributions submitted yet.</p>
          ) : (
            <ul className="world-list">
              {project.contributions.map((contribution) => (
                <li key={contribution.contributionId}>
                  <div>
                    <b>{contribution.summary}</b>
                    <span>
                      {residentName(contribution.residentId)} · {contribution.kind} ·{" "}
                      {contribution.status}
                    </span>
                    {contribution.artifactUrl && (
                      <a href={contribution.artifactUrl} target="_blank" rel="noreferrer">
                        Open artifact
                      </a>
                    )}
                  </div>
                  {joined &&
                    contribution.status === "submitted" &&
                    contribution.residentId !== me && (
                      <div className="world-actions">
                        <button
                          onClick={() =>
                            void act(`approve:${contribution.contributionId}`, () =>
                              reviewProjectContribution(
                                project.projectId,
                                contribution.contributionId,
                                "approve",
                                "Reviewed against the project brief.",
                              ),
                            )
                          }
                        >
                          Approve
                        </button>
                        <button
                          onClick={() =>
                            void act(`changes:${contribution.contributionId}`, () =>
                              reviewProjectContribution(
                                project.projectId,
                                contribution.contributionId,
                                "request_changes",
                                "Please clarify the observable city change.",
                              ),
                            )
                          }
                        >
                          Request changes
                        </button>
                      </div>
                    )}
                </li>
              ))}
            </ul>
          )}
        </article>
      </section>
    </WorldSurface>
  );
}
