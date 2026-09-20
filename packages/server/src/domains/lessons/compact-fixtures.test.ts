import fs from "fs";
import path from "path";
import { compactLesson, validateBlocks } from "@flashkarte/shared";

/**
 * The compact way of sending a lesson must mean exactly what the full way means. This takes every
 * real lesson we have authored, writes it compactly, and requires each block list to come back as
 * the same stored blocks. It is the check that the shorter form cannot change what a lesson says.
 */
const FIXTURES = path.join(__dirname, "fixtures");
const files = fs
  .readdirSync(FIXTURES)
  .filter((name) => name.endsWith("-lesson.json"))
  .sort();

interface Lesson {
  screens: { blocks: unknown }[];
  questions: {
    prompt: unknown;
    options: { blocks: unknown; reason: unknown }[];
    variants?: {
      prompt: unknown;
      options: { blocks: unknown; reason: unknown }[];
    }[];
  }[];
}

/** Every block list in a lesson, labelled, so two versions can be compared pairwise. */
function blockLists(lesson: Lesson): [string, unknown][] {
  const lists: [string, unknown][] = [];
  lesson.screens.forEach((screen, s) =>
    lists.push([`screen ${s}`, screen.blocks]),
  );
  lesson.questions.forEach((question, q) => {
    lists.push([`question ${q} prompt`, question.prompt]);
    question.options.forEach((option, o) => {
      lists.push([`question ${q} option ${o}`, option.blocks]);
      lists.push([`question ${q} option ${o} reason`, option.reason]);
    });
    (question.variants ?? []).forEach((variant, v) => {
      lists.push([`question ${q} variant ${v} prompt`, variant.prompt]);
      variant.options.forEach((option, o) => {
        lists.push([`question ${q} variant ${v} option ${o}`, option.blocks]);
        lists.push([
          `question ${q} variant ${v} option ${o} reason`,
          option.reason,
        ]);
      });
    });
  });
  return lists;
}

const read = (name: string): Lesson =>
  JSON.parse(fs.readFileSync(path.join(FIXTURES, name), "utf8"));

describe("the compact form of the real lessons", () => {
  it("finds the lessons", () => {
    expect(files.length).toBeGreaterThanOrEqual(24);
  });

  it.each(files)("%s means exactly the same in compact form", (name) => {
    const full = read(name);
    const compact = compactLesson(full);
    const fullLists = blockLists(full);
    const compactLists = blockLists(compact);
    expect(compactLists.map(([label]) => label)).toEqual(
      fullLists.map(([label]) => label),
    );
    fullLists.forEach(([label, fullBlocks], index) => {
      const compactResult = validateBlocks(compactLists[index][1]);
      expect({ label, issues: compactResult.issues }).toEqual({
        label,
        issues: [],
      });
      expect({ label, blocks: compactResult.blocks }).toEqual({
        label,
        blocks: validateBlocks(fullBlocks).blocks,
      });
    });
  });

  it("is shorter to send, across all the lessons", () => {
    let full = 0;
    let compact = 0;
    for (const name of files) {
      const lesson = read(name);
      full += JSON.stringify(lesson).length;
      compact += JSON.stringify(compactLesson(lesson)).length;
    }
    // eslint-disable-next-line no-console
    console.log(
      `compact form: ${compact.toLocaleString()} of ${full.toLocaleString()} characters (${Math.round((compact / full) * 100)}%)`,
    );
    // About a third shorter. Most of a lesson is its own text, which no form can shrink; what goes is
    // the span objects around every bold or italic word.
    expect(compact / full).toBeLessThan(0.75);
  });
});
