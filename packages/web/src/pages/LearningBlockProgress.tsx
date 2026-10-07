import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { api } from "../api/client";
import type { LearningBlock } from "../api/types";

interface LearningBlockProgressProps {
  deckId: string;
  /** Changes whenever the learner rates a card, so the mastered count stays current. */
  refreshKey: number;
}

/**
 * "Block 3 of 25 · 12/40 mastered" for decks studied in learning blocks. Shown only
 * for decks bigger than one block. Purely informational: if the stats call fails or
 * the server predates blocks, it renders nothing and study carries on.
 */
export function LearningBlockProgress({
  deckId,
  refreshKey,
}: LearningBlockProgressProps) {
  const { t } = useTranslation();
  const [block, setBlock] = useState<LearningBlock | null>(null);

  useEffect(() => {
    let active = true;
    api.study
      .stats(deckId)
      .then((stats) => {
        if (active) setBlock(stats.learning_block ?? null);
      })
      .catch(() => {
        if (active) setBlock(null);
      });
    return () => {
      active = false;
    };
  }, [deckId, refreshKey]);

  if (!block || block.blocks_total <= 1) return null;

  const text =
    block.current_block === null
      ? t("study.blocksComplete", { total: block.blocks_total })
      : t("study.blockProgress", {
          current: block.current_block,
          total: block.blocks_total,
          mastered: block.current_block_mastered,
          size: block.current_block_cards,
        });

  return (
    <p className="-mt-2 mb-4 text-center text-xs text-gray-500 dark:text-gray-400">
      {text}
    </p>
  );
}
