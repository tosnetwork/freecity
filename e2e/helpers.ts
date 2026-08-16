import { expect, type Page } from "@playwright/test";

/** Signs in through the dev email-code flow and returns the email used. */
export async function signIn(page: Page, email?: string): Promise<string> {
  const address = email ?? `e2e-${Date.now()}-${Math.floor(Math.random() * 1e6)}@example.com`;
  await page.goto("/login");
  await page.getByLabel("Email address").fill(address);
  await page.getByRole("button", { name: "Send code" }).click();
  const code = await page.getByTestId("dev-code").textContent();
  expect(code).toMatch(/^\d{6}$/);
  await page.getByLabel("Code", { exact: true }).fill(code!);
  await page.getByRole("button", { name: "Sign in" }).click();
  return address;
}

/** Signs in with a fresh account and enters District Zero. */
export async function enterDistrict(
  page: Page,
  displayName: string,
  role = "builder",
): Promise<string> {
  const email = await signIn(page);
  await page.waitForURL("**/enter");
  await page.getByRole("radio", { name: new RegExp(role, "i") }).check();
  await page.getByLabel("Your name").fill(displayName);
  await page.getByRole("button", { name: "Enter the district" }).click();
  await page.waitForURL("**/today");
  await expect(page.getByTestId("focus")).toHaveText("3");
  return email;
}
