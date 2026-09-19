import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Routes, Route } from "react-router";
import { StudyPage } from "./StudyPage";
import { api, reportClientError } from "../api/client";
import { resetVoiceCache } from "../speech/voices";
import "../i18n";

vi.mock("../api/client", () => ({
  api: {
    study: { batch: vi.fn(), review: vi.fn(), markRead: vi.fn() },
    decks: { settings: vi.fn(), get: vi.fn() },
  },
  ApiError: class ApiError extends Error {},
  reportClientError: vi.fn(),
}));

// Mutable so a test can study as a user with speech configured.
let mockUser: Record<string, unknown> | null = null;
vi.mock("../auth/AuthContext", () => ({
  useAuth: () => ({ user: mockUser }),
}));

const mockApi = api as unknown as {
  study: {
    batch: ReturnType<typeof vi.fn>;
    review: ReturnType<typeof vi.fn>;
    markRead: ReturnType<typeof vi.fn>;
  };
  decks: { settings: ReturnType<typeof vi.fn>; get: ReturnType<typeof vi.fn> };
};
const mockReportClientError = reportClientError as ReturnType<typeof vi.fn>;

interface FakeUtterance {
  text: string;
  lang: string;
  rate: number;
}

const spoken: FakeUtterance[] = [];
let cancels = 0;

function installSpeech(voiceLangs: string[]) {
  const voices = voiceLangs.map((lang) => ({ lang, name: `voice-${lang}` }));
  class FakeUtteranceCtor {
    text: string;
    lang = "";
    voice: unknown = null;
    rate = 1;
    constructor(text: string) {
      this.text = text;
    }
  }
  vi.stubGlobal("SpeechSynthesisUtterance", FakeUtteranceCtor);
  vi.stubGlobal("speechSynthesis", {
    getVoices: () => voices,
    speak: (u: FakeUtterance) =>
      spoken.push({ text: u.text, lang: u.lang, rate: u.rate }),
    cancel: () => {
      cancels += 1;
    },
    addEventListener: () => {},
    removeEventListener: () => {},
  });
}

const DECK_SILENT = {
  speech_enabled: null,
  speech_front_lang: null,
  speech_back_lang: null,
  speech_autoplay: null,
  speech_rate: null,
};

