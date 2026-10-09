import { expect, test } from "@playwright/test";

test("the landing page leads to the school and teacher options", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("link", { name: "Explore options for schools & teachers" })
    .click();

  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "LearnWohl for schools and teachers",
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "For schools", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", {
      name: "For independent teachers and tutors",
    }),
  ).toBeVisible();
});
