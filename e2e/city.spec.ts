import { expect, test } from "@playwright/test";

import { enterDistrict } from "./helpers";

test("the city can be upgraded and expanded through committed state", async ({ page }) => {
  await enterDistrict(page, "Civic Builder", "builder");
  await page.getByRole("link", { name: "District" }).click();
  await page.waitForURL("**/district");

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
