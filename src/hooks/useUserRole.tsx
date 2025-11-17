import { useState, useEffect } from "react";
import { useAuth } from "./useAuth";
import { userService, UserRole } from "@/services/userService";

export type { UserRole };

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

    const fetchUserRole = async () => {
      try {
        const userRole = await userService.getUserRole(user.id);
        setRole(userRole);
      } catch (error) {
        console.error("Error fetching user role:", error);
        setRole("employee"); // Default to employee if no role found
      } finally {
        setLoading(false);
      }
    };

    fetchUserRole();
  }, [user]);

  return { role, loading };
}
