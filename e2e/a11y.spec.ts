import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

import { enterDistrict, signIn } from "./helpers";

/**
 * Automated accessibility checks on every slice surface. Serious and
 * critical axe violations are release blockers; the full report is attached
 * to the failure for triage.
 */

async function expectNoSeriousViolations(page: Page, context: string): Promise<void> {
  const results = await new AxeBuilder({ page }).analyze();
  const blocking = results.violations.filter(
    (v) => v.impact === "serious" || v.impact === "critical",
  );
  expect(
    blocking,
    `${context}: ${blocking.map((v) => `${v.id} (${v.impact}): ${v.help}`).join("; ")}`,
  ).toEqual([]);
}

test("landing and login pass axe", async ({ page }) => {
  await page.goto("/");
  await expectNoSeriousViolations(page, "landing");
  await page.goto("/login");
  await expectNoSeriousViolations(page, "login (email phase)");
  await page.getByLabel("Email address").fill("axe@example.com");
  await page.getByRole("button", { name: "Send code" }).click();
  await page.getByTestId("dev-code").waitFor();
  await expectNoSeriousViolations(page, "login (code phase)");
});

test("enter, today, district, and archive pass axe", async ({ page }) => {
  await signIn(page);
  await page.waitForURL("**/enter");
  await expectNoSeriousViolations(page, "enter");

  await page.getByRole("radio", { name: /mediator/i }).check();
  await page.getByLabel("Your name").fill("Axel");
  await page.getByRole("button", { name: "Enter the district" }).click();
  await page.waitForURL("**/today");
  await page.locator("article.card").first().waitFor();
  await expectNoSeriousViolations(page, "today");

  await page.getByRole("link", { name: "District" }).click();
  await page.getByRole("checkbox", { name: /accessible ledger only/i }).check();
  await page.locator('[data-testid="residents"] tbody tr').first().waitFor();
  await expectNoSeriousViolations(page, "district (accessible view)");

  await page.getByRole("link", { name: "Archive" }).click();
  await page.getByRole("heading", { name: "Archive" }).waitFor();
  await expectNoSeriousViolations(page, "archive");
});

test("full slice is keyboard-operable end to end", async ({ page }) => {
  await enterDistrict(page, "Keyla", "reporter");
  // Fresh load so focus starts at the top of the document, then the first
  // Tab lands on the skip link — and ACTIVATING it must move focus into main.
  await page.goto("/today");
  await page.locator("article.card").first().waitFor();
  await page.keyboard.press("Tab");
  await expect(page.locator(".skip-link")).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator("main#main")).toBeFocused();

  // From main, Tab order continues into the page content; reach the first
  // card option by keyboard only and activate it.
  const share = page.getByRole("button", { name: /Open the whole memory/ });
  let hops = 0;
  while (!(await share.evaluate((el) => el === document.activeElement))) {
    await page.keyboard.press("Tab");
    hops += 1;
    expect(hops, "option not reachable by Tab").toBeLessThan(30);
  }
  await page.keyboard.press("Enter");
  await expect(page.getByTestId("reaction")).toBeVisible();
  await expect(page.getByTestId("focus")).toHaveText("2");
});
