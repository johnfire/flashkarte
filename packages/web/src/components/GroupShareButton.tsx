import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { DeckSharing } from "../api/types";
import { useGroupSharing } from "../hooks/use-group-sharing";
import { ShareDialog, type ShareRequest } from "./ShareDialog";

interface GroupShareButtonProps {
  itemTitle: string;
  load: () => Promise<DeckSharing>;
  save: (shares: ShareRequest) => Promise<unknown>;
}

/**
 * "Classes & school" for the owner of a deck or course. Renders nothing for
 * individual accounts, which can only share publicly.
 */
export function GroupShareButton({
  itemTitle,
  load,
  save,
}: GroupShareButtonProps) {
  const { t } = useTranslation();
  const canShare = useGroupSharing();
  const [open, setOpen] = useState(false);
  if (!canShare) return null;
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-sm text-indigo-600"
        title={t("decks.sharing.openTitle")}
      >
        {t("decks.sharing.open")}
      </button>
      {open && (
        <ShareDialog
          itemTitle={itemTitle}
          load={load}
          save={save}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
