import { expect, test } from "@playwright/test";
import { apiAsSignedInUser, signUpVerifyAndSignIn } from "./support";

test("deck language switches persist without changing the course choice", async ({
  page,
}) => {
  await signUpVerifyAndSignIn(page, `e2e-languages-${Date.now()}@example.com`);
  const api = await apiAsSignedInUser(page);
  await api.send("POST", "/decks", {
    markdown: "# English Notes\n\n**1. Question**\nAnswer\n",
    contentLanguage: "en",
  });
  await api.send("POST", "/decks", {
    markdown: "# Arabic Notes\n\n**1. سؤال**\nجواب\n",
    contentLanguage: "ar",
  });

  await page.goto("/");
  await expect(page.getByText("English Notes")).toBeVisible();
  await expect(page.getByText("Arabic Notes")).toBeVisible();
  await page.getByRole("button", { name: "العربية" }).click();
  await expect(page.getByText("Arabic Notes")).toBeVisible();
  await expect(page.getByText("English Notes")).toHaveCount(0);

  await page.goto("/learn");
  await expect(page.getByRole("button", { name: "All" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await page.goto("/");
  await expect(page.getByRole("button", { name: "العربية" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await page.goto("/?language=all");
  await expect(page.getByText("English Notes")).toBeVisible();
});
