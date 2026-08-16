import { expect, test } from "@playwright/test";

import { enterDistrict, signIn, TEST_CONTROL_KEY } from "./helpers";

/**
 * The complete Phase 1 vertical slice, end to end, keyboard-first:
 * enter → three authored cards → choice → Focus once → immediate reaction
 * after the authoritative result → decline → District parity → Archive.
 */

test("full slice: enter, choose, decline, district parity, archive", async ({ page }) => {
  await enterDistrict(page, "Vera");

  // Today: three authored cards and a committed-events WYWA.
  await expect(page.locator("article.card")).toHaveCount(3);
  await expect(page.getByTestId("wywa")).toContainText("Vera joined District Zero");
  await expect(page.getByTestId("wywa")).not.toContainText("human-");

  // Keyboard-only choice on the 1-Focus option.
  const share = page.getByRole("button", { name: /Open the whole memory/ });
  await share.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByTestId("reaction")).toContainText("Nia");
  await expect(page.getByTestId("focus")).toHaveText("2");
  await expect(page.locator("article.card")).toHaveCount(2);

  // Decline is free.
  await page.getByRole("button", { name: "Decline" }).first().click();
  await expect(page.locator("article.card")).toHaveCount(1);
  await expect(page.getByTestId("focus")).toHaveText("2");
  await expect(page.getByRole("heading", { name: "Before the next light" })).toBeVisible();

  // Delayed consequence: advance the dev clock past the 60-minute delay,
  // "return" to Today, and the WYWA must cite the committed
  // ConsequenceResolved — the full return journey of the Phase 1 slice.
  const setClock = (now: string | null) =>
    page.evaluate(
      async ({ value, controlKey }) => {
        const token = window.localStorage.getItem("freecity_token");
        const response = await fetch("/api/dev/clock", {
          method: "POST",
          headers: {
            "content-type": "application/json",
            authorization: `Bearer ${token}`,
            "x-test-control-key": controlKey,
          },
          body: JSON.stringify({ now: value }),
        });
        if (!response.ok) throw new Error(`dev clock: ${response.status}`);
      },
      { value: now, controlKey: TEST_CONTROL_KEY },
    );
  try {
    await setClock(new Date(Date.now() + 2 * 3_600_000).toISOString());
    await page.reload();
    await expect(page.getByTestId("wywa")).toContainText(
      "Nia carried your memory into the Beacon song. Two residents answered with memories of their own.",
    );
    await expect(page.getByRole("heading", { name: "Before the next light" })).toBeHidden();
  } finally {
    await setClock(null);
  }

  // District: accessible DOM parity with the projection disabled.
  await page.getByRole("link", { name: "District" }).click();
  await page.getByRole("checkbox", { name: /accessible ledger only/i }).check();
  await expect(page.locator('[data-testid="residents"] tbody tr')).not.toHaveCount(0);
  await expect(page.getByTestId("activity").getByRole("button").first()).toBeVisible();

  // Keyboard-operable detail panel.
  await page.getByTestId("activity").getByRole("button").first().focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("heading", { name: "Event detail" })).toBeVisible();

  // Projection enabled: either the canvas mounts or the graceful-failure
  // note appears (headless CI GPUs vary) — and DOM parity holds either way.
  await page.getByRole("checkbox", { name: /accessible ledger only/i }).uncheck();
  await expect(
    page.locator(".projection canvas").or(page.getByTestId("projection-failed")),
  ).toBeVisible({ timeout: 20_000 });
  await expect(page.locator('[data-testid="residents"]')).toBeVisible();

  // Archive holds the committed record.
  await page.getByRole("link", { name: "Archive" }).click();
  await expect(page.getByTestId("archive")).toContainText("Chose");
  await expect(page.getByTestId("archive")).toContainText("Declined");
});

test("pre-entry guards: Today and Archive redirect to /enter without errors", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));

  await signIn(page);
  await page.waitForURL("**/enter");
  await page.goto("/archive");
  await page.waitForURL("**/enter");
  await page.goto("/today");
  await page.waitForURL("**/enter");
  expect(errors).toEqual([]);
});

test("reduced motion preserves all information", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await enterDistrict(page, "Rei", "creator");
  await page.getByRole("link", { name: "District" }).click();
  await page.getByRole("checkbox", { name: /accessible ledger only/i }).check();
  await expect(page.locator('[data-testid="residents"] tbody tr')).not.toHaveCount(0);
  await expect(page.getByTestId("activity").getByRole("button").first()).toBeVisible();
});
