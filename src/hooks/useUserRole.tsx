import { useState, useEffect } from "react";
import { useAuth } from "./useAuth";

export type UserRole = "employee" | "hr" | "manager";

export function useUserRole() {
  const { user } = useAuth();
  const [role, setRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setRole(null);
      setLoading(false);
      return;
    }

    const storedRole = localStorage.getItem("mockUserRole") as UserRole;
    setRole(storedRole || "employee");
    setLoading(false);
  }, [user]);

  return { role, loading };
}
