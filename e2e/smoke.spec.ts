import { expect, test } from "@playwright/test";

test("the app loads with a title, a language and a main landmark", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/Mafatih/);
  await expect(page.locator("html")).toHaveAttribute("lang", /^(en|ar)$/);
  await expect(page.getByRole("main")).toBeVisible();
});
