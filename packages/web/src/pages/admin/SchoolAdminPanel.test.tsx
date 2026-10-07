import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, expect, test, vi } from "vitest";
import { api } from "../../api/client";
import type { AdminUser } from "../../api/types";
import "../../i18n";
import { SchoolAdminPanel } from "./SchoolAdminPanel";

vi.mock("../../api/client", async () => {
  const actual =
    await vi.importActual<typeof import("../../api/client")>(
      "../../api/client",
    );
  return {
    ...actual,
    api: {
      ...actual.api,
      admin: {
        ...actual.api.admin,
        listUsers: vi.fn(),
        listSchools: vi.fn(),
        listClasses: vi.fn(),
        verifyTeacher: vi.fn(),
        setOrganization: vi.fn(),
        getClass: vi.fn(),
        setClassMembers: vi.fn(),
      },
    },
  };
});

function user(overrides: Partial<AdminUser>): AdminUser {
  return {
    id: "u",
    email: "u@example.com",
    role: "user",
    accountType: "free",
    accountKind: "individual",
    schoolId: null,
    teacherVerified: false,
    emailVerifiedAt: null,
    createdAt: "2026-10-07T00:00:00.000Z",
    ...overrides,
  };
}

const SCHOOL = {
  id: "s1",
  name: "Gymnasium",
  memberCount: 2,
  createdAt: "2026-10-07T00:00:00.000Z",
};
const USERS = [
  user({ id: "t1", email: "teacher@example.com" }),
  user({
    id: "t2",
    email: "huber@example.com",
    accountKind: "teacher",
    schoolId: "s1",
    teacherVerified: true,
  }),
  user({
    id: "p1",
    email: "pupil@example.com",
    accountKind: "student",
    schoolId: "s1",
  }),
  user({ id: "p2", email: "other@example.com", accountKind: "student" }),
];
const CLASS = {
  id: "c1",
  name: "Biologie 7B",
  teacherId: "t2",
  teacherEmail: "huber@example.com",
  schoolId: "s1",
  schoolName: "Gymnasium",
  memberCount: 0,
  createdAt: "2026-10-07T00:00:00.000Z",
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(api.admin.listUsers).mockResolvedValue({ users: USERS });
  vi.mocked(api.admin.listSchools).mockResolvedValue({ schools: [SCHOOL] });
  vi.mocked(api.admin.listClasses).mockResolvedValue({ classes: [CLASS] });
  vi.mocked(api.admin.verifyTeacher).mockResolvedValue(undefined);
  vi.mocked(api.admin.getClass).mockResolvedValue({
    class: { ...CLASS, members: [] },
  });
  vi.mocked(api.admin.setClassMembers).mockResolvedValue(undefined);
});

test("teacher is not offered as a kind until the person is verified", async () => {
  render(<SchoolAdminPanel />);
  await userEvent.selectOptions(await screen.findByLabelText("Person"), "t1");
  const kinds = within(screen.getByLabelText("Account kind"))
    .getAllByRole("option")
    .map((o) => o.textContent);
  expect(kinds).toEqual(["Individual", "School", "Student"]);
});

test("verifying a teacher records how, with the school and note", async () => {
  render(<SchoolAdminPanel />);
  await userEvent.selectOptions(await screen.findByLabelText("Person"), "t1");
  await userEvent.selectOptions(
    screen.getByLabelText("How they proved it"),
    "school_roster",
  );
  const schoolSelects = screen.getAllByLabelText("School");
  await userEvent.selectOptions(schoolSelects[1], "s1");
  await userEvent.type(
    screen.getByLabelText("Note (optional)"),
    "Roster 7 Oct",
  );
  await userEvent.click(screen.getByRole("button", { name: "Verify" }));

  expect(api.admin.verifyTeacher).toHaveBeenCalledWith(
    "t1",
    "school_roster",
    "s1",
    "Roster 7 Oct",
  );
});

test("a school's class offers only that school's students", async () => {
  render(<SchoolAdminPanel />);
  await userEvent.click(
    await screen.findByRole("button", { name: "Students" }),
  );

  expect(await screen.findByLabelText("pupil@example.com")).toBeInTheDocument();
  expect(screen.queryByLabelText("other@example.com")).not.toBeInTheDocument();

  await userEvent.click(screen.getByLabelText("pupil@example.com"));
  const editor = screen.getByText("Students in Biologie 7B").parentElement!;
  await userEvent.click(within(editor).getByRole("button", { name: "Save" }));
  expect(api.admin.setClassMembers).toHaveBeenCalledWith("c1", ["p1"]);
});
