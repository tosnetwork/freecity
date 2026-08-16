import { expect, test } from "@playwright/test";

test("web scaffold serves the District Zero placeholder", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "FreeCity — District Zero" })).toBeVisible();
});
