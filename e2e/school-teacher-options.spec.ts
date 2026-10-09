import { expect, test } from "@playwright/test";

test("the landing page leads to the school and teacher options", async ({
  page,
}) => {
  await page.goto("/");
  const schoolTeacherTitle = page.getByRole("heading", {
    name: "Available for schools and teachers",
    exact: true,
  });
  const productTitle = page.getByRole("heading", {
    level: 1,
    name: "LearnWohl",
  });
  const languageSelector = page.getByLabel("Language");

  await expect(schoolTeacherTitle).toBeVisible();
  await expect(productTitle).toBeVisible();
  await expect(languageSelector).toBeVisible();
  await expect(
    page.getByText(
      "Bring your local AI to create courses for you, your friends, your coworkers, and anyone who needs them.",
    ),
  ).toBeVisible();
  const schoolTeacherPosition = await schoolTeacherTitle.boundingBox();
  const productTitlePosition = await productTitle.boundingBox();
  expect(schoolTeacherPosition).not.toBeNull();
  expect(productTitlePosition).not.toBeNull();
  expect(schoolTeacherPosition!.y).toBeLessThan(productTitlePosition!.y);
  const languageSelectorPosition = await languageSelector.boundingBox();
  expect(languageSelectorPosition).not.toBeNull();
  expect(languageSelectorPosition!.y).toBeLessThan(schoolTeacherPosition!.y);

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
