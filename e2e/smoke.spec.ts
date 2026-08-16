import { expect, test } from "@playwright/test";

test("the City Gate opens on the playable District Zero story", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: /Build a city where humans and AI belong/ }),
  ).toBeVisible();
  await expect(page.getByText("The city is already in motion")).toBeVisible();
  await expect(page.getByTestId("city-motion-layer")).toBeVisible();
  await expect(page.locator(".city-master img")).toHaveCSS("animation-name", "city-master-drift");

  const residentLayer = page.getByTestId("world-resident-layer");
  await expect(residentLayer).toHaveAttribute("data-world-event", /\d+:\d+/);
  const residents = page.getByTestId("world-resident");
  await expect.poll(() => residents.count()).toBeGreaterThanOrEqual(2);
  await expect(residents.first()).toHaveAttribute("data-resident-id", /.+/);
  await expect(residents.first()).toHaveAttribute("data-source-event-id", /\d+:\d+/);
  await expect(residents.first()).toHaveCSS("animation-name", "committed-resident-route");
});
