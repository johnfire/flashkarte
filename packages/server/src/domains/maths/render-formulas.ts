import {
  validateBlocks,
  type Block,
  type FormulaBlock,
  type Span,
} from "@flashkarte/shared";
import type { Queryable } from "../../db/queryable";
import * as assets from "../assets/assets.repository";
import { renderFormula } from "./formula-renderer";

/**
 * Draws the formulas in a list of blocks, once, when the content is saved. A formula whose picture
 * already exists is reused. Whatever `assetId` or size an author supplied is discarded: they always
 * come from the server's own drawing, so a block can never point at someone else's picture.
 *
 * Content that is not a valid list of blocks is returned untouched: validating it is the caller's
 * job, and it is reported there.
 */

/** A formula block is a display formula (on its own line); a symbol in a sentence is drawn inline. */
const DISPLAY = true;
const INLINE = false;

interface Picture {
  assetId: string;
  widthEm: number;
  heightEm: number;
  depthEm: number;
}

/** The picture of a formula in one style: the stored one, or drawn now and stored for next time. */
async function pictureOf(
  db: Queryable,
  subjectId: string,
  latex: string,
  display: boolean,
  authorKind: assets.AssetAuthor,
): Promise<Picture> {
  let asset = await assets.findFormulaAsset(db, subjectId, latex, display);
  if (!asset) {
    const picture = renderFormula(latex, display);
    asset = await assets.insertFormulaAsset(db, {
      subjectId,
      latex,
      display,
      authorKind,
      ...picture,
    });
  }
  return {
    assetId: asset.id,
    widthEm: asset.width_em,
    heightEm: asset.height_em,
    depthEm: asset.depth_em,
  };
}

async function drawnBlock(
  db: Queryable,
  subjectId: string,
  block: FormulaBlock,
  authorKind: assets.AssetAuthor,
): Promise<FormulaBlock> {
  const picture = await pictureOf(
    db,
    subjectId,
    block.latex,
    DISPLAY,
    authorKind,
  );
  return {
    type: "formula",
    latex: block.latex,
    ...(block.spoken && { spoken: block.spoken }),
    ...picture,
  };
}

async function drawnSpans(
  db: Queryable,
  subjectId: string,
  spans: Span[],
  authorKind: assets.AssetAuthor,
): Promise<Span[]> {
  const drawn: Span[] = [];
  for (const span of spans) {
    if (!span.math) {
      drawn.push(span);
      continue;
    }
    const picture = await pictureOf(
      db,
      subjectId,
      span.text,
      INLINE,
      authorKind,
    );
    drawn.push({
      text: span.text,
      math: {
        ...(span.math.spoken && { spoken: span.math.spoken }),
        ...picture,
      },
    });
  }
  return drawn;
}

async function drawnContent(
  db: Queryable,
  subjectId: string,
  block: Block,
  authorKind: assets.AssetAuthor,
): Promise<Block> {
  switch (block.type) {
    case "formula":
      return drawnBlock(db, subjectId, block, authorKind);
    case "paragraph":
    case "callout":
      return {
        ...block,
        spans: await drawnSpans(db, subjectId, block.spans, authorKind),
      };
    case "list": {
      const items: Span[][] = [];
      for (const item of block.items) {
        items.push(await drawnSpans(db, subjectId, item, authorKind));
      }
      return { ...block, items };
    }
    default:
      return block;
  }
}

export async function renderBlocks(
  db: Queryable,
  subjectId: string,
  input: unknown,
  authorKind: assets.AssetAuthor = "human",
): Promise<unknown> {
  const { blocks, issues } = validateBlocks(input);
  if (issues.length > 0) return input;
  const rendered: Block[] = [];
  for (const block of blocks) {
    rendered.push(await drawnContent(db, subjectId, block, authorKind));
  }
  return rendered;
}

interface OptionFields {
  blocks: unknown;
  reason: unknown;
  [key: string]: unknown;
}

/** A question's prompt and every option's text and reason. */
export async function renderQuestionBlocks(
  db: Queryable,
  subjectId: string,
  fields: { prompt: unknown; options: unknown },
  authorKind: assets.AssetAuthor = "human",
): Promise<{ prompt: unknown; options: unknown }> {
  const options = Array.isArray(fields.options)
    ? (fields.options as OptionFields[])
    : null;
  if (!options) return fields;
  const rendered: OptionFields[] = [];
  for (const option of options) {
    rendered.push({
      ...option,
      blocks: await renderBlocks(db, subjectId, option.blocks, authorKind),
      reason: await renderBlocks(db, subjectId, option.reason, authorKind),
    });
  }
  return {
    prompt: await renderBlocks(db, subjectId, fields.prompt, authorKind),
    options: rendered,
  };
}
