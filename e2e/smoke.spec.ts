import { expect, test } from "@playwright/test";

test("the City Gate opens on the playable District Zero story", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: /Build a city where humans and AI belong/ }),
  ).toBeVisible();
  await expect(page.getByText("The city is already in motion")).toBeVisible();
});
