import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router";
import { beforeEach, expect, test, vi } from "vitest";
import { api } from "../api/client";
import type { SchoolDetail } from "../api/types";
import "../i18n";
import { SchoolDetailPage } from "./SchoolDetailPage";

vi.mock("../api/client", async () => {
  const actual =
    await vi.importActual<typeof import("../api/client")>("../api/client");
  return {
    ...actual,
    api: {
      ...actual.api,
      admin: {
        ...actual.api.admin,
        getSchool: vi.fn(),
        getClass: vi.fn(),
      },
    },
  };
});

const SCHOOL_DETAIL: SchoolDetail = {
  school: {
    id: "s1",
    name: "Sprachschule Berlin",
    memberCount: 3,
    createdAt: "2026-10-09T00:00:00.000Z",
  },
  administrators: [
    {
      id: "a1",
      email: "office@example.com",
      accountType: "free",
      accountKind: "school",
      teacherVerified: false,
      emailVerifiedAt: null,
      classes: [],
    },
  ],
  teachers: [
    {
      id: "t1",
      email: "teacher@example.com",
      accountType: "free",
      accountKind: "teacher",
      teacherVerified: true,
      emailVerifiedAt: null,
      classes: [{ id: "c1", name: "German A1" }],
    },
  ],
  students: [
    {
      id: "p1",
      email: "student@example.com",
      accountType: "free",
      accountKind: "student",
      teacherVerified: false,
      emailVerifiedAt: null,
      classes: [{ id: "c1", name: "German A1" }],
    },
  ],
  classes: [
    {
      id: "c1",
      name: "German A1",
      teacherId: "t1",
      teacherEmail: "teacher@example.com",
      schoolId: "s1",
      schoolName: "Sprachschule Berlin",
      memberCount: 1,
      createdAt: "2026-10-09T00:00:00.000Z",
    },
  ],
};

function renderSchoolPage() {
  return render(
    <MemoryRouter initialEntries={["/admin/schools/s1"]}>
      <Routes>
        <Route path="/admin/schools/:id" element={<SchoolDetailPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(api.admin.getSchool).mockResolvedValue({ school: SCHOOL_DETAIL });
  vi.mocked(api.admin.getClass).mockResolvedValue({
    class: {
      ...SCHOOL_DETAIL.classes[0],
      members: [{ id: "p1", email: "student@example.com", displayName: null }],
    },
  });
});

test("shows a school's administrator, teacher, student and class relationships", async () => {
  renderSchoolPage();

  expect(
    await screen.findByRole("heading", { name: "Sprachschule Berlin" }),
  ).toBeInTheDocument();
  expect(
    screen.getByRole("heading", { name: "School administrators" }),
  ).toBeInTheDocument();
  expect(
    screen.getByRole("heading", { name: "Course leaders" }),
  ).toBeInTheDocument();
  expect(
    screen.getByRole("heading", { name: "Participants" }),
  ).toBeInTheDocument();
  expect(screen.getByText("office@example.com")).toBeInTheDocument();
  expect(screen.getByText("Verified course leader")).toBeInTheDocument();
  expect(screen.getAllByText("1 group: German A1")).toHaveLength(2);

  await userEvent.click(
    screen.getByRole("button", { name: "View participants" }),
  );

  expect(await screen.findAllByText("student@example.com")).toHaveLength(2);
  expect(api.admin.getClass).toHaveBeenCalledWith("c1");
});
