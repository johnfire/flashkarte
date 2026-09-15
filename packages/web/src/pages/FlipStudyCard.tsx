import { SpeakButton } from "../speech/SpeakButton";
import { CardText } from "../components/CardText";

interface FlipStudyCardProps {
  cardNumberLabel: string;
  category: string | null;
  prompt: string;
  revealed: boolean;
  back: string;
  frontLang?: string | null;
  backLang?: string | null;
  onSpeakFront: () => void;
  onSpeakBack: () => void;
}

/** The Flip-mode card box: front prompt, then (once revealed) the back. */
export function FlipStudyCard({
  cardNumberLabel,
  category,
  prompt,
  revealed,
  back,
  frontLang,
  backLang,
  onSpeakFront,
  onSpeakBack,
}: FlipStudyCardProps) {
  return (
    <div className="rounded-xl border p-8 shadow-sm">
      <p className="mb-2 text-xs uppercase tracking-wide text-gray-400 dark:text-gray-500">
        {cardNumberLabel}
        {category && ` · ${category}`}
      </p>
      <div className="flex items-start justify-between gap-2">
        <p className="text-lg font-medium">
          <CardText text={prompt} />
        </p>
        {frontLang && <SpeakButton lang={frontLang} onSpeak={onSpeakFront} />}
      </div>
      {revealed && (
        <div className="mt-6 flex items-start justify-between gap-2 border-t pt-6">
          <p className="whitespace-pre-wrap text-gray-700 dark:text-gray-300">
            <CardText text={back} />
          </p>
          {backLang && <SpeakButton lang={backLang} onSpeak={onSpeakBack} />}
        </div>
      )}
    </div>
  );
}
