import { supabase } from '@/integrations/supabase/client';

export interface UserPreferences {
  id: string;
  user_id: string;
  dark_mode: boolean;
  compact_view: boolean;
  email_notifications: boolean;
  push_notifications: boolean;
  leave_update_notifications: boolean;
  created_at: string;
  updated_at: string;
}

class SettingsService {
  async getUserPreferences(userId: string): Promise<UserPreferences | null> {
    const { data, error } = await supabase
      .from('user_preferences')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 means no rows found
      console.error('Error fetching user preferences:', error);
      throw error;
    }

    return data;
  }

  async createOrUpdatePreferences(userId: string, preferences: Partial<Omit<UserPreferences, 'id' | 'user_id' | 'created_at' | 'updated_at'>>): Promise<UserPreferences> {
    const existingPrefs = await this.getUserPreferences(userId);

    if (existingPrefs) {
      // Update existing preferences
      const { data, error } = await supabase
        .from('user_preferences')
        .update(preferences)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) {
        console.error('Error updating preferences:', error);
        throw error;
      }

      return data;
    } else {
      // Create new preferences
      const { data, error } = await supabase
        .from('user_preferences')
        .insert({
          user_id: userId,
          ...preferences
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating preferences:', error);
        throw error;
      }

      return data;
    }
  }
}

export const settingsService = new SettingsService();
