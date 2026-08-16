import { expect, test } from "@playwright/test";

import { enterDistrict } from "./helpers";

test("City World R2: identity, people, project, market, civic, place and archive form one city", async ({
  page,
}) => {
  await enterDistrict(page, "Sora", "builder");

  for (const name of [
    "Today",
    "Resident",
    "District",
    "People",
    "Projects",
    "Market",
    "Civic",
    "Archive",
  ]) {
    await expect(page.getByRole("link", { name, exact: true })).toBeVisible();
  }

  await page.getByRole("link", { name: "Resident", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Sora", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Mira", exact: true })).toBeVisible();
  await expect(page.getByText(/cannot vote, pay, accept relationships/i)).toBeVisible();
  await page.getByLabel(/Allow my AI resident to prepare drafts and routes/).uncheck();
  await page.getByRole("button", { name: "Commit preference changes" }).click();
  await expect(page.getByRole("status")).toContainText("Committed");

  await page.getByRole("link", { name: "People", exact: true }).click();
  const nia = page.locator("article.resident-card").filter({ hasText: "Nia" });
  await nia.getByRole("button", { name: "Invite relationship" }).click();
  await expect(nia.getByRole("button", { name: "Cancel invitation" })).toBeVisible();
  await page.getByLabel("Name").fill("Founding Lights");
  await page
    .getByLabel("Shared purpose")
    .fill("Make contribution visible without faking consensus.");
  await page.getByRole("button", { name: "Create forming Circle" }).click();
  await expect(page.getByRole("heading", { name: "Founding Lights" })).toBeVisible();
  await expect(page.getByText("FORMING · NEEDS 3 MEMBERS")).toBeVisible();

  await page.getByRole("link", { name: "Projects", exact: true }).click();
  await page.getByRole("link", { name: "Repair the East Relay" }).click();
  await page.getByRole("button", { name: "Join this project" }).click();
  await page.getByRole("button", { name: "Claim" }).first().click();
  await page
    .getByLabel("What changed")
    .fill("Mapped the east junction and documented the observable fault.");
  await page.getByRole("button", { name: "Submit for review" }).click();
  await expect(page.getByText(/Mapped the east junction/)).toBeVisible();
  await expect(page.getByText(/work · submitted/)).toBeVisible();

  await page.getByRole("link", { name: "Market", exact: true }).click();
  await expect(page.getByText("PAYMENT READINESS · UNAVAILABLE")).toBeVisible();
  await expect(page.getByRole("button", { name: "Pay with TOS / stablecoin" })).toBeDisabled();
  await page.getByLabel("Title").fill("Need a Signal Garden observer");
  await page
    .getByLabel("Scope")
    .fill("Attend one public session and record the committed outcome.");
  await page.getByRole("button", { name: "Post free collaboration" }).click();
  await expect(page.getByRole("heading", { name: "Need a Signal Garden observer" })).toBeVisible();

  await page.getByRole("link", { name: "Civic", exact: true }).click();
  await expect(page.getByRole("heading", { name: "District Steward" })).toBeVisible();
  await expect(page.getByText(/Cannot move resident assets/)).toBeVisible();
  await expect(
    page.getByText(/Token holdings provide no voting weight|No candidates or votes are fabricated/),
  ).toBeVisible();

  await page.getByRole("link", { name: "District", exact: true }).click();
  await page
    .getByRole("navigation", { name: "District places" })
    .getByRole("link", { name: "Beacon" })
    .click();
  await expect(page.getByRole("heading", { name: "Beacon Square" })).toBeVisible();
  await page.getByRole("button", { name: "Go to Beacon Square" }).click();
  await expect(page.getByRole("button", { name: "You are here" })).toBeDisabled();

  await page.getByRole("link", { name: "Archive", exact: true }).click();
  await expect(page.getByTestId("archive")).toContainText("Founded the Circle");
  await expect(page.getByTestId("archive")).toContainText("Joined Repair the East Relay");
  await expect(page.getByTestId("archive")).toContainText("Submitted to Repair the East Relay");
  await expect(page.getByTestId("archive")).toContainText("Posted Need a Signal Garden observer");
  await expect(page.getByTestId("archive")).toContainText("Visited beacon-square");
});
