import { expect, test } from "@playwright/test";
import { signUpVerifyAndSignIn } from "./support";

test("a teacher can import a flashcard deck from a CSV file", async ({
  page,
}) => {
  const email = `e2e-csv-import-${Date.now()}@example.com`;
  await signUpVerifyAndSignIn(page, email);

  await page.goto("/courses/import");
  await expect(
    page.getByRole("heading", { name: "Import a deck collection" }),
  ).toBeVisible();

  await page.goto("/decks/new");
  await page.locator('input[type="file"]').setInputFiles({
    name: "french-basics.csv",
    mimeType: "text/csv",
    buffer: Buffer.from(
      "front,answer,explanation\nBonjour,Hello,A friendly greeting\nMerci,Thank you,\n",
    ),
  });
  await expect(page.getByText("Your CSV is ready to import.")).toBeVisible();
  await page.getByRole("button", { name: "Save deck" }).click();

  await expect(page.getByText("french-basics", { exact: true })).toBeVisible();
  await page.getByRole("link", { name: "Manage", exact: true }).click();
  await expect(page.getByText("Bonjour")).toBeVisible();
  await expect(page.getByText("Merci")).toBeVisible();
});
