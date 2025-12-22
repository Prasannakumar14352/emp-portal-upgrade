import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { authService, User, Session } from "@/services/authService";
import { useAuthLoading } from "./useAuthLoading";
import { supabase } from "@/integrations/supabase/client";
import { DEMO_MODE } from "@/config/demoAuth";

export function useAuth() {
  // Initialize from localStorage synchronously to avoid null state
  const [user, setUser] = useState<User | null>(() => {
    const storedUser = localStorage.getItem('user');
    return storedUser ? JSON.parse(storedUser) : null;
  });
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { setLoading: setAuthLoading } = useAuthLoading();

  useEffect(() => {
    let unsubscribeBackend: (() => void) | null = null;

    // Check Supabase session first (for demo mode)
    const checkSupabaseSession = async () => {
      const { data: { session: supabaseSession } } = await supabase.auth.getSession();
      
      if (supabaseSession?.user) {
        // User logged in via Supabase (demo mode)
        const supabaseUser: User = {
          id: supabaseSession.user.id,
          email: supabaseSession.user.email || '',
          full_name: supabaseSession.user.user_metadata?.full_name,
        };
        setUser(supabaseUser);
        setSession({
          access_token: supabaseSession.access_token,
          refresh_token: supabaseSession.refresh_token || '',
          user: supabaseUser,
        });
        setLoading(false);
        return true;
      }
      return false;
    };

    // Set up Supabase auth state listener for demo mode
    const { data: { subscription: supabaseSubscription } } = supabase.auth.onAuthStateChange(
      (event, supabaseSession) => {
        if (supabaseSession?.user) {
          const supabaseUser: User = {
            id: supabaseSession.user.id,
            email: supabaseSession.user.email || '',
            full_name: supabaseSession.user.user_metadata?.full_name,
          };
          setUser(supabaseUser);
          setSession({
            access_token: supabaseSession.access_token,
            refresh_token: supabaseSession.refresh_token || '',
            user: supabaseUser,
          });
        } else if (event === 'SIGNED_OUT') {
          // Only clear if we don't have a backend session
          const token = localStorage.getItem('token');
          if (!token) {
            setUser(null);
            setSession(null);
          }
        }
      }
    );

    // Initialize
    const init = async () => {
      // Check Supabase session first
      const hasSupabaseSession = await checkSupabaseSession();
      
      if (!hasSupabaseSession) {
        // Fall back to backend session
        const { unsubscribe } = authService.onAuthStateChange(
          (event, session) => {
            setSession(session);
            setUser(session?.user ?? null);
          }
        );
        unsubscribeBackend = unsubscribe;

        const backendSession = await authService.getSession();
        setSession(backendSession);
        setUser(backendSession?.user ?? null);
        setLoading(false);
      }
    };

    init();

    return () => {
      supabaseSubscription.unsubscribe();
      if (unsubscribeBackend) {
        unsubscribeBackend();
      }
    };
  }, []);

  const signOut = async () => {
    try {
      setAuthLoading(true, 'Signing out...');
      
      // Sign out from both Supabase and backend
      await supabase.auth.signOut();
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
