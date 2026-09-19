import path from "path";
import { test, expect, Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { MAIL_SINK } from "./playwright.config";
import { apiAsSignedInUser, signUpVerifyAndSignIn } from "./support";

// End-to-end coverage for the lesson engine's learner side: a real browser learns a small course
// authored through the API. Missing a question on purpose sends the learner back to the screen
// that teaches it; passing opens the next lesson; and the accessibility of the outline, a screen
// and a question are checked (contrast, roles, labels).

const para = (text: string) => [{ type: "paragraph", spans: [{ text }] }];
const option = (correct: boolean) => ({
  correct,
  blocks: para(correct ? "A right answer" : "A wrong answer"),
  reason: para(correct ? "This is right." : "This is wrong."),
});
const question = (n: number, teaches: string) => ({
  prompt: para(`Question ${n}: which is right?`),
  options: [option(true), option(false)],
  teaches: [teaches],
  covers: ["token"],
  variants: [
    {
      prompt: para(`Question ${n}, worded another way: which is right?`),
      options: [option(true), option(false)],
    },
  ],
});
const DIAGRAM = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 100">
  <title>A resistor and a capacitor in series</title>
  <rect x="10" y="30" width="60" height="40" fill="#fff" stroke="#111" stroke-width="3"/>
  <text x="40" y="56" text-anchor="middle" font-size="16" fill="#111">R</text>
  <line x1="70" y1="50" x2="130" y2="50" stroke="#111" stroke-width="3"/>
  <line x1="130" y1="25" x2="130" y2="75" stroke="#111" stroke-width="3"/>
  <line x1="145" y1="25" x2="145" y2="75" stroke="#111" stroke-width="3"/>
  <script>alert("this is removed")</script>
</svg>`;

const tokensLesson = (diagram: string) => ({
  module: "Input side",
  lesson: {
    slug: "tokens",
    title: "Tokens",
    summary: "What a token is.",
    covers: ["token"],
  },
  screens: [
    {
      ref: "s1",
      blocks: [
        ...para("Teaching text of screen 1"),
        {
          type: "image",
          src: diagram,
          alt: "A resistor and a capacitor in series",
          display: "inline",
          caption: "Figure 1: the circuit",
        },
      ],
    },
    {
      ref: "s2",
      blocks: [
        ...para("Teaching text of screen 2"),
        {
          type: "image",
          src: diagram,
          alt: "The same circuit, large",
          display: "expandable",
          caption: "Open the full circuit",
        },
      ],
    },
    {
      ref: "s3",
      blocks: [
        ...para("Teaching text of screen 3"),
        {
          type: "formula",
          latex: "\\mathrm{softmax}(z)_i = \\frac{e^{z_i}}{\\sum_j e^{z_j}}",
          spoken:
            "softmax of z sub i equals e to the z sub i over the sum over j of e to the z sub j",
        },
        {
          type: "paragraph",
          spans: [
            { text: "Here the key size " },
            { text: "d_k", math: { spoken: "d sub k" } },
            { text: " and the query " },
            { text: "x_i W_Q", math: { spoken: "x sub i times W sub Q" } },
            { text: " sit on the line of text." },
          ],
        },
      ],
    },
    { ref: "s4", blocks: para("Teaching text of screen 4") },
  ],
  questions: [question(1, "s1"), question(2, "s2"), question(3, "s3")],
});

const embeddingsLesson = {
  module: "Input side",
  lesson: {
    slug: "embeddings",
    title: "Embeddings",
    summary: "Numbers with meaning.",
    covers: ["embedding"],
    prerequisites: [
      { lesson: "tokens", reason: "You need tokens before embeddings." },
    ],
  },
  screens: [1, 2, 3, 4].map((n) => ({
    ref: `e${n}`,
    blocks: para(`Embedding text ${n}`),
  })),
  questions: [1, 2, 3].map((n) => ({
    ...question(n, `e${n}`),
    covers: ["embedding"],
  })),
};

async function expectNoAxeViolations(page: Page, what: string) {
  const { violations } = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(
    violations.map(
      (v) =>
        `${v.id}: ${v.help}\n` +
        v.nodes
          .map((n) => `  ${n.target.join(" ")}: ${n.failureSummary}`)
          .join("\n"),
    ),
    `${what} has no WCAG A/AA violations`,
  ).toEqual([]);
}

test("learn a lesson in the browser: read, miss on purpose, be re-taught, pass, and the next lesson opens", async ({
  page,
}) => {
  await signUpVerifyAndSignIn(page, `e2e-learn-${Date.now()}@example.com`);
  const api = await apiAsSignedInUser(page);
  const subject = await api.send("POST", "/subjects", {
    title: "Transformers e2e",
  });
  for (const [slug, name] of [
    ["token", "Token"],
    ["embedding", "Embedding"],
  ]) {
    await api.send("POST", `/subjects/${subject.id}/concepts`, {
      slug,
      name,
      kind: "idea",
    });
  }
  const diagram = await api.send("POST", `/subjects/${subject.id}/assets`, {
    svg: DIAGRAM,
    description: "RC circuit",
  });
  expect(diagram.removed).toEqual(["<script>"]);
  await api.send(
    "POST",
    `/subjects/${subject.id}/lessons/import`,
    tokensLesson(diagram.src),
  );
  await api.send(
    "POST",
    `/subjects/${subject.id}/lessons/import`,
    embeddingsLesson,
  );
  const artifacts = path.dirname(MAIL_SINK);

  // Learn > the subject > its outline.
  await page.goto("/");
  await page.getByRole("link", { name: "Learn", exact: true }).click();
  await page.getByRole("link", { name: /Transformers e2e/ }).click();
  await expect(
    page.getByRole("heading", { name: "Transformers e2e" }),
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: "Input side" })).toBeVisible();
  const row = (title: string) =>
    page
      .getByRole("listitem")
      .filter({ has: page.getByRole("heading", { name: title }) });
  await expect(row("Tokens").getByText("Ready")).toBeVisible();
  await expect(row("Embeddings").getByText("Locked")).toBeVisible();
  await expect(
    row("Embeddings").getByText("Opens after you pass: Tokens"),
  ).toBeVisible();
  await expect(row("Embeddings").getByRole("link")).toHaveCount(0);
  await page.screenshot({ path: path.join(artifacts, "learn-outline.png") });
  await expectNoAxeViolations(page, "the outline");

  // A locked lesson cannot be opened, even by its address.
  await page.goto(page.url() + "/lessons/embeddings");
  await expect(page.getByRole("alert")).toContainText("locked");
  await page.goBack();

  // Screens, one at a time, each with its number.
  await row("Tokens").getByRole("link", { name: "Start" }).click();
  await expect(page.getByText("Screen 1 of 4")).toBeVisible();
  await expect(page.getByText("Teaching text of screen 1")).toBeVisible();
  await expect(page.getByRole("button", { name: "Back" })).toBeDisabled();
  // The stored diagram is fetched with the sign-in and drawn (not a broken image).
  const inline = page.getByRole("img", {
    name: "A resistor and a capacitor in series",
  });
  await expect(inline).toBeVisible();
  await expect
    .poll(() => inline.evaluate((img: HTMLImageElement) => img.naturalWidth))
    .toBeGreaterThan(0);
  await expect(page.getByText("Figure 1: the circuit")).toBeVisible();
  await page.screenshot({ path: path.join(artifacts, "learn-screen.png") });
  await expectNoAxeViolations(page, "a lesson screen with a diagram");
  // On a dark page the diagram keeps its light surface, so its dark lines stay readable.
  await page.getByRole("button", { name: "Switch to dark mode" }).click();
  await page.screenshot({
    path: path.join(artifacts, "learn-screen-dark.png"),
  });
  await expectNoAxeViolations(
    page,
    "a lesson screen with a diagram in dark mode",
  );
  await page.getByRole("button", { name: "Switch to light mode" }).click();

  await page.getByRole("button", { name: "Next" }).click();
  await expect(page.getByText("Teaching text of screen 2")).toBeVisible();

  // An expandable diagram opens full-screen, zooms, and closes back to the same screen.
  await page.getByRole("button", { name: "Show diagram" }).click();
  const big = page.getByRole("dialog", { name: "The same circuit, large" });
  await expect(big).toBeVisible();
  const bigImage = big.getByRole("img");
  await expect
    .poll(() => bigImage.evaluate((img: HTMLImageElement) => img.naturalWidth))
    .toBeGreaterThan(0);
  await page.screenshot({
    path: path.join(artifacts, "learn-diagram-open.png"),
  });
  await expectNoAxeViolations(page, "the open diagram");
  const before = (await bigImage.boundingBox())!.width;
  await page.getByRole("button", { name: "Zoom in" }).click();
  expect((await bigImage.boundingBox())!.width).toBeGreaterThan(before);
  await page.keyboard.press("Escape");
  await expect(big).toBeHidden();
  await expect(page.getByText("Teaching text of screen 2")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Show diagram" }),
  ).toBeFocused();

  await page.getByRole("button", { name: "Back" }).click();
  await expect(page.getByText("Teaching text of screen 1")).toBeVisible();

  // The owner comments on a screen; it is kept against the screen's number for their AI.
  await page.getByRole("button", { name: "Comment on screen 1" }).click();
  await page
    .getByLabel("What is unclear or wrong on screen 1?")
    .fill("What exactly is a byte here?");
  await page.getByRole("button", { name: "Save comment" }).click();
  await expect(page.getByText(/Comment on screen 1 saved/)).toBeVisible();
  const comments = await api.send(
    "GET",
    `/subjects/${subject.id}/lessons/tokens/comments`,
  );
  expect(comments.comments).toEqual([
    expect.objectContaining({
      number: "1",
      body: "What exactly is a byte here?",
    }),
  ]);

  await page.getByRole("button", { name: "Next" }).click();
  await page.getByRole("button", { name: "Next" }).click();

  // Typeset maths: a formula on its own line and symbols inside a sentence, drawn by the server.
  await expect(page.getByText("Teaching text of screen 3")).toBeVisible();
  const softmax = page.getByRole("img", { name: /^softmax of z sub i equals/ });
  await expect(softmax).toBeVisible();
  const symbol = page.getByRole("img", { name: "d sub k", exact: true });
  await expect(symbol).toBeVisible();
  for (const picture of [softmax, symbol]) {
    await expect
      .poll(() => picture.evaluate((img: HTMLImageElement) => img.naturalWidth))
      .toBeGreaterThan(0);
  }
  // The symbol is on the line: its bottom hangs below the text baseline, not floating above it.
  expect(
    await symbol.evaluate((img) => getComputedStyle(img).verticalAlign),
  ).toMatch(/^-/);
  await page.screenshot({ path: path.join(artifacts, "learn-maths.png") });
  await expectNoAxeViolations(page, "a screen with maths");
  await page.getByRole("button", { name: "Switch to dark mode" }).click();
  await page.screenshot({ path: path.join(artifacts, "learn-maths-dark.png") });
  await expectNoAxeViolations(page, "a screen with maths in dark mode");
  await page.getByRole("button", { name: "Switch to light mode" }).click();

  await page.getByRole("button", { name: "Next" }).click();
  await expect(
    page.getByRole("button", { name: "Start the questions" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Start the questions" }).click();

  // The first question: miss it on purpose.
  const check = page.getByRole("button", { name: "Check answer" });
  await expect(check).toBeVisible();
  await expect(page.getByText("Question 1 of 3")).toBeVisible();
  await expectNoAxeViolations(page, "a question");
  await page.getByLabel("A wrong answer", { exact: true }).check();
  await check.click();
  await expect(page.getByText("Not quite.", { exact: true })).toBeVisible();
  await expect(page.getByText("This is wrong.")).toBeVisible();
  await page.screenshot({
    path: path.join(artifacts, "learn-wrong-answer.png"),
  });
  await expectNoAxeViolations(page, "an answered question");

  // The same screen in dark mode: the verdict colours and reasons stay readable.
  await page.getByRole("button", { name: "Switch to dark mode" }).click();
  await page.screenshot({
    path: path.join(artifacts, "learn-wrong-answer-dark.png"),
  });
  await expectNoAxeViolations(page, "an answered question in dark mode");
  await page.getByRole("button", { name: "Switch to light mode" }).click();

  // Sent back to the screen that teaches it (with its number), then asked again.
  await page.getByRole("button", { name: "Look at the screen again" }).click();
  await expect(page.getByText("Re-read 1 of 1")).toBeVisible();
  await expect(page.getByText("Teaching text of screen 1")).toBeVisible();
  await expect(page.getByText("Screen 1", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Continue" }).click();

  // Open book: the screens can be reopened while answering.
  await page.getByRole("button", { name: "Show the screens" }).click();
  await expect(page.getByText("Teaching text of screen 4")).toBeVisible();
  await page.getByRole("button", { name: "Hide the screens" }).click();

  // Answer everything right from here.
  for (let guard = 0; guard < 10; guard++) {
    await expect(check.or(page.getByText("Lesson passed"))).toBeVisible();
    if (await page.getByText("Lesson passed").isVisible()) break;
    await page.getByLabel("A right answer", { exact: true }).check();
    await check.click();
    await expect(page.getByText("Right.", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Continue" }).click();
  }
  await expect(page.getByText("Lesson passed")).toBeVisible();
  await expect(
    page.getByText("2 of 3 questions right on the first try."),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "Embeddings" })).toBeVisible();
  await page.screenshot({ path: path.join(artifacts, "learn-passed.png") });
  await expectNoAxeViolations(page, "the passed screen");

  // Back on the outline: Tokens is passed and Embeddings is open.
  await page.getByRole("link", { name: "Back to the outline" }).click();
  await expect(row("Tokens").getByText("Passed")).toBeVisible();
  await expect(
    row("Tokens").getByText("2 of 3 right on the first try"),
  ).toBeVisible();
  await expect(row("Embeddings").getByText("Ready")).toBeVisible();
  await row("Embeddings").getByRole("link", { name: "Start" }).click();
  await expect(page.getByText("Screen 1 of 4")).toBeVisible();
});
