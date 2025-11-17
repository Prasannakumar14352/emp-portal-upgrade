import { useState, useEffect } from "react";
import { useAuth } from "./useAuth";
import { userService, UserRole } from "@/services/userService";

export type { UserRole };

export function useUserRole() {
  const { user, loading: authLoading } = useAuth();
  const [role, setRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    // Wait for auth state to resolve to avoid flashing null roles
    if (authLoading) {
      setLoading(true);
      return () => {
        isMounted = false;
      };
    }

    if (!user) {
      if (isMounted) {
        setRole(null);
        setLoading(false);
      }
      return () => {
        isMounted = false;
      };
    }

    const cacheKey = `user_role:${user.id}`;
    const cachedRole = localStorage.getItem(cacheKey) as UserRole | null;
    if (cachedRole) {
      setRole(cachedRole);
      setLoading(false);
    } else {
      setLoading(true);
    }

    const fetchUserRole = async () => {
      try {
        const userRole = await userService.getUserRole(user.id);
        if (!isMounted) return;
        setRole(userRole);
        localStorage.setItem(cacheKey, userRole);
      } catch (error) {
        console.error("Error fetching user role:", error);
        if (!isMounted) return;
        setRole("employee"); // Default to employee if no role found
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchUserRole();

    return () => {
      isMounted = false;
    };
  }, [user, authLoading]);

  return { role, loading };
}
