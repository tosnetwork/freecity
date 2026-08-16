import { expect, test } from "@playwright/test";

import { enterDistrict, TEST_CONTROL_KEY } from "./helpers";

/**
 * Chaos at the browser boundary: duplicate submissions, refresh mid-choice,
 * and stream reconnection must never double-spend Focus or lose events.
 */

test("rapid double submission spends Focus exactly once", async ({ page }) => {
  await enterDistrict(page, "Dupla");

  // Fire the same choice twice at the HTTP layer (bypassing the disabled
  // button) — the second must dedupe to the original command.
  const results = await page.evaluate(async () => {
    const token = window.localStorage.getItem("freecity_token");
    const membership = JSON.parse(window.localStorage.getItem("freecity_membership")!);
    const cardId = `relationship-boundary-test:${membership.residentId}`;
    const submit = () =>
      fetch(`/api/cards/${encodeURIComponent(cardId)}/choose`, {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
        body: JSON.stringify({ optionId: "opt-share", expectedStateVersion: null }),
      }).then((r) => r.json());
    return Promise.all([submit(), submit()]);
  });

  const applied = results.filter((r) => r.status === "applied");
  expect(applied.length).toBe(2); // both see the applied command...
  expect(results[0].commandId).toBe(results[1].commandId); // ...the SAME command
  expect(results.some((r) => r.duplicate)).toBe(true);

  await page.reload();
  await expect(page.getByTestId("focus")).toHaveText("2"); // spent once
  await expect(page.locator("article.card")).toHaveCount(2);
});

test("refresh mid-choice leaves consistent state and a safe retry", async ({ page }) => {
  await enterDistrict(page, "Refra");

  // Start the choice and reload immediately without awaiting the response.
  await page.evaluate(() => {
    const token = window.localStorage.getItem("freecity_token");
    const membership = JSON.parse(window.localStorage.getItem("freecity_membership")!);
    const cardId = `relationship-boundary-test:${membership.residentId}`;
    void fetch(`/api/cards/${encodeURIComponent(cardId)}/choose`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
      body: JSON.stringify({ optionId: "opt-private", expectedStateVersion: null }),
      keepalive: true,
    });
  });
  await page.reload();
  await page.waitForURL("**/today");

  // Whatever the interrupted request's fate, state is consistent: Focus is
  // 3 (opt-private costs 0) and the card is either resolved or retryable.
  await expect(page.getByTestId("focus")).toHaveText("3");
  const cardCount = await page.locator("article.card").count();
  if (cardCount === 3) {
    await page.getByRole("button", { name: /Keep it private/ }).click();
    await expect(page.getByTestId("reaction")).toContainText("boundary");
  }
  await expect(page.locator("article.card")).toHaveCount(2);
});

test("SSE stream reconnects mid-mount via Last-Event-ID with no loss or duplicates", async ({
  page,
  request,
}) => {
  // Observe every stream connection the page makes, including reconnects.
  const streamRequests: (string | null)[] = [];
  await page.route("**/api/events**", async (route) => {
    streamRequests.push(route.request().headers()["last-event-id"] ?? null);
    await route.continue();
  });

  await enterDistrict(page, "Strea");
  const { token, residentId } = await page.evaluate(() => ({
    token: window.localStorage.getItem("freecity_token"),
    residentId: JSON.parse(window.localStorage.getItem("freecity_membership")!).residentId,
  }));

  await page.getByRole("link", { name: "District" }).click();
  await page.getByRole("checkbox", { name: /accessible ledger only/i }).check();
  await expect(page.getByTestId("stream-status")).toHaveText("open");
  const eventIds = () =>
    page.$$eval('[data-testid="activity"] li button', (els) =>
      els.map((el) => el.getAttribute("data-event-id") ?? ""),
    );
  const maxSeq = (ids: string[]) => Math.max(0, ...ids.map((id) => Number(id.split(":")[0])));

  // Wait until the from-0 replay has caught up to the district's current
  // head before sampling — otherwise "before" is a mid-replay snapshot.
  const authedGet = { authorization: `Bearer ${token!}` };
  const head = (
    (await (
      await request.get("http://localhost:3001/api/today", { headers: authedGet })
    ).json()) as { lastSequence: number }
  ).lastSequence;
  await expect
    .poll(async () => maxSeq(await eventIds()), { timeout: 15_000 })
    .toBeGreaterThanOrEqual(head);
  const beforeIds = await eventIds(); // DOM order: newest first
  expect(new Set(beforeIds).size).toBe(beforeIds.length);

  // Sever the connection server-side (deploy/restart stand-in) while the
  // page stays mounted, then commit new events BEFORE the client's
  // reconnect completes — they must arrive via the resume, not the old
  // stream.
  const authed = { authorization: `Bearer ${token}`, "content-type": "application/json" };
  const kill = await request.post("http://localhost:3001/api/dev/kill-streams", {
    headers: { ...authed, "x-test-control-key": TEST_CONTROL_KEY },
    data: {},
  });
  expect(kill.status()).toBe(200);
  expect((await kill.json()).killed).toBeGreaterThan(0);

  const decline = await request.post(
    `http://localhost:3001/api/cards/${encodeURIComponent(
      `district-competing-plans:${residentId}`,
    )}/decline`,
    { headers: authed, data: { reason: null } },
  );
  expect(decline.status()).toBe(200);
  const declineBody = await decline.json();
  expect(declineBody.status).toBe("applied");
  const missedEventId = `${declineBody.districtSequence}:0`; // the CardDeclined event

  // The client reconnects on its own and must deliver the missed events.
  await expect(page.getByTestId("stream-status")).toHaveText("open", { timeout: 15_000 });
  await expect
    .poll(async () => (await eventIds()).includes(missedEventId), { timeout: 15_000 })
    .toBe(true);

  const afterIds = await eventIds();
  expect(new Set(afterIds).size).toBe(afterIds.length); // no duplicates
  expect(afterIds.filter((id) => id === missedEventId)).toHaveLength(1); // delivered exactly once
  // No loss across the reconnect: the activity log is capped, so assert on
  // the most recent pre-disconnect ids (DOM is newest-first), which the one
  // or two new events cannot have evicted.
  for (const id of beforeIds.slice(0, 20)) {
    expect(afterIds).toContain(id);
  }

  expect(streamRequests[0]).toBeNull(); // initial connection starts fresh
  const resumes = streamRequests.slice(1).filter((h) => h !== null);
  expect(resumes.length).toBeGreaterThan(0); // at least one true resume happened
  expect(resumes[resumes.length - 1]).toMatch(/^\d+:\d+$/);
});
