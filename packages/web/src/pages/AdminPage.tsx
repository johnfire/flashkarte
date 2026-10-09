/* eslint-disable max-lines -- administrative controls are kept together pending extraction. */
import { useCallback, useState } from "react";
import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import { api, ApiError } from "../api/client";
import { AdminUser, AccountType } from "../api/types";
import { PasswordInput } from "../components/PasswordInput";
import { useAsync } from "../hooks/use-async";
import { CategoriesSection } from "./admin/CategoriesSection";
import { CourseCollectionAssignmentsSection } from "./admin/CourseCollectionAssignmentsSection";
import { PromosSection } from "./admin/PromosSection";
import { SchoolAdminPanel } from "./admin/SchoolAdminPanel";

const ACCOUNT_TYPES: AccountType[] = ["free", "paid", "admin-gifted", "admin"];

const TYPE_LABEL_KEY: Record<AccountType, string> = {
  free: "admin.type_free",
  paid: "admin.type_paid",
  "admin-gifted": "admin.type_gifted",
  admin: "admin.type_admin",
};

export function AdminPage() {
  const { t } = useTranslation();
  // create-user form
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [accountType, setAccountType] = useState<AccountType>("free");
  const [creating, setCreating] = useState(false);
  const [createMsg, setCreateMsg] = useState<string | null>(null);
  const [mutationError, setMutationError] = useState<string | null>(null);
  const [courseId, setCourseId] = useState("");
  const [updatingCourse, setUpdatingCourse] = useState(false);
  const [selectedRecipientIds, setSelectedRecipientIds] = useState<string[]>(
    [],
  );
  const [contactSubject, setContactSubject] = useState("");
  const [contactBody, setContactBody] = useState("");
  const [contactConfirmation, setContactConfirmation] = useState(false);
  const [contacting, setContacting] = useState(false);
  const [contactMessage, setContactMessage] = useState<string | null>(null);

  const loadUsers = useCallback(async () => {
    const response = await api.admin.listUsers();
    return response.users;
  }, []);
  const {
    data: users,
    error: loadError,
    loading,
    setData: setUsers,
  } = useAsync<AdminUser[], []>(loadUsers, []);
  const error =
    mutationError ??
    (loadError instanceof ApiError
      ? loadError.message
      : loadError
        ? t("admin.loadError")
        : null);
  const verifiedUsers = users?.filter((user) => user.emailVerifiedAt) ?? [];

  async function createUser(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setCreateMsg(null);
    setMutationError(null);
    try {
      const { user } = await api.admin.createUser(
        email.trim(),
        password,
        accountType,
      );
      setUsers((u) => (u ? [user, ...u] : [user]));
      setCreateMsg(t("admin.created", { email: user.email }));
      setEmail("");
      setPassword("");
      setAccountType("free");
    } catch (err) {
      setMutationError(
        err instanceof ApiError ? err.message : t("admin.createError"),
      );
    } finally {
      setCreating(false);
    }
  }

  async function changeType(id: string, type: AccountType) {
    const prev = users;
    setUsers((u) =>
      u ? u.map((x) => (x.id === id ? { ...x, accountType: type } : x)) : u,
    );
    try {
      await api.admin.setAccountType(id, type);
    } catch (err) {
      setUsers(prev ?? null); // revert
      setMutationError(
        err instanceof ApiError ? err.message : t("admin.updateTypeError"),
      );
    }
  }

  async function setCourseOfficial(official: boolean) {
    if (!courseId.trim()) return;
    setUpdatingCourse(true);
    setMutationError(null);
    try {
      await api.admin.setSubjectOfficial(courseId.trim(), official);
      setCourseId("");
    } catch (err) {
      setMutationError(
        err instanceof ApiError ? err.message : "Could not update course",
      );
    } finally {
      setUpdatingCourse(false);
    }
  }

  function toggleRecipient(userId: string) {
    setSelectedRecipientIds((current) =>
      current.includes(userId)
        ? current.filter((id) => id !== userId)
        : [...current, userId],
    );
  }

  function toggleAllVerifiedRecipients() {
    setSelectedRecipientIds((current) =>
      current.length === verifiedUsers.length
        ? []
        : verifiedUsers.map((user) => user.id),
    );
  }

  async function contactSelectedUsers(event: React.FormEvent) {
    event.preventDefault();
    setContacting(true);
    setContactMessage(null);
    setMutationError(null);
    try {
      const { campaign } = await api.admin.contactUsers(
        contactSubject.trim(),
        contactBody.trim(),
        selectedRecipientIds,
      );
      setContactMessage(
        t("admin.contactQueued", { count: campaign.recipientCount }),
      );
      setContactSubject("");
      setContactBody("");
      setContactConfirmation(false);
      setSelectedRecipientIds([]);
    } catch (err) {
      setMutationError(
        err instanceof ApiError ? err.message : t("admin.contactError"),
      );
    } finally {
      setContacting(false);
    }
  }

  return (
    <div className="mx-auto max-w-screen-2xl p-4 sm:p-8">
      <header className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-bold">{t("admin.title")}</h1>
        <Link to="/" className="text-sm text-indigo-600">
          {t("admin.backToDecks")}
        </Link>
      </header>

      {error && <p className="mb-4 text-red-600">{error}</p>}

      <div className="grid items-start gap-6 lg:grid-cols-2 2xl:grid-cols-3">
        <div className="space-y-6">
          <section className="rounded-lg border p-4">
            <h2 className="mb-3 text-xl font-semibold">
              {t("admin.createUser")}
            </h2>
            <form onSubmit={createUser} className="space-y-3">
              <div className="flex flex-col gap-3 sm:flex-row">
                <input
                  id="new-user-email"
                  type="email"
                  required
                  autoComplete="off"
                  aria-label={t("admin.emailPlaceholder")}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t("admin.emailPlaceholder")}
                  className="flex-1 rounded-lg border px-3 py-2"
                />
                <PasswordInput
                  id="new-user-password"
                  value={password}
                  onChange={setPassword}
                  autoComplete="new-password"
                  required
                  minLength={8}
                  ariaLabel={t("admin.passwordPlaceholder")}
                  placeholder={t("admin.passwordPlaceholder")}
                  wrapperClassName="relative flex-1"
                />
              </div>
              <div className="flex items-center gap-3">
                <select
                  value={accountType}
                  onChange={(e) =>
                    setAccountType(e.target.value as AccountType)
                  }
                  className="rounded-lg border bg-white px-3 py-2 dark:bg-gray-800"
                >
                  {ACCOUNT_TYPES.map((at) => (
                    <option key={at} value={at}>
                      {t(TYPE_LABEL_KEY[at])}
                    </option>
                  ))}
                </select>
                <button
                  type="submit"
                  disabled={creating}
                  className="rounded-lg bg-indigo-600 px-4 py-2 font-medium text-white disabled:opacity-50"
                >
                  {creating ? t("admin.creating") : t("admin.create")}
                </button>
                {createMsg && (
                  <span className="text-sm text-green-600">{createMsg}</span>
                )}
              </div>
            </form>
            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
              {t("admin.verifiedHint")}
            </p>
          </section>

          <section className="rounded-lg border p-4">
            <h2 className="mb-2 text-xl font-semibold">
              {t("admin.contactTitle")}
            </h2>
            <p className="mb-4 text-sm text-gray-600 dark:text-gray-400">
              {t("admin.contactHint")}
            </p>
            <form onSubmit={contactSelectedUsers} className="space-y-3">
              <label
                htmlFor="contact-subject"
                className="block text-sm font-medium"
              >
                {t("admin.contactSubject")}
              </label>
              <input
                id="contact-subject"
                required
                maxLength={200}
                value={contactSubject}
                onChange={(event) => setContactSubject(event.target.value)}
                placeholder={t("admin.contactSubjectPlaceholder")}
                className="w-full rounded-lg border px-3 py-2"
              />
              <label
                htmlFor="contact-message"
                className="block text-sm font-medium"
              >
                {t("admin.contactMessage")}
              </label>
              <textarea
                id="contact-message"
                required
                maxLength={20_000}
                rows={8}
                value={contactBody}
                onChange={(event) => setContactBody(event.target.value)}
                placeholder={t("admin.contactMessagePlaceholder")}
                className="w-full rounded-lg border px-3 py-2"
              />
              <label className="flex items-start gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={contactConfirmation}
                  onChange={(event) =>
                    setContactConfirmation(event.target.checked)
                  }
                  className="mt-1"
                />
                <span>{t("admin.contactConfirmation")}</span>
              </label>
              <button
                type="submit"
                disabled={
                  contacting ||
                  !contactConfirmation ||
                  selectedRecipientIds.length === 0
                }
                className="rounded-lg bg-indigo-600 px-4 py-2 font-medium text-white disabled:opacity-50"
              >
                {contacting
                  ? t("admin.contacting")
                  : t("admin.contactSend", {
                      count: selectedRecipientIds.length,
                    })}
              </button>
              {contactMessage && (
                <p className="text-sm text-green-600">{contactMessage}</p>
              )}
            </form>
          </section>

          <section className="rounded-lg border p-4">
            <h2 className="mb-2 text-xl font-semibold">
              Official course catalog
            </h2>
            <p className="mb-3 text-sm text-gray-600 dark:text-gray-400">
              Promoting a course publishes it in the Official Courses library.
            </p>
            <div className="flex flex-wrap gap-2">
              <input
                aria-label="Course ID"
                value={courseId}
                onChange={(event) => setCourseId(event.target.value)}
                placeholder="Course UUID"
                className="flex-1 rounded-lg border px-3 py-2"
              />
              <button
                disabled={updatingCourse || !courseId.trim()}
                onClick={() => setCourseOfficial(true)}
                className="rounded-lg bg-indigo-600 px-3 py-2 text-white disabled:opacity-60"
              >
                Make official
              </button>
              <button
                disabled={updatingCourse || !courseId.trim()}
                onClick={() => setCourseOfficial(false)}
                className="rounded-lg border px-3 py-2 disabled:opacity-60"
              >
                Remove official status
              </button>
            </div>
          </section>
        </div>

        <SchoolAdminPanel />
        <CategoriesSection />
        <PromosSection />

        <div className="space-y-6">
          <CourseCollectionAssignmentsSection />

          <section className="rounded-lg border p-4">
            <h2 className="mb-3 text-xl font-semibold">
              {users
                ? t("admin.users", { count: users.length })
                : t("admin.users")}
            </h2>
            <button
              type="button"
              onClick={toggleAllVerifiedRecipients}
              disabled={verifiedUsers.length === 0}
              className="mb-3 rounded-lg border px-3 py-2 text-sm disabled:opacity-50"
            >
              {selectedRecipientIds.length === verifiedUsers.length
                ? t("admin.clearSelection")
                : t("admin.selectVerified", { count: verifiedUsers.length })}
            </button>
            {loading && !error && (
              <p className="text-gray-500 dark:text-gray-400">
                {t("admin.loading")}
              </p>
            )}
            <ul className="space-y-2">
              {users?.map((u) => (
                <li
                  key={u.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3"
                >
                  <input
                    type="checkbox"
                    aria-label={t("admin.selectUser", { email: u.email })}
                    checked={selectedRecipientIds.includes(u.id)}
                    disabled={!u.emailVerifiedAt}
                    onChange={() => toggleRecipient(u.id)}
                    className="h-4 w-4"
                  />
                  <div className="min-w-0">
                    <p className="truncate font-medium">{u.email}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {u.emailVerifiedAt
                        ? t("admin.verified")
                        : t("admin.unverified")}{" "}
                      ·{" "}
                      {t("admin.joined", {
                        date: new Date(u.createdAt).toLocaleDateString(),
                      })}
                    </p>
                  </div>
                  <select
                    value={u.accountType}
                    onChange={(e) =>
                      changeType(u.id, e.target.value as AccountType)
                    }
                    className="rounded-lg border bg-white px-2 py-1 text-sm dark:bg-gray-800"
                  >
                    {ACCOUNT_TYPES.map((at) => (
                      <option key={at} value={at}>
                        {t(TYPE_LABEL_KEY[at])}
                      </option>
                    ))}
                  </select>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}
