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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      admin_profiles: {
        Row: {
          created_at: string
          display_name: string
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_name: string
          id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_name?: string
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      gear: {
        Row: {
          created_at: string
          current_location: string
          icon_kind: string | null
          id: string
          last_note: string | null
          last_updated: string
          moved_by: string | null
          name: string
          requestable: boolean
          status: Database["public"]["Enums"]["gear_status"]
          sub_location: string | null
        }
        Insert: {
          created_at?: string
          current_location?: string
          icon_kind?: string | null
          id?: string
          last_note?: string | null
          last_updated?: string
          moved_by?: string | null
          name: string
          requestable?: boolean
          status?: Database["public"]["Enums"]["gear_status"]
          sub_location?: string | null
        }
        Update: {
          created_at?: string
          current_location?: string
          icon_kind?: string | null
          id?: string
          last_note?: string | null
          last_updated?: string
          moved_by?: string | null
          name?: string
          requestable?: boolean
          status?: Database["public"]["Enums"]["gear_status"]
          sub_location?: string | null
        }
        Relationships: []
      }
      gear_history: {
        Row: {
          gear_id: string
          id: string
          location: string
          moved_by: string | null
          note: string | null
          sub_location: string | null
          timestamp: string
        }
        Insert: {
          gear_id: string
          id?: string
          location: string
          moved_by?: string | null
          note?: string | null
          sub_location?: string | null
          timestamp?: string
        }
        Update: {
          gear_id?: string
          id?: string
          location?: string
          moved_by?: string | null
          note?: string | null
          sub_location?: string | null
          timestamp?: string
        }
        Relationships: [
          {
            foreignKeyName: "gear_history_gear_id_fkey"
            columns: ["gear_id"]
            isOneToOne: false
            referencedRelation: "gear"
            referencedColumns: ["id"]
          },
        ]
      }
      gear_request_items: {
        Row: {
          created_at: string
          gear_id: string
          id: string
          request_id: string
        }
        Insert: {
          created_at?: string
          gear_id: string
          id?: string
          request_id: string
        }
        Update: {
          created_at?: string
          gear_id?: string
          id?: string
          request_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "gear_request_items_gear_id_fkey"
            columns: ["gear_id"]
            isOneToOne: false
            referencedRelation: "gear"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gear_request_items_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "gear_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      gear_requests: {
        Row: {
          created_at: string
          id: string
          location: string
          needed_date: string
          notes: string | null
          photo_request_id: string | null
          requestor_name: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["gear_request_status"]
        }
        Insert: {
          created_at?: string
          id?: string
          location: string
          needed_date: string
          notes?: string | null
          photo_request_id?: string | null
          requestor_name: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["gear_request_status"]
        }
        Update: {
          created_at?: string
          id?: string
          location?: string
          needed_date?: string
          notes?: string | null
          photo_request_id?: string | null
          requestor_name?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["gear_request_status"]
        }
        Relationships: [
          {
            foreignKeyName: "gear_requests_photo_request_id_fkey"
            columns: ["photo_request_id"]
            isOneToOne: false
            referencedRelation: "photo_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      onboarding_hire_checklist: {
        Row: {
          completed: boolean
          completed_at: string | null
          created_at: string
          day_offset: number | null
          hire_id: string
          id: string
          label: string
          owner: string | null
          section: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          day_offset?: number | null
          hire_id: string
          id?: string
          label: string
          owner?: string | null
          section?: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          day_offset?: number | null
          hire_id?: string
          id?: string
          label?: string
          owner?: string | null
          section?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "onboarding_hire_checklist_hire_id_fkey"
            columns: ["hire_id"]
            isOneToOne: false
            referencedRelation: "onboarding_hires"
            referencedColumns: ["id"]
          },
        ]
      }
      onboarding_hire_timeline: {
        Row: {
          created_at: string
          day_offset: number
          description: string | null
          hire_id: string
          id: string
          label: string
          sort_order: number
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          day_offset?: number
          description?: string | null
          hire_id: string
          id?: string
          label: string
          sort_order?: number
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          day_offset?: number
          description?: string | null
          hire_id?: string
          id?: string
          label?: string
          sort_order?: number
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "onboarding_hire_timeline_hire_id_fkey"
            columns: ["hire_id"]
            isOneToOne: false
            referencedRelation: "onboarding_hires"
            referencedColumns: ["id"]
          },
        ]
      }
      onboarding_hires: {
        Row: {
          archived: boolean
          coordinator_name: string | null
          created_at: string
          email: string
          id: string
          name: string
          role_label: string | null
          start_date: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          archived?: boolean
          coordinator_name?: string | null
          created_at?: string
          email: string
          id?: string
          name: string
          role_label?: string | null
          start_date: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          archived?: boolean
          coordinator_name?: string | null
          created_at?: string
          email?: string
          id?: string
          name?: string
          role_label?: string | null
          start_date?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      onboarding_pages: {
        Row: {
          blocks: Json
          created_at: string
          id: string
          slug: string
          sort_order: number
          subtitle: string | null
          title: string
          updated_at: string
        }
        Insert: {
          blocks?: Json
          created_at?: string
          id?: string
          slug: string
          sort_order?: number
          subtitle?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          blocks?: Json
          created_at?: string
          id?: string
          slug?: string
          sort_order?: number
          subtitle?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      onboarding_templates: {
        Row: {
          checklist: Json
          created_at: string
          description: string | null
          id: string
          name: string
          sort_order: number
          timeline: Json
          updated_at: string
        }
        Insert: {
          checklist?: Json
          created_at?: string
          description?: string | null
          id?: string
          name: string
          sort_order?: number
          timeline?: Json
          updated_at?: string
        }
        Update: {
          checklist?: Json
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          sort_order?: number
          timeline?: Json
          updated_at?: string
        }
        Relationships: []
      }
      photo_request_assignments: {
        Row: {
          claimed_at: string
          created_at: string
          id: string
          opening_id: string
          photographer_id: string
          released_at: string | null
          released_by: string | null
          request_id: string
        }
        Insert: {
          claimed_at?: string
          created_at?: string
          id?: string
          opening_id: string
          photographer_id: string
          released_at?: string | null
          released_by?: string | null
          request_id: string
        }
        Update: {
          claimed_at?: string
          created_at?: string
          id?: string
          opening_id?: string
          photographer_id?: string
          released_at?: string | null
          released_by?: string | null
          request_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "photo_request_assignments_opening_id_fkey"
            columns: ["opening_id"]
            isOneToOne: false
            referencedRelation: "photo_request_openings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "photo_request_assignments_photographer_id_fkey"
            columns: ["photographer_id"]
            isOneToOne: false
            referencedRelation: "photographers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "photo_request_assignments_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "photo_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      photo_request_openings: {
        Row: {
          budget_cents: number | null
          created_at: string
          id: string
          position: number
          request_id: string
          role: Database["public"]["Enums"]["photographer_tier"]
        }
        Insert: {
          budget_cents?: number | null
          created_at?: string
          id?: string
          position?: number
          request_id: string
          role: Database["public"]["Enums"]["photographer_tier"]
        }
        Update: {
          budget_cents?: number | null
          created_at?: string
          id?: string
          position?: number
          request_id?: string
          role?: Database["public"]["Enums"]["photographer_tier"]
        }
        Relationships: [
          {
            foreignKeyName: "photo_request_openings_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "photo_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      photo_request_shot_lists: {
        Row: {
          brief: Json
          created_at: string
          id: string
          request_id: string
          updated_at: string
        }
        Insert: {
          brief?: Json
          created_at?: string
          id?: string
          request_id: string
          updated_at?: string
        }
        Update: {
          brief?: Json
          created_at?: string
          id?: string
          request_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "photo_request_shot_lists_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: true
            referencedRelation: "photo_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      photo_requests: {
        Row: {
          admin_notes: string | null
          assigned_to: string | null
          budget: string | null
          company: string
          concur_budget_approver: string | null
          concur_class: string | null
          concur_company: string | null
          concur_department: string | null
          concur_expense_category: string | null
          concur_people_resource_type: string | null
          concur_project: string | null
          coverage_other: string | null
          coverage_types: Database["public"]["Enums"]["photo_coverage_type"][]
          created_at: string
          email: string
          end_time: string | null
          event_date: string | null
          event_end_date: string | null
          event_location: string | null
          event_name: string | null
          first_name: string
          id: string
          last_name: string
          notes: string | null
          on_site_contact_name: string | null
          on_site_contact_phone: string | null
          request_types: Database["public"]["Enums"]["photo_request_type"][]
          reviewed_at: string | null
          reviewed_by: string | null
          spans_multiple_days: boolean
          start_time: string | null
          status: Database["public"]["Enums"]["photo_request_status"]
          team: string | null
          updated_at: string
        }
        Insert: {
          admin_notes?: string | null
          assigned_to?: string | null
          budget?: string | null
          company: string
          concur_budget_approver?: string | null
          concur_class?: string | null
          concur_company?: string | null
          concur_department?: string | null
          concur_expense_category?: string | null
          concur_people_resource_type?: string | null
          concur_project?: string | null
          coverage_other?: string | null
          coverage_types?: Database["public"]["Enums"]["photo_coverage_type"][]
          created_at?: string
          email: string
          end_time?: string | null
          event_date?: string | null
          event_end_date?: string | null
          event_location?: string | null
          event_name?: string | null
          first_name: string
          id?: string
          last_name: string
          notes?: string | null
          on_site_contact_name?: string | null
          on_site_contact_phone?: string | null
          request_types?: Database["public"]["Enums"]["photo_request_type"][]
          reviewed_at?: string | null
          reviewed_by?: string | null
          spans_multiple_days?: boolean
          start_time?: string | null
          status?: Database["public"]["Enums"]["photo_request_status"]
          team?: string | null
          updated_at?: string
        }
        Update: {
          admin_notes?: string | null
          assigned_to?: string | null
          budget?: string | null
          company?: string
          concur_budget_approver?: string | null
          concur_class?: string | null
          concur_company?: string | null
          concur_department?: string | null
          concur_expense_category?: string | null
          concur_people_resource_type?: string | null
          concur_project?: string | null
          coverage_other?: string | null
          coverage_types?: Database["public"]["Enums"]["photo_coverage_type"][]
          created_at?: string
          email?: string
          end_time?: string | null
          event_date?: string | null
          event_end_date?: string | null
          event_location?: string | null
          event_name?: string | null
          first_name?: string
          id?: string
          last_name?: string
          notes?: string | null
          on_site_contact_name?: string | null
          on_site_contact_phone?: string | null
          request_types?: Database["public"]["Enums"]["photo_request_type"][]
          reviewed_at?: string | null
          reviewed_by?: string | null
          spans_multiple_days?: boolean
          start_time?: string | null
          status?: Database["public"]["Enums"]["photo_request_status"]
          team?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      photographers: {
        Row: {
          active: boolean
          created_at: string
          email: string
          id: string
          name: string
          phone: string | null
          tier: Database["public"]["Enums"]["photographer_tier"]
          token: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          email: string
          id?: string
          name: string
          phone?: string | null
          tier?: Database["public"]["Enums"]["photographer_tier"]
          token: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          email?: string
          id?: string
          name?: string
          phone?: string | null
          tier?: Database["public"]["Enums"]["photographer_tier"]
          token?: string
          updated_at?: string
        }
        Relationships: []
      }
      shot_list_location_blocks: {
        Row: {
          address: string
          alias: string | null
          arrival: string
          created_at: string
          editing_space: string
          id: string
          key: string
          label: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          address?: string
          alias?: string | null
          arrival?: string
          created_at?: string
          editing_space?: string
          id?: string
          key: string
          label: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          address?: string
          alias?: string | null
          arrival?: string
          created_at?: string
          editing_space?: string
          id?: string
          key?: string
          label?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      shot_list_segment_blocks: {
        Row: {
          created_at: string
          default_location: string | null
          default_roles: string[]
          focus: string | null
          id: string
          key: string
          shots: Json
          sort_order: number
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          default_location?: string | null
          default_roles?: string[]
          focus?: string | null
          id?: string
          key: string
          shots?: Json
          sort_order?: number
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          default_location?: string | null
          default_roles?: string[]
          focus?: string | null
          id?: string
          key?: string
          shots?: Json
          sort_order?: number
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      shot_list_templates: {
        Row: {
          call_time: string | null
          created_at: string
          description: string | null
          details_notes: string | null
          editing_notes: string | null
          gear_notes: string | null
          id: string
          location_key: string | null
          name: string
          roles: string[]
          segment_keys: string[]
          sort_order: number
          updated_at: string
          wrap_time: string | null
        }
        Insert: {
          call_time?: string | null
          created_at?: string
          description?: string | null
          details_notes?: string | null
          editing_notes?: string | null
          gear_notes?: string | null
          id?: string
          location_key?: string | null
          name: string
          roles?: string[]
          segment_keys?: string[]
          sort_order?: number
          updated_at?: string
          wrap_time?: string | null
        }
        Update: {
          call_time?: string | null
          created_at?: string
          description?: string | null
          details_notes?: string | null
          editing_notes?: string | null
          gear_notes?: string | null
          id?: string
          location_key?: string | null
          name?: string
          roles?: string[]
          segment_keys?: string[]
          sort_order?: number
          updated_at?: string
          wrap_time?: string | null
        }
        Relationships: []
      }
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      claim_job: {
        Args: { _opening_id: string; _token: string }
        Returns: Json
      }
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      generate_gear_id: { Args: never; Returns: string }
      get_gear_conflicts: {
        Args: { _from: string; _to: string }
        Returns: {
          gear_id: string
          needed_date: string
          status: Database["public"]["Enums"]["gear_request_status"]
        }[]
      }
      get_job: {
        Args: { _opening_id: string; _token: string }
        Returns: {
          budget_cents: number
          claimed_by_me: boolean
          coverage_types: Database["public"]["Enums"]["photo_coverage_type"][]
          end_time: string
          event_date: string
          event_end_date: string
          event_location: string
          event_name: string
          is_claimed: boolean
          notes: string
          on_site_contact_name: string
          on_site_contact_phone: string
          opening_id: string
          request_id: string
          role: Database["public"]["Enums"]["photographer_tier"]
          spans_multiple_days: boolean
          start_time: string
        }[]
      }
      get_photographer_by_token: {
        Args: { _token: string }
        Returns: {
          active: boolean
          email: string
          id: string
          name: string
          tier: Database["public"]["Enums"]["photographer_tier"]
        }[]
      }
      get_recent_gear_for_requestor: {
        Args: { _limit?: number; _name: string }
        Returns: {
          gear_id: string
        }[]
      }
      get_shot_list: {
        Args: { _opening_id: string; _token: string }
        Returns: Json
      }
      has_admin_access: { Args: { _user_id: string }; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      list_my_jobs: {
        Args: { _token: string }
        Returns: {
          assignment_id: string
          budget_cents: number
          claimed_at: string
          coverage_types: Database["public"]["Enums"]["photo_coverage_type"][]
          end_time: string
          event_date: string
          event_end_date: string
          event_location: string
          event_name: string
          notes: string
          on_site_contact_name: string
          on_site_contact_phone: string
          opening_id: string
          request_id: string
          request_status: Database["public"]["Enums"]["photo_request_status"]
          role: Database["public"]["Enums"]["photographer_tier"]
          spans_multiple_days: boolean
          start_time: string
        }[]
      }
      list_open_jobs: {
        Args: { _token: string }
        Returns: {
          budget_cents: number
          coverage_types: Database["public"]["Enums"]["photo_coverage_type"][]
          end_time: string
          event_date: string
          event_end_date: string
          event_location: string
          event_name: string
          notes: string
          on_site_contact_name: string
          on_site_contact_phone: string
          opening_id: string
          point_taken: boolean
          request_id: string
          role: Database["public"]["Enums"]["photographer_tier"]
          spans_multiple_days: boolean
          start_time: string
        }[]
      }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
      release_job: {
        Args: { _opening_id: string; _token: string }
        Returns: Json
      }
      tier_rank: {
        Args: { t: Database["public"]["Enums"]["photographer_tier"] }
        Returns: number
      }
    }
    Enums: {
      app_role: "admin" | "team"
      gear_request_status: "pending" | "approved" | "denied"
      gear_status: "active" | "out_of_service" | "out_for_repair"
      photo_coverage_type: "live_event" | "photo_booth" | "other"
      photo_request_status:
        | "new"
        | "in_review"
        | "scheduled"
        | "completed"
        | "declined"
        | "archived"
        | "pending"
        | "approved_job_board"
        | "approved_shot_list"
        | "needs_revisions"
        | "denied"
      photo_request_type:
        | "photography_team"
        | "shot_list_addition"
        | "photoshoot"
      photographer_tier: "point" | "door_holder" | "training_door_holder"
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
      app_role: ["admin", "team"],
      gear_request_status: ["pending", "approved", "denied"],
      gear_status: ["active", "out_of_service", "out_for_repair"],
      photo_coverage_type: ["live_event", "photo_booth", "other"],
      photo_request_status: [
        "new",
        "in_review",
        "scheduled",
        "completed",
        "declined",
        "archived",
        "pending",
        "approved_job_board",
        "approved_shot_list",
        "needs_revisions",
        "denied",
      ],
      photo_request_type: [
        "photography_team",
        "shot_list_addition",
        "photoshoot",
      ],
      photographer_tier: ["point", "door_holder", "training_door_holder"],
    },
  },
} as const
