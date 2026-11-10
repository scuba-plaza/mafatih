import { expect, test } from "@playwright/test";

test("the app loads in English, left to right, with a main landmark and the agreed viewport", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/Mafatih/);
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.locator("html")).toHaveAttribute("dir", "ltr");
  await expect(page.locator('meta[name="viewport"]')).toHaveAttribute(
    "content",
    "width=device-width, initial-scale=1, viewport-fit=cover, interactive-widget=resizes-content",
  );
  await expect(page.locator('meta[name="color-scheme"]')).toHaveAttribute("content", "light dark");
  await expect(page.getByRole("main")).toBeVisible();
});
