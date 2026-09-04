import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Routes, Route } from "react-router";
import { StudyPage } from "./StudyPage";
import { api } from "../api/client";
import { resetVoiceCache } from "../speech/voices";
import "../i18n";

vi.mock("../api/client", () => ({
  api: {
    study: { batch: vi.fn(), review: vi.fn() },
    decks: { settings: vi.fn() },
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
  study: { batch: ReturnType<typeof vi.fn>; review: ReturnType<typeof vi.fn> };
  decks: { settings: ReturnType<typeof vi.fn> };
};

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
    installSpeech(["de-DE", "en-GB"]);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    window.sessionStorage.clear();
  });

  test("reveals the answer then grades via the API", async () => {
    mockApi.study.batch.mockResolvedValue([
      { id: "c1", content: { front: "Front?", back: "Back!" }, category: null },
    ]);
    mockApi.study.review.mockResolvedValue({});

    renderStudy();

    expect(await screen.findByText("Front?")).toBeInTheDocument();
    expect(screen.queryByText("Back!")).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /Show answer/ }));
    expect(screen.getByText("Back!")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Good" }));
    expect(mockApi.study.review).toHaveBeenCalledWith("c1", 4);

    await waitFor(() =>
      expect(screen.getByText(/Session complete/)).toBeInTheDocument(),
    );
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
      { id: "c1", content: { front: "Front?", back: "Back!" }, category: null },
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
});
