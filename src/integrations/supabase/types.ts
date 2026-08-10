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
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      audit_logs: {
        Row: {
          action: string
          created_at: string
          entity_id: string | null
          entity_type: string
          id: string
          new_values: Json | null
          old_values: Json | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: string
          new_values?: Json | null
          old_values?: Json | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
          new_values?: Json | null
          old_values?: Json | null
          user_id?: string | null
        }
        Relationships: []
      }
      departments: {
        Row: {
          code: string
          contact_name: string | null
          contact_phone: string | null
          created_at: string
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          code: string
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          code?: string
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      drivers: {
        Row: {
          assigned_vehicle_id: string | null
          created_at: string
          full_name: string
          id: string
          is_active: boolean
          license_number: string | null
          notes: string | null
          phone: string | null
          status: Database["public"]["Enums"]["driver_status"]
          updated_at: string
        }
        Insert: {
          assigned_vehicle_id?: string | null
          created_at?: string
          full_name: string
          id?: string
          is_active?: boolean
          license_number?: string | null
          notes?: string | null
          phone?: string | null
          status?: Database["public"]["Enums"]["driver_status"]
          updated_at?: string
        }
        Update: {
          assigned_vehicle_id?: string | null
          created_at?: string
          full_name?: string
          id?: string
          is_active?: boolean
          license_number?: string | null
          notes?: string | null
          phone?: string | null
          status?: Database["public"]["Enums"]["driver_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "drivers_vehicle_fk"
            columns: ["assigned_vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          message: string
          related_request_id: string | null
          title: string
          type: Database["public"]["Enums"]["notification_type"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          related_request_id?: string | null
          title: string
          type?: Database["public"]["Enums"]["notification_type"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          related_request_id?: string | null
          title?: string
          type?: Database["public"]["Enums"]["notification_type"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_related_request_id_fkey"
            columns: ["related_request_id"]
            isOneToOne: false
            referencedRelation: "transport_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          auth_user_id: string
          created_at: string
          department_id: string | null
          email: string
          full_name: string
          id: string
          is_active: boolean
          phone: string | null
          updated_at: string
        }
        Insert: {
          auth_user_id: string
          created_at?: string
          department_id?: string | null
          email?: string
          full_name?: string
          id?: string
          is_active?: boolean
          phone?: string | null
          updated_at?: string
        }
        Update: {
          auth_user_id?: string
          created_at?: string
          department_id?: string | null
          email?: string
          full_name?: string
          id?: string
          is_active?: boolean
          phone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      system_settings: {
        Row: {
          description: string | null
          key: string
          updated_at: string
          value: string
        }
        Insert: {
          description?: string | null
          key: string
          updated_at?: string
          value: string
        }
        Update: {
          description?: string | null
          key?: string
          updated_at?: string
          value?: string
        }
        Relationships: []
      }
      transport_assignments: {
        Row: {
          assigned_by: string | null
          assignment_date: string
          created_at: string
          departure_datetime: string
          driver_id: string
          expected_return_datetime: string
          id: string
          notes: string | null
          status: Database["public"]["Enums"]["assignment_status"]
          transport_request_id: string
          updated_at: string
          vehicle_id: string
        }
        Insert: {
          assigned_by?: string | null
          assignment_date?: string
          created_at?: string
          departure_datetime: string
          driver_id: string
          expected_return_datetime: string
          id?: string
          notes?: string | null
          status?: Database["public"]["Enums"]["assignment_status"]
          transport_request_id: string
          updated_at?: string
          vehicle_id: string
        }
        Update: {
          assigned_by?: string | null
          assignment_date?: string
          created_at?: string
          departure_datetime?: string
          driver_id?: string
          expected_return_datetime?: string
          id?: string
          notes?: string | null
          status?: Database["public"]["Enums"]["assignment_status"]
          transport_request_id?: string
          updated_at?: string
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transport_assignments_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transport_assignments_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transport_assignments_transport_request_id_fkey"
            columns: ["transport_request_id"]
            isOneToOne: false
            referencedRelation: "transport_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transport_assignments_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      transport_request_days: {
        Row: {
          afternoon_requested: boolean
          created_at: string
          departure_time: string | null
          destination: string | null
          goods_carried: string | null
          id: string
          morning_requested: boolean
          number_of_passengers: number | null
          purpose: string | null
          return_time: string | null
          transport_request_id: string
          trip_date: string
        }
        Insert: {
          afternoon_requested?: boolean
          created_at?: string
          departure_time?: string | null
          destination?: string | null
          goods_carried?: string | null
          id?: string
          morning_requested?: boolean
          number_of_passengers?: number | null
          purpose?: string | null
          return_time?: string | null
          transport_request_id: string
          trip_date: string
        }
        Update: {
          afternoon_requested?: boolean
          created_at?: string
          departure_time?: string | null
          destination?: string | null
          goods_carried?: string | null
          id?: string
          morning_requested?: boolean
          number_of_passengers?: number | null
          purpose?: string | null
          return_time?: string | null
          transport_request_id?: string
          trip_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "transport_request_days_transport_request_id_fkey"
            columns: ["transport_request_id"]
            isOneToOne: false
            referencedRelation: "transport_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      transport_requests: {
        Row: {
          completed_at: string | null
          contact_number: string | null
          created_at: string
          destination: string | null
          estimated_return_time: string | null
          goods_carried: string | null
          id: string
          number_of_passengers: number | null
          preferred_departure_time: string | null
          purpose: string | null
          rejection_reason: string | null
          remarks: string | null
          request_date: string
          request_number: string
          request_type: Database["public"]["Enums"]["request_type"]
          requester_id: string | null
          requesting_department_id: string
          reviewed_at: string | null
          status: Database["public"]["Enums"]["request_status"]
          submitted_at: string | null
          trip_from_date: string | null
          trip_to_date: string | null
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          contact_number?: string | null
          created_at?: string
          destination?: string | null
          estimated_return_time?: string | null
          goods_carried?: string | null
          id?: string
          number_of_passengers?: number | null
          preferred_departure_time?: string | null
          purpose?: string | null
          rejection_reason?: string | null
          remarks?: string | null
          request_date?: string
          request_number?: string
          request_type: Database["public"]["Enums"]["request_type"]
          requester_id?: string | null
          requesting_department_id: string
          reviewed_at?: string | null
          status?: Database["public"]["Enums"]["request_status"]
          submitted_at?: string | null
          trip_from_date?: string | null
          trip_to_date?: string | null
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          contact_number?: string | null
          created_at?: string
          destination?: string | null
          estimated_return_time?: string | null
          goods_carried?: string | null
          id?: string
          number_of_passengers?: number | null
          preferred_departure_time?: string | null
          purpose?: string | null
          rejection_reason?: string | null
          remarks?: string | null
          request_date?: string
          request_number?: string
          request_type?: Database["public"]["Enums"]["request_type"]
          requester_id?: string | null
          requesting_department_id?: string
          reviewed_at?: string | null
          status?: Database["public"]["Enums"]["request_status"]
          submitted_at?: string | null
          trip_from_date?: string | null
          trip_to_date?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "transport_requests_requester_id_fkey"
            columns: ["requester_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transport_requests_requesting_department_id_fkey"
            columns: ["requesting_department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
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
          role: Database["public"]["Enums"]["app_role"]
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
      vehicles: {
        Row: {
          assigned_driver_id: string | null
          created_at: string
          current_status: Database["public"]["Enums"]["vehicle_status"]
          id: string
          is_active: boolean
          model: string | null
          notes: string | null
          passenger_capacity: number
          plate_number: string
          updated_at: string
          vehicle_type: string
        }
        Insert: {
          assigned_driver_id?: string | null
          created_at?: string
          current_status?: Database["public"]["Enums"]["vehicle_status"]
          id?: string
          is_active?: boolean
          model?: string | null
          notes?: string | null
          passenger_capacity?: number
          plate_number: string
          updated_at?: string
          vehicle_type?: string
        }
        Update: {
          assigned_driver_id?: string | null
          created_at?: string
          current_status?: Database["public"]["Enums"]["vehicle_status"]
          id?: string
          is_active?: boolean
          model?: string | null
          notes?: string | null
          passenger_capacity?: number
          plate_number?: string
          updated_at?: string
          vehicle_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "vehicles_assigned_driver_id_fkey"
            columns: ["assigned_driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      current_department_id: { Args: never; Returns: string }
      current_profile_id: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_staff: { Args: { _user_id: string }; Returns: boolean }
      notify_staff: {
        Args: {
          _message: string
          _request: string
          _title: string
          _type: Database["public"]["Enums"]["notification_type"]
        }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "department_user" | "logistics_officer" | "admin"
      assignment_status: "assigned" | "in_progress" | "completed" | "cancelled"
      driver_status: "available" | "assigned" | "unavailable" | "leave"
      notification_type:
        | "request_submitted"
        | "request_approved"
        | "request_rejected"
        | "vehicle_assigned"
        | "request_cancelled"
        | "reminder"
        | "system"
      request_status:
        | "draft"
        | "submitted"
        | "under_review"
        | "approved"
        | "rejected"
        | "assigned"
        | "in_progress"
        | "completed"
        | "cancelled"
      request_type: "daily" | "weekly"
      vehicle_status: "available" | "assigned" | "maintenance" | "unavailable"
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
      app_role: ["department_user", "logistics_officer", "admin"],
      assignment_status: ["assigned", "in_progress", "completed", "cancelled"],
      driver_status: ["available", "assigned", "unavailable", "leave"],
      notification_type: [
        "request_submitted",
        "request_approved",
        "request_rejected",
        "vehicle_assigned",
        "request_cancelled",
        "reminder",
        "system",
      ],
      request_status: [
        "draft",
        "submitted",
        "under_review",
        "approved",
        "rejected",
        "assigned",
        "in_progress",
        "completed",
        "cancelled",
      ],
      request_type: ["daily", "weekly"],
      vehicle_status: ["available", "assigned", "maintenance", "unavailable"],
    },
  },
} as const
