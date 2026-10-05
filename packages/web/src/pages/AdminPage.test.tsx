import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { api, ApiError } from "../api/client";
import type { AdminUser } from "../api/types";
import "../i18n";
import { AdminPage } from "./AdminPage";

vi.mock("../api/client", () => ({
  api: {
    admin: {
      listPromos: vi.fn().mockResolvedValue({ promos: [] }),
      listUsers: vi.fn(),
      contactUsers: vi.fn(),
      createUser: vi.fn(),
      setAccountType: vi.fn(),
      setSubjectOfficial: vi.fn(),
      createCourseCollection: vi.fn(),
      setCourseCollectionMembers: vi.fn(),
      categoryTree: vi.fn(),
    },
    learn: {
      subjects: vi.fn(),
    },
    courseCollections: {
      list: vi.fn(),
    },
    decks: {
      listOfficial: vi.fn(),
      listCollections: vi.fn(),
    },
    library: {
      list: vi.fn(),
    },
  },
  ApiError: class ApiError extends Error {
    constructor(_status: number, _code: string, message: string) {
      super(message);
    }
  },
}));

const mockedAdminApi = api.admin as unknown as {
  listUsers: ReturnType<typeof vi.fn>;
  contactUsers: ReturnType<typeof vi.fn>;
  createUser: ReturnType<typeof vi.fn>;
  setAccountType: ReturnType<typeof vi.fn>;
  setCourseCollectionMembers: ReturnType<typeof vi.fn>;
  categoryTree: ReturnType<typeof vi.fn>;
};
const mockedLearnApi = api.learn as unknown as {
  subjects: ReturnType<typeof vi.fn>;
};
const mockedCourseCollectionsApi = api.courseCollections as unknown as {
  list: ReturnType<typeof vi.fn>;
};

const adminUser: AdminUser = {
  id: "user-1",
  email: "new@example.com",
  role: "user",
  accountType: "free",
  emailVerifiedAt: "2026-01-01",
  createdAt: "2026-01-01",
};

function renderPage() {
  return render(
    <MemoryRouter>
      <AdminPage />
    </MemoryRouter>,
  );
}

describe("AdminPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedAdminApi.categoryTree.mockResolvedValue({ categories: [] });
    mockedLearnApi.subjects.mockResolvedValue([]);
    mockedCourseCollectionsApi.list.mockResolvedValue([]);
  });

  test("renders loading and loaded states", async () => {
    mockedAdminApi.listUsers.mockResolvedValue({ users: [adminUser] });
    renderPage();

    expect(screen.getAllByText("Loading…").length).toBeGreaterThan(0);
    expect(await screen.findByText("new@example.com")).toBeInTheDocument();
  });

  test("uses a fluid three-column dashboard layout", async () => {
    mockedAdminApi.listUsers.mockResolvedValue({ users: [] });
    const { container } = renderPage();

    expect(container.querySelector('[class*="2xl:grid-cols-3"]')).toHaveClass(
      "grid",
      "lg:grid-cols-2",
      "2xl:grid-cols-3",
    );
  });

  test("renders API load failures", async () => {
    mockedAdminApi.listUsers.mockRejectedValue(
      new ApiError(500, "FAILED", "Admin service unavailable"),
    );
    renderPage();

    expect(
      await screen.findByText("Admin service unavailable"),
    ).toBeInTheDocument();
  });

  test("prepends a created user and changes its account type", async () => {
    mockedAdminApi.listUsers.mockResolvedValue({ users: [] });
    mockedAdminApi.createUser.mockResolvedValue({ user: adminUser });
    mockedAdminApi.setAccountType.mockResolvedValue({ user: adminUser });
    renderPage();
    await screen.findByText("Users (0)");

    await userEvent.type(screen.getByLabelText("Email"), "new@example.com");
    await userEvent.type(
      screen.getByLabelText("Initial password (8+ chars)"),
      "password123",
    );
    await userEvent.click(screen.getByRole("button", { name: "Create user" }));

    expect(await screen.findByText("new@example.com")).toBeInTheDocument();
    expect(mockedAdminApi.createUser).toHaveBeenCalledWith(
      "new@example.com",
      "password123",
      "free",
    );

    const userRow = screen
      .getByText("new@example.com")
      .closest("li") as HTMLElement;
    const accountTypeSelect = within(userRow).getByRole("combobox");
    await userEvent.selectOptions(accountTypeSelect, "paid");
    expect(mockedAdminApi.setAccountType).toHaveBeenCalledWith(
      "user-1",
      "paid",
    );
    expect(accountTypeSelect).toHaveValue("paid");
  });

  test("queues a service message for selected verified users", async () => {
    mockedAdminApi.listUsers.mockResolvedValue({ users: [adminUser] });
    mockedAdminApi.contactUsers.mockResolvedValue({
      campaign: {
        id: "campaign-1",
        status: "queued",
        recipientCount: 1,
        sentCount: 0,
        failedCount: 0,
        createdAt: "2026-01-01T00:00:00.000Z",
      },
    });
    renderPage();
    await screen.findByText("new@example.com");

    await userEvent.click(
      screen.getByRole("checkbox", { name: "Select new@example.com" }),
    );
    await userEvent.type(screen.getByLabelText("Subject"), "Service update");
    await userEvent.type(
      screen.getByLabelText("Message"),
      "The service will be unavailable tonight.",
    );
    await userEvent.click(
      screen.getByRole("checkbox", {
        name: "I understand this will send an email to every selected user.",
      }),
    );
    await userEvent.click(
      screen.getByRole("button", { name: "Queue email to 1 users" }),
    );

    expect(mockedAdminApi.contactUsers).toHaveBeenCalledWith(
      "Service update",
      "The service will be unavailable tonight.",
      [adminUser.id],
    );
    expect(
      await screen.findByText("Email queued for 1 users."),
    ).toBeInTheDocument();
  });

  test("organizes each matching course under its collection", async () => {
    mockedAdminApi.listUsers.mockResolvedValue({ users: [] });
    mockedLearnApi.subjects.mockResolvedValue([
      {
        id: "ai-security",
        user_id: "owner-1",
        title: "AI Security at Work",
        description: null,
        is_public: true,
        is_official: false,
        concept_count: 20,
      },
    ]);
    mockedCourseCollectionsApi.list.mockImplementation((source) =>
      Promise.resolve(
        source === "official"
          ? [
              {
                id: "artificial-intelligence",
                title: "Artificial Intelligence",
                description: null,
                is_official: true,
                course_count: 3,
              },
            ]
          : [],
      ),
    );
    renderPage();

    const collectionCard = (
      await screen.findByRole("heading", {
        name: "Artificial Intelligence",
      })
    ).closest("li") as HTMLElement;
    await userEvent.click(
      within(collectionCard).getByRole("button", { name: "Organize" }),
    );

    expect(mockedAdminApi.setCourseCollectionMembers).toHaveBeenCalledWith(
      "artificial-intelligence",
      ["ai-security"],
    );
    expect(await screen.findByText(/1 courses organized/)).toBeInTheDocument();
  });
});