function renderStudy() {
  return render(
    <MemoryRouter initialEntries={["/decks/d1/study"]}>
      <Routes>
        <Route path="/decks/:id/study" element={<StudyPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("StudyPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetVoiceCache();
    spoken.length = 0;
    cancels = 0;
    mockUser = null;
    mockApi.decks.settings.mockResolvedValue(DECK_SILENT);
    mockApi.decks.get.mockResolvedValue({ cards: [] });
    installSpeech(["de-DE", "en-GB"]);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    window.sessionStorage.clear();
    window.localStorage.clear();
  });

  test("reveals the answer then grades via the API", async () => {
    mockApi.study.batch.mockResolvedValue([
      {
        id: "c1",
        content: { front: "Front?", back: "Back!" },
        category: null,
        position: 0,
      },
    ]);
    mockApi.study.review.mockResolvedValue({});

    renderStudy();

    expect(await screen.findByText("Front?")).toBeInTheDocument();
    expect(screen.queryByText("Back!")).not.toBeInTheDocument();
    expect(screen.getByText("Card #1")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /Show answer/ }));
    expect(screen.getByText("Back!")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Good" }));
    expect(mockApi.study.review).toHaveBeenCalledWith("c1", 4, undefined);

    await waitFor(() =>
      expect(screen.getByText(/Session complete/)).toBeInTheDocument(),
    );
  });

  test("a lapsed card comes back later in the same session", async () => {
    mockApi.study.batch.mockResolvedValue([
      {
        id: "c1",
        content: { front: "Front?", back: "Back!" },
        category: null,
        position: 0,
      },
      {
        id: "c2",
        content: { front: "Second?", back: "Two!" },
        category: null,
        position: 1,
      },
    ]);
    mockApi.study.review.mockResolvedValue({});

    renderStudy();

    // Fail the first card: it should be re-queued behind the second one.
    await userEvent.click(
      await screen.findByRole("button", { name: /Show answer/ }),
    );
    await userEvent.click(screen.getByRole("button", { name: "Again" }));
    expect(mockApi.study.review).toHaveBeenCalledWith("c1", 1, undefined);

    expect(await screen.findByText("Second?")).toBeInTheDocument();
    expect(screen.getByText("Card #2")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /Show answer/ }));
    await userEvent.click(screen.getByRole("button", { name: "Good" }));

    // The failed card is drilled again before the session can end. It still
    // shows its own deck position (#1), not the session's running slot (3rd).
    expect(await screen.findByText("Front?")).toBeInTheDocument();
    expect(screen.getByText("Card #1")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /Show answer/ }));
    await userEvent.click(screen.getByRole("button", { name: "Good" }));

    await waitFor(() =>
      expect(screen.getByText(/Session complete/)).toBeInTheDocument(),
    );
    // Two distinct cards, three reviews - the summary counts cards.
    expect(screen.getByText(/2 cards/)).toBeInTheDocument();
  });

  test("Hard and Good do not re-queue the card", async () => {
    mockApi.study.batch.mockResolvedValue([
      {
        id: "c1",
        content: { front: "Front?", back: "Back!" },
        category: null,
        position: 0,
      },
    ]);
    mockApi.study.review.mockResolvedValue({});

    renderStudy();

    await userEvent.click(
      await screen.findByRole("button", { name: /Show answer/ }),
    );
    await userEvent.click(screen.getByRole("button", { name: "Hard" }));
    expect(mockApi.study.review).toHaveBeenCalledWith("c1", 3, undefined);

    await waitFor(() =>
      expect(screen.getByText(/Session complete/)).toBeInTheDocument(),
    );
  });

  describe("sense cards (Spec 10)", () => {
    const sense = (over = {}) => ({
      context: "Der Zug fährt um 8 Uhr ab.",
      hint: "Eisenbahn",
      word: "der-zug",
      index: 0,
      count: 3,
      ...over,
    });

    test("a chained sense is prompted by its hint, not the bare headword", async () => {
      mockApi.study.batch.mockResolvedValue([
        {
          id: "s1",
          content: { front: "der Zug", back: "train", sense: sense() },
          phase: "chain",
          category: null,
          position: 0,
        },
      ]);
      renderStudy();
      expect(
        await screen.findByText("der Zug — Eisenbahn?"),
      ).toBeInTheDocument();
      expect(screen.queryByText("der Zug")).not.toBeInTheDocument();
    });

    test("a graduated sense is prompted by its context sentence", async () => {
      mockApi.study.batch.mockResolvedValue([
        {
          id: "s1",
          content: { front: "der Zug", back: "train", sense: sense() },
          phase: "split",
          category: null,
          position: 0,
        },
      ]);
      renderStudy();
      expect(
        await screen.findByText("Der Zug fährt um 8 Uhr ab."),
      ).toBeInTheDocument();
    });

    test("a card with no sense renders its front exactly as before", async () => {
      mockApi.study.batch.mockResolvedValue([
        {
          id: "c1",
          content: { front: "Front?", back: "Back!" },
          category: null,
          position: 0,
        },
      ]);
      renderStudy();
      expect(await screen.findByText("Front?")).toBeInTheDocument();
    });
  });

  // Reached by direct URL: the deck list hides Study for branching decks, but a
  // bookmark or a pasted link still lands here. Branch cards carry
  // { label, prompt, options } and no front, and the study queue has no type
  // field to filter on, so the page guards on shape.
  test("a branching deck says so instead of rendering blank cards", async () => {
    mockApi.study.batch.mockResolvedValue([
      {
        id: "b1",
        content: {
          label: "start",
          prompt: "You reach a fork. Which way?",
          options: [{ text: "Go left", goto: "cave" }],
        },
        category: null,
        position: 0,
      },
    ]);

    renderStudy();

    expect(
      await screen.findByText(/Not studiable on the web/),
    ).toBeInTheDocument();
    // Never the "complete" screen, which would claim the deck was reviewed.
    expect(screen.queryByText(/Session complete/)).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Good" }),
    ).not.toBeInTheDocument();
    expect(mockApi.study.review).not.toHaveBeenCalled();
  });

  test("empty batch shows an encouraging summary", async () => {
    mockApi.study.batch.mockResolvedValue([]);
    renderStudy();
    expect(await screen.findByText(/Session complete/)).toBeInTheDocument();
    expect(screen.getByText(/Nothing due right now/)).toBeInTheDocument();
  });

  test("a failure loading deck settings leaves the session silent, not broken", async () => {
    mockApi.decks.settings.mockRejectedValue(new Error("nope"));
    mockApi.study.batch.mockResolvedValue([
      {
        id: "c1",
        content: { front: "Front?", back: "Back!" },
        category: null,
        position: 0,
      },
    ]);

    renderStudy();

    expect(await screen.findByText("Front?")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /Show answer/ }));
    expect(screen.getByText("Back!")).toBeInTheDocument();
    expect(spoken).toHaveLength(0);
  });

  describe("with speech configured", () => {
    beforeEach(() => {
      mockUser = {
        speechEnabled: false,
        speechLang: null,
        speechAutoplay: "back",
        speechRate: 0.8,
        language: "en",
      };
      mockApi.decks.settings.mockResolvedValue({
        ...DECK_SILENT,
        speech_enabled: true,
        speech_front_lang: "de-DE",
        speech_back_lang: "en-GB",
      });
      mockApi.study.batch.mockResolvedValue([
        {
          id: "c1",
          content: { front: "der Hund", back: "the dog" },
          category: null,
          position: 0,
        },
      ]);
      mockApi.study.review.mockResolvedValue({});
    });

    test("speaks the back on reveal, in the back language and deck rate", async () => {
      renderStudy();
      await screen.findByText("der Hund");

      await userEvent.click(
        screen.getByRole("button", { name: /Show answer/ }),
      );

      await waitFor(() => expect(spoken).toHaveLength(1));
      expect(spoken[0]).toEqual({ text: "the dog", lang: "en-GB", rate: 0.8 });
    });

    test("does not autoplay the front when autoplay is 'back'", async () => {
      renderStudy();
      await screen.findByText("der Hund");
      await waitFor(() => expect(mockApi.decks.settings).toHaveBeenCalled());
      expect(spoken).toHaveLength(0);
    });

    test("offers a replay button per side and speaks that side's language", async () => {
      renderStudy();
      await screen.findByText("der Hund");

      const frontButton = await screen.findByRole("button", {
        name: /Speak this side \(de-DE\)/,
      });
      await userEvent.click(frontButton);

      await waitFor(() => expect(spoken).toHaveLength(1));
      expect(spoken[0].text).toBe("der Hund");
      expect(spoken[0].lang).toBe("de-DE");
    });

    test("cancels the previous utterance before speaking the next", async () => {
      renderStudy();
      await screen.findByText("der Hund");

      const before = cancels;
      await userEvent.click(
        await screen.findByRole("button", { name: /Speak this side/ }),
      );
      await waitFor(() => expect(cancels).toBeGreaterThan(before));
    });

    test("muting suppresses autoplay but keeps the replay button working", async () => {
      renderStudy();
      await screen.findByText("der Hund");

      await userEvent.click(screen.getByRole("button", { name: "Mute" }));
      await userEvent.click(
        screen.getByRole("button", { name: /Show answer/ }),
      );
      expect(spoken).toHaveLength(0);

      await userEvent.click(
        screen.getByRole("button", { name: /Speak this side \(en-GB\)/ }),
      );
      await waitFor(() => expect(spoken).toHaveLength(1));
      expect(spoken[0].text).toBe("the dog");
    });

    test("a language with no installed voice stays silent", async () => {
      installSpeech(["fr-FR"]);
      resetVoiceCache();
      renderStudy();
      await screen.findByText("der Hund");

      await userEvent.click(
        screen.getByRole("button", { name: /Show answer/ }),
      );
      expect(screen.getByText("the dog")).toBeInTheDocument();
      expect(spoken).toHaveLength(0);
    });
  });

  describe("Choice mode (Spec 01/08)", () => {
    async function enterChoiceMode() {
      await userEvent.click(
        await screen.findByRole("button", { name: "Choice" }),
      );
    }

    test("switching mode persists the choice", async () => {
      mockApi.study.batch.mockResolvedValue([
        {
          id: "c1",
          content: { front: "Front?", back: "Right" },
          category: null,
          position: 0,
        },
        {
          id: "c2",
          content: { front: "Q2", back: "Wrong" },
          category: null,
          position: 1,
        },
      ]);
      renderStudy();
      await enterChoiceMode();
      expect(
        await screen.findByRole("button", { name: /Right/ }),
      ).toBeInTheDocument();
      expect(window.localStorage.getItem("flashkarte_study_mode")).toBe(
        "choice",
      );
    });

    test("ordinary card: correct pick grades Good with no option_index", async () => {
      mockApi.study.batch.mockResolvedValue([
        {
          id: "c1",
          content: { front: "Front?", back: "Right" },
          category: null,
          position: 0,
        },
        {
          id: "c2",
          content: { front: "Q2", back: "Wrong" },
          category: null,
          position: 1,
        },
      ]);
      mockApi.study.review.mockResolvedValue({});
      renderStudy();
      await enterChoiceMode();

      await userEvent.click(
        await screen.findByRole("button", { name: /Right/ }),
      );
      await userEvent.click(screen.getByRole("button", { name: "Continue" }));

      expect(mockApi.study.review).toHaveBeenCalledWith("c1", 4, undefined);
    });

    test("ordinary card: wrong pick grades Again and re-queues, no interlude", async () => {
      mockApi.study.batch.mockResolvedValue([
        {
          id: "c1",
          content: { front: "Front?", back: "Right" },
          category: null,
          position: 0,
        },
        {
          id: "c2",
          content: { front: "Q2", back: "Wrong" },
          category: null,
          position: 1,
        },
      ]);
      mockApi.study.review.mockResolvedValue({});
      renderStudy();
      await enterChoiceMode();

      await userEvent.click(
        await screen.findByRole("button", { name: /Wrong/ }),
      );
      await userEvent.click(screen.getByRole("button", { name: "Continue" }));

      expect(mockApi.study.review).toHaveBeenCalledWith("c1", 1, undefined);
      expect(await screen.findByText("Q2")).toBeInTheDocument();
    });

    const diagnosticCard = {
      id: "d1",
      content: {
        front:
          "A cell divides into four genetically distinct haploid cells. This is:",
        back: "Meiosis.",
        options: [
          { text: "Meiosis", goto: "correct" },
          { text: "Mitosis", goto: "confusion-mitosis" },
        ],
      },
      category: null,
      position: 0,
    };

    const remediationCard = {
      id: "r1",
      type: "basic",
      content: {
        front: "You mixed these up. Mitosis produces:",
        back: "Two genetically identical diploid cells.",
        label: "confusion-mitosis",
      },
      category: null,
      position: 5,
    };

    test("diagnostic card: correct pick grades Good, no interlude", async () => {
      mockApi.study.batch.mockResolvedValue([diagnosticCard]);
      mockApi.decks.get.mockResolvedValue({ cards: [remediationCard] });
      mockApi.study.review.mockResolvedValue({});
      renderStudy();
      await enterChoiceMode();

      await userEvent.click(
        await screen.findByRole("button", { name: /Meiosis/ }),
      );
      await userEvent.click(screen.getByRole("button", { name: "Continue" }));

      // Authored option index 0 ("Meiosis" is options[0]).
      expect(mockApi.study.review).toHaveBeenCalledWith("d1", 4, 0);
      expect(screen.queryByText(/Let's clear that up/)).not.toBeInTheDocument();
    });

    test("diagnostic card: wrong routed pick shows a no-grade remediation interlude", async () => {
      mockApi.study.batch.mockResolvedValue([diagnosticCard]);
      mockApi.decks.get.mockResolvedValue({ cards: [remediationCard] });
      mockApi.study.review.mockResolvedValue({});
      renderStudy();
      await enterChoiceMode();

      await userEvent.click(
        await screen.findByRole("button", { name: /Mitosis/ }),
      );
      await userEvent.click(screen.getByRole("button", { name: "Continue" }));

      // Authored option index 1 ("Mitosis" is options[1]); wrong -> rating 1.
      expect(mockApi.study.review).toHaveBeenCalledWith("d1", 1, 1);
      expect(await screen.findByText(/You mixed these up/)).toBeInTheDocument();
      expect(
        screen.getByText(/Two genetically identical diploid cells/),
      ).toBeInTheDocument();

      // Dismissing the interlude advances without a second review call, and
      // the diagnostic card (a lapse) comes back for another attempt.
      await userEvent.click(screen.getByRole("button", { name: "Continue" }));
      expect(mockApi.study.review).toHaveBeenCalledTimes(1);
      expect(
        await screen.findByText(/A cell divides into four/),
      ).toBeInTheDocument();
    });

    // A second plain card lets these tests observe "advanced with no interlude"
    // as "the next card in the queue", rather than "Session complete" -- with
    // only one card, a wrong pick's own lapse re-queue would make the two
    // outcomes indistinguishable (the card comes back around either way).
    const secondCard = {
      id: "c2",
      content: { front: "Q2", back: "A2" },
      category: null,
      position: 1,
    };

    test("diagnostic card: wrong pick routed to 'end' has no interlude", async () => {
      const card = {
        ...diagnosticCard,
        content: {
          ...diagnosticCard.content,
          options: [
            { text: "Meiosis", goto: "correct" },
            { text: "Binary fission", goto: "end" },
          ],
        },
      };
      mockApi.study.batch.mockResolvedValue([card, secondCard]);
      mockApi.study.review.mockResolvedValue({});
      renderStudy();
      await enterChoiceMode();

      await userEvent.click(
        await screen.findByRole("button", { name: /Binary fission/ }),
      );
      await userEvent.click(screen.getByRole("button", { name: "Continue" }));

      expect(mockApi.study.review).toHaveBeenCalledWith("d1", 1, 1);
      expect(await screen.findByText("Q2")).toBeInTheDocument();
    });

    test("a failed remediation lookup skips the interlude instead of blocking study", async () => {
      mockApi.study.batch.mockResolvedValue([diagnosticCard, secondCard]);
      mockApi.decks.get.mockRejectedValue(new Error("boom"));
      mockApi.study.review.mockResolvedValue({});
      renderStudy();
      await enterChoiceMode();

      await userEvent.click(
        await screen.findByRole("button", { name: /Mitosis/ }),
      );
      await userEvent.click(screen.getByRole("button", { name: "Continue" }));

      expect(mockApi.study.review).toHaveBeenCalledWith("d1", 1, 1);
      expect(await screen.findByText("Q2")).toBeInTheDocument();
      expect(mockReportClientError).toHaveBeenCalled();
    });
  });
});

