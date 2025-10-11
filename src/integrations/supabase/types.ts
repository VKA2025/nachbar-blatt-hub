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
      admin_audit_log: {
        Row: {
          action: string
          admin_user_id: string
          created_at: string | null
          details: Json | null
          id: string
        }
        Insert: {
          action: string
          admin_user_id: string
          created_at?: string | null
          details?: Json | null
          id?: string
        }
        Update: {
          action?: string
          admin_user_id?: string
          created_at?: string | null
          details?: Json | null
          id?: string
        }
        Relationships: []
      }
      flyers: {
        Row: {
          background_image_url: string | null
          created_at: string
          description: string | null
          external_url: string | null
          file_name: string | null
          file_size: number | null
          file_url: string | null
          id: string
          info_type_id: string | null
          is_active: boolean
          is_external: boolean
          neighbor_type: string | null
          title: string
          updated_at: string
          upload_date: string
          uploaded_by: string
        }
        Insert: {
          background_image_url?: string | null
          created_at?: string
          description?: string | null
          external_url?: string | null
          file_name?: string | null
          file_size?: number | null
          file_url?: string | null
          id?: string
          info_type_id?: string | null
          is_active?: boolean
          is_external?: boolean
          neighbor_type?: string | null
          title: string
          updated_at?: string
          upload_date?: string
          uploaded_by: string
        }
        Update: {
          background_image_url?: string | null
          created_at?: string
          description?: string | null
          external_url?: string | null
          file_name?: string | null
          file_size?: number | null
          file_url?: string | null
          id?: string
          info_type_id?: string | null
          is_active?: boolean
          is_external?: boolean
          neighbor_type?: string | null
          title?: string
          updated_at?: string
          upload_date?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "flyers_info_type_id_fkey"
            columns: ["info_type_id"]
            isOneToOne: false
            referencedRelation: "info_types"
            referencedColumns: ["id"]
          },
        ]
      }
      imprint_data: {
        Row: {
          city: string
          created_at: string
          email: string
          first_name: string
          house_number: string
          id: string
          last_name: string
          phone: string | null
          postal_code: string
          site_name: string
          street: string
          updated_at: string
        }
        Insert: {
          city: string
          created_at?: string
          email: string
          first_name: string
          house_number: string
          id?: string
          last_name: string
          phone?: string | null
          postal_code: string
          site_name?: string
          street: string
          updated_at?: string
        }
        Update: {
          city?: string
          created_at?: string
          email?: string
          first_name?: string
          house_number?: string
          id?: string
          last_name?: string
          phone?: string | null
          postal_code?: string
          site_name?: string
          street?: string
          updated_at?: string
        }
        Relationships: []
      }
      info_types: {
        Row: {
          created_at: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      neighbor_categories: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_for_exchange: boolean
          is_for_giving: boolean
          is_for_help: boolean
          is_for_lending: boolean
          name: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_for_exchange?: boolean
          is_for_giving?: boolean
          is_for_help?: boolean
          is_for_lending?: boolean
          name: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_for_exchange?: boolean
          is_for_giving?: boolean
          is_for_help?: boolean
          is_for_lending?: boolean
          name?: string
        }
        Relationships: []
      }
      neighbor_items: {
        Row: {
          availability_status: string
          available_from: string | null
          available_until: string | null
          category_id: string
          created_at: string
          deactivated: boolean
          deposit_required: number | null
          description: string | null
          duration: string | null
          exchange_preference: string | null
          id: string
          is_free: boolean | null
          offer_type: string
          owner_id: string
          photo_url: string | null
          subcategory_id: string
          tags: string[] | null
          title: string
          updated_at: string | null
          usage_tips: string | null
        }
        Insert: {
          availability_status?: string
          available_from?: string | null
          available_until?: string | null
          category_id: string
          created_at?: string
          deactivated?: boolean
          deposit_required?: number | null
          description?: string | null
          duration?: string | null
          exchange_preference?: string | null
          id?: string
          is_free?: boolean | null
          offer_type: string
          owner_id: string
          photo_url?: string | null
          subcategory_id: string
          tags?: string[] | null
          title: string
          updated_at?: string | null
          usage_tips?: string | null
        }
        Update: {
          availability_status?: string
          available_from?: string | null
          available_until?: string | null
          category_id?: string
          created_at?: string
          deactivated?: boolean
          deposit_required?: number | null
          description?: string | null
          duration?: string | null
          exchange_preference?: string | null
          id?: string
          is_free?: boolean | null
          offer_type?: string
          owner_id?: string
          photo_url?: string | null
          subcategory_id?: string
          tags?: string[] | null
          title?: string
          updated_at?: string | null
          usage_tips?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "neighbor_items_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "neighbor_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "neighbor_items_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "neighbor_items_subcategory_id_fkey"
            columns: ["subcategory_id"]
            isOneToOne: false
            referencedRelation: "neighbor_subcategories"
            referencedColumns: ["id"]
          },
        ]
      }
      neighbor_subcategories: {
        Row: {
          category_id: string
          created_at: string
          description: string | null
          id: string
          is_for_exchange: boolean
          is_for_giving: boolean
          is_for_help: boolean
          is_for_lending: boolean
          name: string
        }
        Insert: {
          category_id: string
          created_at?: string
          description?: string | null
          id?: string
          is_for_exchange?: boolean
          is_for_giving?: boolean
          is_for_help?: boolean
          is_for_lending?: boolean
          name: string
        }
        Update: {
          category_id?: string
          created_at?: string
          description?: string | null
          id?: string
          is_for_exchange?: boolean
          is_for_giving?: boolean
          is_for_help?: boolean
          is_for_lending?: boolean
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "neighbor_subcategories_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "neighbor_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      neighbor_transactions: {
        Row: {
          created_at: string
          end_date: string | null
          id: string
          item_id: string
          notes: string
          requester_id: string
          start_date: string | null
          status: string
        }
        Insert: {
          created_at?: string
          end_date?: string | null
          id?: string
          item_id: string
          notes: string
          requester_id: string
          start_date?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          end_date?: string | null
          id?: string
          item_id?: string
          notes?: string
          requester_id?: string
          start_date?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "neighbor_transactions_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "neighbor_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "neighbor_transactions_requester_id_fkey"
            columns: ["requester_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          email_notifications: boolean
          filter_preferences: Json | null
          first_name: string | null
          house_number: string | null
          id: string
          last_name: string | null
          sort_preferences: Json | null
          status: string | null
          street: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          email_notifications?: boolean
          filter_preferences?: Json | null
          first_name?: string | null
          house_number?: string | null
          id?: string
          last_name?: string | null
          sort_preferences?: Json | null
          status?: string | null
          street?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          email_notifications?: boolean
          filter_preferences?: Json | null
          first_name?: string | null
          house_number?: string | null
          id?: string
          last_name?: string | null
          sort_preferences?: Json | null
          status?: string | null
          street?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      street_districts: {
        Row: {
          created_at: string
          district: string
          id: string
          notes: string | null
          street_name: string
          updated_at: string
          year: number
        }
        Insert: {
          created_at?: string
          district: string
          id?: string
          notes?: string | null
          street_name: string
          updated_at?: string
          year?: number
        }
        Update: {
          created_at?: string
          district?: string
          id?: string
          notes?: string | null
          street_name?: string
          updated_at?: string
          year?: number
        }
        Relationships: []
      }
      streets: {
        Row: {
          created_at: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      waste_collection_schedule: {
        Row: {
          collection_date: string
          created_at: string
          day_of_week: string
          district: string
          id: string
          updated_at: string
          waste_type: string
        }
        Insert: {
          collection_date: string
          created_at?: string
          day_of_week: string
          district: string
          id?: string
          updated_at?: string
          waste_type: string
        }
        Update: {
          collection_date?: string
          created_at?: string
          day_of_week?: string
          district?: string
          id?: string
          updated_at?: string
          waste_type?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_update_profile: {
        Args: {
          new_email?: string
          new_email_notifications?: boolean
          new_first_name?: string
          new_house_number?: string
          new_last_name?: string
          new_street?: string
          target_user_id: string
        }
        Returns: boolean
      }
      get_user_management_data: {
        Args: { limit_count?: number }
        Returns: {
          created_at: string
          has_street: boolean
          last_updated: string
          notifications_enabled: boolean
          user_id: string
        }[]
      }
      get_user_statistics: {
        Args: Record<PropertyKey, never>
        Returns: {
          recent_signups: number
          total_users: number
          users_with_addresses: number
          users_with_notifications: number
        }[]
      }
      get_users_by_street: {
        Args: { street_name: string }
        Returns: {
          notifications_enabled: number
          street: string
          user_count: number
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      log_admin_action: {
        Args: { action_details?: Json; action_type: string }
        Returns: string
      }
    }
    Enums: {
      app_role: "admin" | "user"
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
      app_role: ["admin", "user"],
    },
  },
} as const
