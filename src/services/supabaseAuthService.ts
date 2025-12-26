import { supabase } from "@/integrations/supabase/client";

export interface DemoAuthResponse {
  success: boolean;
  error?: string;
  user?: {
    id: string;
    email: string;
    full_name?: string;
  };
}

class SupabaseAuthService {
  async signUp(email: string, password: string, fullName?: string): Promise<DemoAuthResponse> {
    try {
      const redirectUrl = `${window.location.origin}/`;
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            full_name: fullName,
          }
        }
      });

      if (error) {
        return { success: false, error: error.message };
      }

      if (data.user) {
        return {
          success: true,
          user: {
            id: data.user.id,
            email: data.user.email || email,
            full_name: fullName,
          }
        };
      }

      return { success: false, error: "Failed to create account" };
    } catch (error) {
      console.error("Supabase signup error:", error);
      return { success: false, error: "An error occurred during signup" };
    }
  }

  async signIn(email: string, password: string): Promise<DemoAuthResponse> {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        return { success: false, error: error.message };
      }

      if (data.user) {
        return {
          success: true,
          user: {
            id: data.user.id,
            email: data.user.email || email,
            full_name: data.user.user_metadata?.full_name,
          }
        };
      }

      return { success: false, error: "Failed to sign in" };
    } catch (error) {
      console.error("Supabase signin error:", error);
      return { success: false, error: "An error occurred during login" };
    }
  }

  async signOut(): Promise<void> {
    await supabase.auth.signOut();
  }

  async getSession() {
    const { data: { session } } = await supabase.auth.getSession();
    return session;
  }

  async assignDemoRole(userId: string, role: 'hr' | 'manager' | 'employee'): Promise<boolean> {
    try {
      // Get user email to use with setup_demo_user function
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email) {
        console.error("No user email found for role assignment");
        return false;
      }

      // Use the setup_demo_user database function which runs with SECURITY DEFINER
      // This bypasses RLS and properly sets up the demo user with the correct role
      const { error } = await supabase.rpc('setup_demo_user', {
        p_email: user.email,
        p_full_name: user.user_metadata?.full_name || user.email,
        p_role: role
      });

      if (error) {
        console.error("Failed to setup demo user role:", error);
        return false;
      }

      return true;
    } catch (error) {
      console.error("Error assigning demo role:", error);
      return false;
    }
  }
}

export const supabaseAuthService = new SupabaseAuthService();
