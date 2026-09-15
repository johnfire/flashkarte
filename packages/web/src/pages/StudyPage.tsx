import { useParams } from "react-router";
import { useTranslation } from "react-i18next";
import { useStudySession } from "../study/useStudySession";
import { StudyNotice } from "./StudyNotice";
import { StudyControls } from "./StudyControls";
import { StudyHeader } from "./StudyHeader";
import { FlipStudyCard } from "./FlipStudyCard";
import { ChoicePanel } from "./ChoicePanel";
import { RemediationInterlude } from "./RemediationInterlude";

export function StudyPage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const s = useStudySession(id);

  if (s.error) {
    return <StudyNotice body={s.error} tone="error" />;
  }
  if (s.loading) {
    return (
      <p className="p-8 text-center text-gray-500 dark:text-gray-400">
        {t("study.loading")}
      </p>
    );
  }
  if (s.unstudiable) {
    return (
      <StudyNotice
        title={t("study.branchingTitle")}
        body={t("study.branchingBody")}
      />
    );
  }
  if (s.done) {
    return (
      <StudyNotice
        title={t("study.complete")}
        body={
          s.reviewedCount === 0
            ? t("study.nothingDue")
            : t("study.reviewed", { count: s.reviewedCount })
        }
      />
    );
  }

  const card = s.current!;
  const cards = s.cards!;
  const header = (
    <StudyHeader
      mode={s.mode}
      onModeChange={s.setMode}
      showMute={s.mode === "flip" && s.canSpeak}
      muted={s.muted}
      onToggleMute={() => {
        if (!s.muted) s.cancel();
        s.setMuted(!s.muted);
      }}
      current={s.idx + 1}
      total={cards.length}
    />
  );

  if (s.remediation) {
    return (
      <div className="mx-auto max-w-xl p-4">
        {header}
        <RemediationInterlude
          front={s.remediation.content.front ?? ""}
          back={s.remediation.content.back ?? ""}
          onContinue={s.dismissRemediation}
        />
      </div>
    );
  }

  const cardNumberLabel = t("study.cardNumber", { number: card.position + 1 });

  return (
    <div className="mx-auto max-w-xl p-4">
      {header}

      {s.mode === "choice" ? (
        <ChoicePanel
          cardNumberLabel={cardNumberLabel}
          category={card.category}
          front={s.promptText}
          options={s.options}
          selected={s.selectedOption}
          onChoose={s.chooseAnswer}
          onContinue={s.continueChoice}
        />
      ) : (
        <>
          <FlipStudyCard
            cardNumberLabel={cardNumberLabel}
            category={card.category}
            prompt={s.promptText}
            revealed={s.revealed}
            back={card.content.back}
            frontLang={s.speech.frontLang}
            backLang={s.speech.backLang}
            onSpeakFront={() => s.speakSide("front")}
            onSpeakBack={() => s.speakSide("back")}
          />
          <StudyControls
            revealed={s.revealed}
            onReveal={s.reveal}
            onGrade={s.grade}
          />
        </>
      )}
    </div>
  );
}
