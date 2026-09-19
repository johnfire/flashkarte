import { useParams } from "react-router";
import type { FormulaBlock, Span } from "@flashkarte/shared";
import { useImageSource } from "./useAssetUrl";

/**
 * Typeset maths. The server drew each formula once, when the screen was saved, so this only shows a
 * picture, sized in em from the numbers the server measured. The picture is one colour that follows
 * the text (`currentColor`), which a plain <img> cannot inherit, so dark mode inverts it. Until the
 * picture arrives (or if it cannot), the LaTeX shows as plain text: readable, never blank.
 */

function useMathSource(assetId: string | undefined) {
  const { subjectId } = useParams<{ subjectId: string }>();
  return useImageSource(subjectId, assetId ? `asset:${assetId}` : "");
}

const em = (value: number | undefined): string | undefined =>
  value === undefined ? undefined : `${value}em`;

/** A formula on its own line. Wide ones scroll sideways rather than shrink. */
export function DisplayFormula({ block }: { block: FormulaBlock }) {
  const source = useMathSource(block.assetId);
  const spoken = block.spoken ?? block.latex;
  return (
    <div className="overflow-x-auto py-1 text-center">
      {source.status === "ready" && block.widthEm !== undefined ? (
        <img
          src={source.url}
          alt={spoken}
          style={{
            width: em(block.widthEm),
            height: em(block.heightEm),
            maxWidth: "none",
            fontSize: "1.15em",
          }}
          className="inline-block dark:invert"
        />
      ) : (
        <span
          role="math"
          aria-label={spoken}
          className="inline-block rounded bg-gray-100 px-3 py-2 font-mono dark:bg-gray-800"
        >
          {block.latex}
        </span>
      )}
    </div>
  );
}

/**
 * A symbol inside a sentence. Its size and how far it hangs below the baseline come from the
 * server, so it sits on the line of text instead of floating above it. The space is reserved while
 * it loads, so the sentence does not jump.
 */
export function InlineMath({ span }: { span: Span }) {
  const math = span.math!;
  const source = useMathSource(math.assetId);
  const spoken = math.spoken ?? span.text;
  if (
    math.widthEm === undefined ||
    math.heightEm === undefined ||
    source.status === "failed"
  ) {
    return (
      <code className="rounded bg-gray-100 px-1 dark:bg-gray-800">
        {span.text}
      </code>
    );
  }
  const box = {
    width: em(math.widthEm),
    height: em(math.heightEm),
    verticalAlign: `${-(math.depthEm ?? 0)}em`,
  };
  return source.status === "ready" ? (
    <img
      src={source.url}
      alt={spoken}
      style={box}
      className="inline-block dark:invert"
    />
  ) : (
    <span role="img" aria-label={spoken} style={box} className="inline-block" />
  );
}
