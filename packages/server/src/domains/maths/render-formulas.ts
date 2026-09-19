import { validateBlocks, type FormulaBlock } from "@flashkarte/shared";
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

/** A formula block is a display formula (on its own line). Inline symbols are drawn in a later step. */
const DISPLAY = true;

async function drawn(
  db: Queryable,
  subjectId: string,
  block: FormulaBlock,
  authorKind: assets.AssetAuthor,
): Promise<FormulaBlock> {
  let asset = await assets.findFormulaAsset(
    db,
    subjectId,
    block.latex,
    DISPLAY,
  );
  if (!asset) {
    const picture = renderFormula(block.latex, DISPLAY);
    asset = await assets.insertFormulaAsset(db, {
      subjectId,
      latex: block.latex,
      display: DISPLAY,
      authorKind,
      ...picture,
    });
  }
  return {
    type: "formula",
    latex: block.latex,
    ...(block.spoken && { spoken: block.spoken }),
    assetId: asset.id,
    widthEm: asset.width_em,
    heightEm: asset.height_em,
    depthEm: asset.depth_em,
  };
}

export async function renderBlocks(
  db: Queryable,
  subjectId: string,
  input: unknown,
  authorKind: assets.AssetAuthor = "human",
): Promise<unknown> {
  const { blocks, issues } = validateBlocks(input);
  if (issues.length > 0) return input;
  const rendered = [];
  for (const block of blocks) {
    rendered.push(
      block.type === "formula"
        ? await drawn(db, subjectId, block, authorKind)
        : block,
    );
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
