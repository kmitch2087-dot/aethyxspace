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
      admin_documents: {
        Row: {
          category: string | null
          created_at: string
          description: string | null
          file_name: string
          file_path: string
          file_size: number | null
          file_type: string | null
          id: string
          title: string
          updated_at: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          description?: string | null
          file_name: string
          file_path: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          title: string
          updated_at?: string
        }
        Update: {
          category?: string | null
          created_at?: string
          description?: string | null
          file_name?: string
          file_path?: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      admin_media: {
        Row: {
          created_at: string
          description: string | null
          file_name: string
          file_path: string
          file_size: number | null
          file_type: string
          id: string
          mime_type: string | null
          tags: string[] | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          file_name: string
          file_path: string
          file_size?: number | null
          file_type?: string
          id?: string
          mime_type?: string | null
          tags?: string[] | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          file_name?: string
          file_path?: string
          file_size?: number | null
          file_type?: string
          id?: string
          mime_type?: string | null
          tags?: string[] | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      blog_posts: {
        Row: {
          author_id: string | null
          content: string
          cover_image_url: string | null
          created_at: string
          excerpt: string | null
          id: string
          published: boolean
          published_at: string | null
          slug: string
          title: string
          updated_at: string
        }
        Insert: {
          author_id?: string | null
          content?: string
          cover_image_url?: string | null
          created_at?: string
          excerpt?: string | null
          id?: string
          published?: boolean
          published_at?: string | null
          slug: string
          title: string
          updated_at?: string
        }
        Update: {
          author_id?: string | null
          content?: string
          cover_image_url?: string | null
          created_at?: string
          excerpt?: string | null
          id?: string
          published?: boolean
          published_at?: string | null
          slug?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      client_agreements: {
        Row: {
          agreement_url: string | null
          amount: number | null
          client_email: string | null
          client_name: string
          created_at: string
          id: string
          notes: string | null
          service_name: string | null
          signed_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          agreement_url?: string | null
          amount?: number | null
          client_email?: string | null
          client_name: string
          created_at?: string
          id?: string
          notes?: string | null
          service_name?: string | null
          signed_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          agreement_url?: string | null
          amount?: number | null
          client_email?: string | null
          client_name?: string
          created_at?: string
          id?: string
          notes?: string | null
          service_name?: string | null
          signed_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      client_documents: {
        Row: {
          created_at: string
          file_url: string
          id: string
          title: string
          uploaded_by: string
          user_id: string
        }
        Insert: {
          created_at?: string
          file_url: string
          id?: string
          title: string
          uploaded_by?: string
          user_id: string
        }
        Update: {
          created_at?: string
          file_url?: string
          id?: string
          title?: string
          uploaded_by?: string
          user_id?: string
        }
        Relationships: []
      }
      client_intakes: {
        Row: {
          business_name: string | null
          created_at: string
          email: string
          full_name: string
          id: string
          linked_user_id: string | null
          notes: string | null
          phone: string | null
          responses: Json
          status: string
          updated_at: string
        }
        Insert: {
          business_name?: string | null
          created_at?: string
          email: string
          full_name: string
          id?: string
          linked_user_id?: string | null
          notes?: string | null
          phone?: string | null
          responses?: Json
          status?: string
          updated_at?: string
        }
        Update: {
          business_name?: string | null
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          linked_user_id?: string | null
          notes?: string | null
          phone?: string | null
          responses?: Json
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      client_invoices: {
        Row: {
          amount_due: number
          amount_paid: number
          client_profile_id: string | null
          created_at: string
          currency: string
          description: string | null
          due_date: string | null
          email: string | null
          hosted_invoice_url: string | null
          id: string
          invoice_number: string | null
          invoice_pdf: string | null
          paid_at: string | null
          status: string
          stripe_customer_id: string | null
          stripe_invoice_id: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          amount_due?: number
          amount_paid?: number
          client_profile_id?: string | null
          created_at?: string
          currency?: string
          description?: string | null
          due_date?: string | null
          email?: string | null
          hosted_invoice_url?: string | null
          id?: string
          invoice_number?: string | null
          invoice_pdf?: string | null
          paid_at?: string | null
          status?: string
          stripe_customer_id?: string | null
          stripe_invoice_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          amount_due?: number
          amount_paid?: number
          client_profile_id?: string | null
          created_at?: string
          currency?: string
          description?: string | null
          due_date?: string | null
          email?: string | null
          hosted_invoice_url?: string | null
          id?: string
          invoice_number?: string | null
          invoice_pdf?: string | null
          paid_at?: string | null
          status?: string
          stripe_customer_id?: string | null
          stripe_invoice_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_invoices_client_profile_id_fkey"
            columns: ["client_profile_id"]
            isOneToOne: false
            referencedRelation: "client_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      client_messages: {
        Row: {
          created_at: string
          id: string
          message: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          user_id?: string
        }
        Relationships: []
      }
      client_profiles: {
        Row: {
          billing_address: string | null
          billing_city: string | null
          billing_state: string | null
          billing_zip: string | null
          business_name: string | null
          created_at: string
          email: string | null
          first_name: string | null
          full_name: string
          id: string
          last_name: string | null
          phone: string | null
          source: string | null
          stripe_customer_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          billing_address?: string | null
          billing_city?: string | null
          billing_state?: string | null
          billing_zip?: string | null
          business_name?: string | null
          created_at?: string
          email?: string | null
          first_name?: string | null
          full_name: string
          id?: string
          last_name?: string | null
          phone?: string | null
          source?: string | null
          stripe_customer_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          billing_address?: string | null
          billing_city?: string | null
          billing_state?: string | null
          billing_zip?: string | null
          business_name?: string | null
          created_at?: string
          email?: string | null
          first_name?: string | null
          full_name?: string
          id?: string
          last_name?: string | null
          phone?: string | null
          source?: string | null
          stripe_customer_id?: string | null
          updated_at?: string
          user_id?: string
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
      financial_records: {
        Row: {
          amount: number
          client_name: string
          created_at: string
          id: string
          notes: string | null
          payment_date: string | null
          payment_status: string
          service_name: string | null
          stripe_payment_id: string | null
          stripe_session_id: string | null
          updated_at: string
        }
        Insert: {
          amount?: number
          client_name: string
          created_at?: string
          id?: string
          notes?: string | null
          payment_date?: string | null
          payment_status?: string
          service_name?: string | null
          stripe_payment_id?: string | null
          stripe_session_id?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          client_name?: string
          created_at?: string
          id?: string
          notes?: string | null
          payment_date?: string | null
          payment_status?: string
          service_name?: string | null
          stripe_payment_id?: string | null
          stripe_session_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      intake_form_fields: {
        Row: {
          active: boolean
          created_at: string
          display_order: number
          field_key: string
          field_type: string
          help_text: string | null
          id: string
          label: string
          options: Json | null
          required: boolean
          section: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          display_order?: number
          field_key: string
          field_type: string
          help_text?: string | null
          id?: string
          label: string
          options?: Json | null
          required?: boolean
          section: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          display_order?: number
          field_key?: string
          field_type?: string
          help_text?: string | null
          id?: string
          label?: string
          options?: Json | null
          required?: boolean
          section?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          email: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      review_submissions: {
        Row: {
          city: string
          created_at: string
          id: string
          name: string
          photo_url: string | null
          review_date: string
          review_text: string
          state: string
          status: string
        }
        Insert: {
          city: string
          created_at?: string
          id?: string
          name: string
          photo_url?: string | null
          review_date?: string
          review_text: string
          state: string
          status?: string
        }
        Update: {
          city?: string
          created_at?: string
          id?: string
          name?: string
          photo_url?: string | null
          review_date?: string
          review_text?: string
          state?: string
          status?: string
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
      traffic_clicks: {
        Row: {
          created_at: string
          id: string
          other_details: string | null
          source: Database["public"]["Enums"]["traffic_source"]
        }
        Insert: {
          created_at?: string
          id?: string
          other_details?: string | null
          source: Database["public"]["Enums"]["traffic_source"]
        }
        Update: {
          created_at?: string
          id?: string
          other_details?: string | null
          source?: Database["public"]["Enums"]["traffic_source"]
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      waiting_list: {
        Row: {
          created_at: string
          email: string
          id: string
          name: string
          update_frequency: string
          website_url: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          name: string
          update_frequency: string
          website_url?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          name?: string
          update_frequency?: string
          website_url?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
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
    }
    Enums: {
      app_role: "admin" | "user"
      traffic_source: "tiktok" | "instagram" | "facebook" | "other"
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
      traffic_source: ["tiktok", "instagram", "facebook", "other"],
    },
  },
} as const
