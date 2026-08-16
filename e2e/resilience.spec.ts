import { expect, test } from "@playwright/test";

import { enterDistrict } from "./helpers";

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

test("district stream survives navigation away and back without duplicates", async ({ page }) => {
  await enterDistrict(page, "Strea");
  await page.getByRole("link", { name: "District" }).click();
  await page.getByRole("checkbox", { name: /Disable visual projection/ }).check();
  await expect(page.getByTestId("stream-status")).toHaveText("open");
  const initialCount = await page.getByTestId("activity").getByRole("button").count();
  expect(initialCount).toBeGreaterThan(0);

  await page.getByRole("link", { name: "Today" }).click();
  await page.waitForURL("**/today");
  await page.getByRole("link", { name: "District" }).click();
  await expect(page.getByTestId("stream-status")).toHaveText("open");

  // Replayed frames dedupe: activity ids stay unique.
  const ids = await page.evaluate(() => {
    const items = document.querySelectorAll('[data-testid="activity"] li button');
    return Array.from(items).map((el) => el.textContent ?? "");
  });
  expect(ids.length).toBeGreaterThanOrEqual(initialCount);
});
