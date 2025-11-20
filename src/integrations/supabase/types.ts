export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      attendance_records: {
        Row: {
          check_in_time: string | null
          check_out_time: string | null
          created_at: string | null
          date: string
          id: string
          notes: string | null
          status: string | null
          updated_at: string | null
          employee_id: string
          work_hours: number | null
        }
        Insert: {
          check_in_time?: string | null
          check_out_time?: string | null
          created_at?: string | null
          date?: string
          id?: string
          notes?: string | null
          status?: string | null
          updated_at?: string | null
          employee_id: string
          work_hours?: number | null
        }
        Update: {
          check_in_time?: string | null
          check_out_time?: string | null
          created_at?: string | null
          date?: string
          id?: string
          notes?: string | null
          status?: string | null
          updated_at?: string | null
          employee_id?: string
          work_hours?: number | null
        }
        Relationships: []
      }
      employees: {
        Row: {
          created_at: string | null
          department: string
          email: string
          employee_id: number
          full_name: string
          id: string
          phone: string | null
          position: string
          status: string | null
          updated_at: string | null
          employee_id: string | null
        }
        Insert: {
          created_at?: string | null
          department: string
          email: string
          employee_id?: never
          full_name: string
          id?: string
          phone?: string | null
          position: string
          status?: string | null
          updated_at?: string | null
          employee_id?: string | null
        }
        Update: {
          created_at?: string | null
          department?: string
          email?: string
          employee_id?: never
          full_name?: string
          id?: string
          phone?: string | null
          position?: string
          status?: string | null
          updated_at?: string | null
          employee_id?: string | null
        }
        Relationships: []
      }
      holidays: {
        Row: {
          created_at: string | null
          date: string
          description: string | null
          id: string
          name: string
          type: string
        }
        Insert: {
          created_at?: string | null
          date: string
          description?: string | null
          id?: string
          name: string
          type: string
        }
        Update: {
          created_at?: string | null
          date?: string
          description?: string | null
          id?: string
          name?: string
          type?: string
        }
        Relationships: []
      }
      leave_balances: {
        Row: {
          carry_forward_days: number | null
          created_at: string | null
          id: string
          leave_type: string
          remaining_days: number
          total_days: number
          updated_at: string | null
          used_days: number
          employee_id: string
          year: number
        }
        Insert: {
          carry_forward_days?: number | null
          created_at?: string | null
          id?: string
          leave_type: string
          remaining_days?: number
          total_days?: number
          updated_at?: string | null
          used_days?: number
          employee_id: string
          year: number
        }
        Update: {
          carry_forward_days?: number | null
          created_at?: string | null
          id?: string
          leave_type?: string
          remaining_days?: number
          total_days?: number
          updated_at?: string | null
          used_days?: number
          employee_id?: string
          year?: number
        }
        Relationships: []
      }
      leave_comments: {
        Row: {
          comment: string
          created_at: string | null
          id: string
          leave_id: string
          employee_id: string
        }
        Insert: {
          comment: string
          created_at?: string | null
          id?: string
          leave_id: string
          employee_id: string
        }
        Update: {
          comment?: string
          created_at?: string | null
          id?: string
          leave_id?: string
          employee_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "leave_comments_leave_id_fkey"
            columns: ["leave_id"]
            isOneToOne: false
            referencedRelation: "leaves"
            referencedColumns: ["id"]
          },
        ]
      }
      leave_types: {
        Row: {
          created_at: string | null
          default_days: number
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          default_days?: number
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          default_days?: number
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      leaves: {
        Row: {
          approved_by: string | null
          created_at: string | null
          days: number
          end_date: string
          id: string
          leave_type: string
          reason: string
          start_date: string
          status: string | null
          updated_at: string | null
          employee_id: string
        }
        Insert: {
          approved_by?: string | null
          created_at?: string | null
          days: number
          end_date: string
          id?: string
          leave_type: string
          reason: string
          start_date: string
          status?: string | null
          updated_at?: string | null
          employee_id: string
        }
        Update: {
          approved_by?: string | null
          created_at?: string | null
          days?: number
          end_date?: string
          id?: string
          leave_type?: string
          reason?: string
          start_date?: string
          status?: string | null
          updated_at?: string | null
          employee_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string | null
          id: string
          message: string
          metadata: Json | null
          read: boolean | null
          title: string
          type: string
          employee_id: number
        }
        Insert: {
          created_at?: string | null
          id?: string
          message: string
          metadata?: Json | null
          read?: boolean | null
          title: string
          type: string
          employee_id: number
        }
        Update: {
          created_at?: string | null
          id?: string
          message?: string
          metadata?: Json | null
          read?: boolean | null
          title?: string
          type?: string
          employee_id?: number
        }
        Relationships: []
      }
      payslips: {
        Row: {
          allowances: number | null
          basic_salary: number
          created_at: string | null
          deductions: number | null
          file_url: string | null
          id: string
          month: string
          net_salary: number
          employee_id: string
          year: number
        }
        Insert: {
          allowances?: number | null
          basic_salary: number
          created_at?: string | null
          deductions?: number | null
          file_url?: string | null
          id?: string
          month: string
          net_salary: number
          employee_id: string
          year: number
        }
        Update: {
          allowances?: number | null
          basic_salary?: number
          created_at?: string | null
          deductions?: number | null
          file_url?: string | null
          id?: string
          month?: string
          net_salary?: number
          employee_id?: string
          year?: number
        }
        Relationships: []
      }
      performance_goals: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          progress: number | null
          status: string | null
          target_date: string | null
          title: string
          updated_at: string | null
          employee_id: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          progress?: number | null
          status?: string | null
          target_date?: string | null
          title: string
          updated_at?: string | null
          employee_id: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          progress?: number | null
          status?: string | null
          target_date?: string | null
          title?: string
          updated_at?: string | null
          employee_id?: string
        }
        Relationships: []
      }
      performance_reviews: {
        Row: {
          communication: number | null
          created_at: string | null
          employee_id: string
          feedback: string | null
          id: string
          overall_score: number
          problem_solving: number | null
          quality_of_work: number | null
          review_date: string
          review_period: string
          reviewer_id: string
          status: string | null
          teamwork: number | null
          time_management: number | null
          updated_at: string | null
        }
        Insert: {
          communication?: number | null
          created_at?: string | null
          employee_id: string
          feedback?: string | null
          id?: string
          overall_score: number
          problem_solving?: number | null
          quality_of_work?: number | null
          review_date?: string
          review_period: string
          reviewer_id: string
          status?: string | null
          teamwork?: number | null
          time_management?: number | null
          updated_at?: string | null
        }
        Update: {
          communication?: number | null
          created_at?: string | null
          employee_id?: string
          feedback?: string | null
          id?: string
          overall_score?: number
          problem_solving?: number | null
          quality_of_work?: number | null
          review_date?: string
          review_period?: string
          reviewer_id?: string
          status?: string | null
          teamwork?: number | null
          time_management?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          department: string | null
          email: string
          employee_id: number
          full_name: string
          hire_date: string | null
          id: string
          phone: string | null
          position: string | null
          two_factor_backup_codes: string | null
          two_factor_enabled: boolean | null
          two_factor_secret: string | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          department?: string | null
          email: string
          employee_id?: never
          full_name: string
          hire_date?: string | null
          id: string
          phone?: string | null
          position?: string | null
          two_factor_backup_codes?: string | null
          two_factor_enabled?: boolean | null
          two_factor_secret?: string | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          department?: string | null
          email?: string
          employee_id?: never
          full_name?: string
          hire_date?: string | null
          id?: string
          phone?: string | null
          position?: string | null
          two_factor_backup_codes?: string | null
          two_factor_enabled?: boolean | null
          two_factor_secret?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      user_preferences: {
        Row: {
          compact_view: boolean | null
          created_at: string | null
          dark_mode: boolean | null
          email_notifications: boolean | null
          id: string
          leave_update_notifications: boolean | null
          notification_sound: string | null
          notification_volume: number | null
          push_notifications: boolean | null
          updated_at: string | null
          employee_id: number
        }
        Insert: {
          compact_view?: boolean | null
          created_at?: string | null
          dark_mode?: boolean | null
          email_notifications?: boolean | null
          id?: string
          leave_update_notifications?: boolean | null
          notification_sound?: string | null
          notification_volume?: number | null
          push_notifications?: boolean | null
          updated_at?: string | null
          employee_id: number
        }
        Update: {
          compact_view?: boolean | null
          created_at?: string | null
          dark_mode?: boolean | null
          email_notifications?: boolean | null
          id?: string
          leave_update_notifications?: boolean | null
          notification_sound?: string | null
          notification_volume?: number | null
          push_notifications?: boolean | null
          updated_at?: string | null
          employee_id?: number
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          employee_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          employee_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          employee_id?: string
        }
        Relationships: []
      }
      user_sessions: {
        Row: {
          created_at: string
          id: string
          login_time: string
          logout_time: string | null
          session_duration: number | null
          employee_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          login_time?: string
          logout_time?: string | null
          session_duration?: number | null
          employee_id: string
        }
        Update: {
          created_at?: string
          id?: string
          login_time?: string
          logout_time?: string | null
          session_duration?: number | null
          employee_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _employee_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "employee" | "hr" | "manager"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["employee", "hr", "manager"],
    },
  },
} as const
