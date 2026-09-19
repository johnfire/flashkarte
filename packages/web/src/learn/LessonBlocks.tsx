import type { Block, Span } from "@flashkarte/shared";
import { LessonImage } from "./LessonImage";

/**
 * Draws a screen's blocks natively (no markdown): paragraphs and lists of spans, code, callouts,
 * and placeholders for images and formulas until those slices land (a formula shows its LaTeX and
 * is read out as its spoken text).
 */
export function LessonBlocks({ blocks }: { blocks: Block[] }) {
  return (
    <div className="space-y-4">
      {blocks.map((block, index) => (
        <BlockView key={index} block={block} />
      ))}
    </div>
  );
}

function Spans({ spans }: { spans: Span[] }) {
  return (
    <>
      {spans.map((span, index) => {
        let node: React.ReactNode = span.text;
        if (span.code) {
          node = (
            <code className="rounded bg-gray-100 px-1 py-0.5 font-mono text-sm dark:bg-gray-800">
              {node}
            </code>
          );
        }
        if (span.bold) node = <strong>{node}</strong>;
        if (span.italic) node = <em>{node}</em>;
        return <span key={index}>{node}</span>;
      })}
    </>
  );
}

const TONE_STYLE = {
  note: "border-indigo-300 bg-indigo-50 dark:border-indigo-700 dark:bg-indigo-950",
  tip: "border-green-300 bg-green-50 dark:border-green-700 dark:bg-green-950",
  warning:
    "border-amber-300 bg-amber-50 dark:border-amber-700 dark:bg-amber-950",
} as const;

function BlockView({ block }: { block: Block }) {
  switch (block.type) {
    case "paragraph":
      return (
        <p className="leading-relaxed">
          <Spans spans={block.spans} />
        </p>
      );
    case "list": {
      const Tag = block.ordered ? "ol" : "ul";
      return (
        <Tag
          className={`space-y-1 pl-6 ${block.ordered ? "list-decimal" : "list-disc"}`}
        >
          {block.items.map((item, index) => (
            <li key={index}>
              <Spans spans={item} />
            </li>
          ))}
        </Tag>
      );
    }
    case "code":
      return (
        <pre className="overflow-x-auto rounded-lg bg-gray-100 p-4 text-sm dark:bg-gray-800">
          <code>{block.text}</code>
        </pre>
      );
    case "callout":
      return (
        <aside
          className={`rounded-lg border-l-4 p-4 ${TONE_STYLE[block.tone]}`}
        >
          <Spans spans={block.spans} />
        </aside>
      );
    case "image":
      return <LessonImage block={block} />;
    case "formula":
      return (
        <p
          className="overflow-x-auto rounded-lg bg-gray-100 p-4 text-center font-mono dark:bg-gray-800"
          role="math"
          aria-label={block.spoken ?? block.latex}
        >
          {block.latex}
        </p>
      );
  }
}