describe("StudyPage: reading cards (lessons)", () => {
  const lesson = {
    id: "l1",
    type: "read",
    content: {
      front: "How a dot product measures similarity",
      back: "It multiplies matching entries.\n\n- large: same direction\n- zero: unrelated",
    },
    category: "Basics",
    position: 0,
  };
  const question = {
    id: "q1",
    type: "basic",
    content: { front: "Front?", back: "Back!" },
    category: null,
    position: 1,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    resetVoiceCache();
    mockUser = null;
    mockApi.decks.settings.mockResolvedValue(DECK_SILENT);
    mockApi.decks.get.mockResolvedValue({ cards: [] });
    mockApi.study.review.mockResolvedValue({});
    mockApi.study.markRead.mockResolvedValue({ recorded: 1 });
    installSpeech([]);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    window.sessionStorage.clear();
    window.localStorage.clear();
  });

  test("shows a lesson to read, with no answer to reveal and no rating buttons", async () => {
    mockApi.study.batch.mockResolvedValue([lesson, question]);
    renderStudy();

    expect(
      await screen.findByText("How a dot product measures similarity"),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/It multiplies matching entries/),
    ).toBeInTheDocument();
    expect(screen.getByText(/isn't graded/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Got it" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Show answer/ })).toBeNull();
    expect(screen.queryByRole("button", { name: "Good" })).toBeNull();
  });

  test("keeps the body's line breaks so lists stay readable", async () => {
    mockApi.study.batch.mockResolvedValue([lesson]);
    renderStudy();
    const body = await screen.findByText(/It multiplies matching entries/);
    expect(body.textContent).toContain(
      "\n- large: same direction\n- zero: unrelated",
    );
    expect(body.closest(".whitespace-pre-wrap")).not.toBeNull();
  });

  test("Got it records the read (never a review) and moves on to the next card", async () => {
    mockApi.study.batch.mockResolvedValue([lesson, question]);
    renderStudy();

    await userEvent.click(
      await screen.findByRole("button", { name: "Got it" }),
    );

    expect(mockApi.study.markRead).toHaveBeenCalledWith("l1");
    expect(mockApi.study.review).not.toHaveBeenCalled();
    expect(await screen.findByText("Front?")).toBeInTheDocument();
  });

  test("Enter also acknowledges a lesson", async () => {
    mockApi.study.batch.mockResolvedValue([lesson, question]);
    renderStudy();
    await screen.findByRole("button", { name: "Got it" });
    await userEvent.keyboard("{Enter}");
    expect(mockApi.study.markRead).toHaveBeenCalledWith("l1");
  });

  test("a session of only lessons ends by saying what was read, not 'nothing due'", async () => {
    mockApi.study.batch.mockResolvedValue([lesson]);
    renderStudy();
    await userEvent.click(
      await screen.findByRole("button", { name: "Got it" }),
    );
    expect(await screen.findByText("You read 1 lesson.")).toBeInTheDocument();
    expect(screen.queryByText(/Nothing due/)).toBeNull();
  });

  test("reviewing questions still reports reviews when lessons came first", async () => {
    mockApi.study.batch.mockResolvedValue([lesson, question]);
    renderStudy();
    await userEvent.click(
      await screen.findByRole("button", { name: "Got it" }),
    );
    await userEvent.click(
      await screen.findByRole("button", { name: /Show answer/ }),
    );
    await userEvent.click(screen.getByRole("button", { name: "Good" }));
    expect(await screen.findByText("You reviewed 1 card.")).toBeInTheDocument();
  });

  test("a failed read is reported but never traps the learner on the lesson", async () => {
    mockApi.study.markRead.mockRejectedValue(new Error("offline"));
    mockApi.study.batch.mockResolvedValue([lesson, question]);
    renderStudy();

    await userEvent.click(
      await screen.findByRole("button", { name: "Got it" }),
    );

    expect(await screen.findByText("Front?")).toBeInTheDocument();
    expect(mockReportClientError).toHaveBeenCalledWith(
      expect.objectContaining({ context: "StudyPage.markRead" }),
    );
  });

  test("a lesson's body is never used as a wrong answer in Choice mode", async () => {
    window.localStorage.setItem("flashkarte_study_mode", "choice");
    mockApi.study.batch.mockResolvedValue([lesson, question]);
    renderStudy();
    await userEvent.click(
      await screen.findByRole("button", { name: "Got it" }),
    );
    await screen.findByText("Front?");
    expect(screen.queryByText(/It multiplies matching entries/)).toBeNull();
  });
});
