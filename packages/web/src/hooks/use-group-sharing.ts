import { useAuth } from "../auth/AuthContext";

/**
 * School, teacher and student accounts share with (and receive from) their
 * school and classes. Individuals only have public sharing.
 */
export function useGroupSharing(): boolean {
  const { user } = useAuth();
  return (
    user?.accountKind === "teacher" ||
    user?.accountKind === "student" ||
    user?.accountKind === "school"
  );
}
