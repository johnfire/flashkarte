import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, expect, test, vi } from "vitest";
import { api } from "../api/client";
import type { DeckSharing } from "../api/types";
import "../i18n";
import { DeckSharesDialog } from "./DeckSharesDialog";

vi.mock("../api/client", async () => {
  const actual =
    await vi.importActual<typeof import("../api/client")>("../api/client");
  return {
    ...actual,
    api: {
      ...actual.api,
      decks: { ...actual.api.decks, getShares: vi.fn(), setShares: vi.fn() },
    },
  };
});

const TEACHER: DeckSharing = {
  shares: [{ scope: "class", schoolId: null, classId: "c1" }],
  options: {
    accountKind: "teacher",
    school: { id: "s1", name: "Gymnasium Lechfeld" },
    classes: [
      { id: "c1", name: "Biologie 7B" },
      { id: "c2", name: "Biologie 8A" },
    ],
    canShareWithSchool: true,
    canShareWithAllStudents: true,
  },
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(api.decks.setShares).mockResolvedValue(TEACHER);
});

test("a teacher sees their school, all students and each class, with current shares ticked", async () => {
  vi.mocked(api.decks.getShares).mockResolvedValue(TEACHER);
  render(<DeckSharesDialog deckId="d1" deckTitle="Zellen" onClose={vi.fn()} />);

  expect(
    await screen.findByLabelText("Everyone at Gymnasium Lechfeld"),
  ).not.toBeChecked();
  expect(screen.getByLabelText("All my students")).not.toBeChecked();
  expect(screen.getByLabelText("Class: Biologie 7B")).toBeChecked();
  expect(screen.getByLabelText("Class: Biologie 8A")).not.toBeChecked();
});

test("saving sends exactly the ticked audiences and closes", async () => {
  vi.mocked(api.decks.getShares).mockResolvedValue(TEACHER);
  const onClose = vi.fn();
  render(<DeckSharesDialog deckId="d1" deckTitle="Zellen" onClose={onClose} />);

  await userEvent.click(
    await screen.findByLabelText("Everyone at Gymnasium Lechfeld"),
  );
  await userEvent.click(screen.getByLabelText("Class: Biologie 7B"));
  await userEvent.click(screen.getByLabelText("Class: Biologie 8A"));
  await userEvent.click(screen.getByRole("button", { name: "Save" }));

  expect(api.decks.setShares).toHaveBeenCalledWith("d1", [
    { scope: "school" },
    { scope: "class", classId: "c2" },
  ]);
  expect(onClose).toHaveBeenCalled();
});

test("a student is offered only their classmates", async () => {
  vi.mocked(api.decks.getShares).mockResolvedValue({
    shares: [],
    options: {
      accountKind: "student",
      school: null,
      classes: [{ id: "c1", name: "Deutsch A1" }],
      canShareWithSchool: false,
      canShareWithAllStudents: false,
    },
  });
  render(<DeckSharesDialog deckId="d1" deckTitle="Notes" onClose={vi.fn()} />);

  expect(
    await screen.findByLabelText("My classmates in Deutsch A1"),
  ).toBeInTheDocument();
  expect(screen.queryByLabelText("All my students")).not.toBeInTheDocument();
});

test("with no school or class there is nothing to save", async () => {
  vi.mocked(api.decks.getShares).mockResolvedValue({
    shares: [],
    options: {
      accountKind: "teacher",
      school: null,
      classes: [],
      canShareWithSchool: false,
      canShareWithAllStudents: false,
    },
  });
  render(<DeckSharesDialog deckId="d1" deckTitle="Notes" onClose={vi.fn()} />);

  expect(
    await screen.findByText(/not in a school or class yet/),
  ).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Save" })).toBeDisabled();
});
