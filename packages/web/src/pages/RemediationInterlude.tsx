import { useTranslation } from "react-i18next";
import { CardText } from "../components/CardText";

interface RemediationInterludeProps {
  front: string;
  back: string;
  onContinue: () => void;
}

/**
 * The no-grade interlude shown after a wrong routed pick on a diagnostic card
 * (Spec 01): the remediation card's front+back together, one Continue button.
 * Dismissing it writes no review event — it's an ordinary card, scheduled
 * normally by SM-2 when its own turn comes.
 */
export function RemediationInterlude({
  front,
  back,
  onContinue,
}: RemediationInterludeProps) {
  const { t } = useTranslation();
  return (
    <>
      <div className="rounded-xl border p-8 shadow-sm">
        <p className="mb-2 text-xs uppercase tracking-wide text-gray-400 dark:text-gray-500">
          {t("study.remediation.title")}
        </p>
        <p className="text-lg font-medium">
          <CardText text={front} />
        </p>
        <div className="mt-6 border-t pt-6">
          <p className="whitespace-pre-wrap text-gray-700 dark:text-gray-300">
            <CardText text={back} />
          </p>
        </div>
      </div>
      <button
        type="button"
        onClick={onContinue}
        className="mt-4 w-full rounded-lg bg-indigo-600 py-3 font-medium text-white"
      >
        {t("study.continue")}
      </button>
    </>
  );
}
