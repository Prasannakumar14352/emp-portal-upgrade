import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { authService, User, Session } from "@/services/authService";
import { useAuthLoading } from "./useAuthLoading";

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { setLoading: setAuthLoading } = useAuthLoading();

  useEffect(() => {
    // Set up auth state listener
    const { unsubscribe } = authService.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
      }
    );

    // Check for existing session
    authService.getSession().then((session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signOut = async () => {
    try {
      setAuthLoading(true, 'Signing out...');
      await authService.signOut();
      setUser(null);
      setSession(null);
      navigate("/auth");
    } finally {
      setAuthLoading(false);
    }
  };

  return {
    user,
    session,
    loading,
    signOut,
  };
}
