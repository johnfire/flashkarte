import { validateBlocks, type Block, type Span } from "./lesson-blocks";
import { spansToMarkup } from "./inline-markup";

/**
 * The compact way of writing a lesson's blocks (see inline-markup.ts), the reverse of what the
 * validator accepts. It makes a lesson far shorter to send to the import tools, and it is how we
 * check that the compact and full forms mean exactly the same thing.
 *
 * Anything that cannot be written compactly and read back identically keeps its full form, so this
 * never changes what a lesson says.
 */

const spansOrMarkup = (spans: Span[]): string | Span[] =>
  spansToMarkup(spans) ?? spans;

function compactBlock(block: Block): unknown {
  switch (block.type) {
    case "paragraph": {
      const markup = spansToMarkup(block.spans);
      return markup ?? { type: "paragraph", spans: block.spans };
    }
    case "callout": {
      const markup = spansToMarkup(block.spans);
      return {
        type: "callout",
        ...(block.tone !== "note" && { tone: block.tone }),
        ...(markup !== null ? { text: markup } : { spans: block.spans }),
      };
    }
    case "list":
      return {
        type: "list",
        ...(block.ordered && { ordered: true }),
        items: block.items.map(spansOrMarkup),
      };
    default:
      return block;
  }
}

/** A block list in compact form: a bare string when it is a single plain paragraph. */
export function toCompactBlocks(input: unknown): unknown {
  const { blocks, issues } = validateBlocks(input);
  if (issues.length > 0) return input;
  const compact = blocks.map(compactBlock);
  return compact.length === 1 && typeof compact[0] === "string"
    ? compact[0]
    : compact;
}

interface OptionShape {
  blocks?: unknown;
  reason?: unknown;
  [key: string]: unknown;
}
interface QuestionShape {
  prompt?: unknown;
  options?: unknown;
  variants?: unknown;
  [key: string]: unknown;
}

const compactOptions = (options: unknown): unknown =>
  Array.isArray(options)
    ? options.map((option: OptionShape) => ({
        ...option,
        blocks: toCompactBlocks(option.blocks),
        reason: toCompactBlocks(option.reason),
      }))
    : options;

const compactQuestion = (question: QuestionShape): QuestionShape => ({
  ...question,
  prompt: toCompactBlocks(question.prompt),
  options: compactOptions(question.options),
  ...(Array.isArray(question.variants) && {
    variants: question.variants.map((variant: QuestionShape) => ({
      ...variant,
      prompt: toCompactBlocks(variant.prompt),
      options: compactOptions(variant.options),
    })),
  }),
});

/** A whole lesson (as sent to import_lesson) with every block list in compact form. */
export function compactLesson<
  T extends { screens?: unknown; questions?: unknown },
>(lesson: T): T {
  return {
    ...lesson,
    ...(Array.isArray(lesson.screens) && {
      screens: lesson.screens.map((screen: { blocks?: unknown }) => ({
        ...screen,
        blocks: toCompactBlocks(screen.blocks),
      })),
    }),
    ...(Array.isArray(lesson.questions) && {
      questions: lesson.questions.map(compactQuestion),
    }),
  };
}
