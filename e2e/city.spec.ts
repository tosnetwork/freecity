import { expect, test } from "@playwright/test";

import { enterDistrict } from "./helpers";

test("the city can be upgraded and expanded through committed state", async ({ page }) => {
  await enterDistrict(page, "Civic Builder", "builder");
  await page.getByRole("link", { name: "District" }).click();
  await page.waitForURL("**/district");

  const ledgerOnly = page.getByRole("checkbox", { name: "Use accessible ledger only" });
  if (await ledgerOnly.isChecked()) await ledgerOnly.uncheck();
  const canvas = page.getByTestId("city-canvas");
  await expect(canvas).toHaveAttribute("data-projected-residents", /\d+/);
  const projectedResidents = Number(await canvas.getAttribute("data-projected-residents"));
  const totalResidents = Number(await canvas.getAttribute("data-total-residents"));
  expect(projectedResidents).toBeGreaterThan(0);
  expect(projectedResidents).toBeLessThanOrEqual(totalResidents);

  const beacon = page.locator(".building-hotspot", { hasText: "Beacon Tower" });
  await expect(beacon).toContainText("LEVEL 1");
  await beacon.click();
  await page.getByRole("button", { name: /Upgrade to level 2/ }).click();
  await expect(beacon).toContainText("LEVEL 2", { timeout: 10_000 });
  await expect(page.locator(".city-vitals")).toContainText("27");

  await page.reload();
  await expect(page.locator(".building-hotspot", { hasText: "Beacon Tower" })).toContainText(
    "LEVEL 2",
  );

  await page.getByRole("button", { name: /OPEN FRONTIER North Gardens/ }).click();
  await expect(page.locator(".building-hotspot", { hasText: "Canopy Habitat" })).toBeVisible({
    timeout: 10_000,
  });
  await expect(page.locator(".city-vitals")).toContainText("2/4");
  await expect(page.locator(".city-vitals")).toContainText("21");
});
