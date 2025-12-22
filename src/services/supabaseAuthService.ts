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
      // Check if role already exists
      const { data: existingRole } = await supabase
        .from('user_roles')
        .select('id')
        .eq('user_id', userId)
        .eq('role', role)
        .maybeSingle();

      if (existingRole) {
        return true; // Role already assigned
      }

      // Insert the role
      const { error } = await supabase
        .from('user_roles')
        .insert({ user_id: userId, role });

      if (error) {
        console.error("Failed to assign role:", error);
        return false;
      }

      return true;
    } catch (error) {
      console.error("Error assigning role:", error);
      return false;
    }
  }
}

export const supabaseAuthService = new SupabaseAuthService();
