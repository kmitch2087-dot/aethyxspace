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
      add_on_catalog: {
        Row: {
          active: boolean
          category: string
          created_at: string
          description: string | null
          display_price: string | null
          id: string
          name: string
          price_max: number | null
          price_min: number | null
          sort_order: number
          type: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          category?: string
          created_at?: string
          description?: string | null
          display_price?: string | null
          id?: string
          name: string
          price_max?: number | null
          price_min?: number | null
          sort_order?: number
          type?: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          category?: string
          created_at?: string
          description?: string | null
          display_price?: string | null
          id?: string
          name?: string
          price_max?: number | null
          price_min?: number | null
          sort_order?: number
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
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
      bounty_applicants: {
        Row: {
          applied_at: string
          code: string | null
          created_at: string
          email: string
          full_name: string
          id: string
          phone: string | null
          relationship_note: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          tax_ack: boolean
          updated_at: string
          w9_file_path: string | null
          w9_uploaded_at: string | null
        }
        Insert: {
          applied_at?: string
          code?: string | null
          created_at?: string
          email: string
          full_name: string
          id?: string
          phone?: string | null
          relationship_note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          tax_ack?: boolean
          updated_at?: string
          w9_file_path?: string | null
          w9_uploaded_at?: string | null
        }
        Update: {
          applied_at?: string
          code?: string | null
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          phone?: string | null
          relationship_note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          tax_ack?: boolean
          updated_at?: string
          w9_file_path?: string | null
          w9_uploaded_at?: string | null
        }
        Relationships: []
      }
      client_add_ons: {
        Row: {
          add_on_catalog_id: string | null
          client_profile_id: string
          created_at: string
          custom_name: string | null
          end_date: string | null
          id: string
          notes: string | null
          price: number | null
          start_date: string
          status: string
          updated_at: string
        }
        Insert: {
          add_on_catalog_id?: string | null
          client_profile_id: string
          created_at?: string
          custom_name?: string | null
          end_date?: string | null
          id?: string
          notes?: string | null
          price?: number | null
          start_date?: string
          status?: string
          updated_at?: string
        }
        Update: {
          add_on_catalog_id?: string | null
          client_profile_id?: string
          created_at?: string
          custom_name?: string | null
          end_date?: string | null
          id?: string
          notes?: string | null
          price?: number | null
          start_date?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_add_ons_add_on_catalog_id_fkey"
            columns: ["add_on_catalog_id"]
            isOneToOne: false
            referencedRelation: "add_on_catalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_add_ons_client_profile_id_fkey"
            columns: ["client_profile_id"]
            isOneToOne: false
            referencedRelation: "client_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      client_agreement_records: {
        Row: {
          additional_terms: string
          client_address: string
          client_company: string
          client_legal_name: string
          client_profile_id: string
          client_signature_data: string | null
          client_signed_at: string | null
          created_at: string
          down_payment_amount: number | null
          down_payment_status: string
          hosting_notes: string
          id: string
          id_document_path: string | null
          is_locked: boolean
          paid_at: string | null
          payment_schedule: string
          project_scope: string
          revision_rounds: number
          sent_at: string | null
          services_included: string
          stripe_checkout_session_id: string | null
          submitted_at: string | null
          timeline_end: string | null
          timeline_start: string | null
          total_investment: number | null
          unlock_count: number
          updated_at: string
        }
        Insert: {
          additional_terms?: string
          client_address?: string
          client_company?: string
          client_legal_name?: string
          client_profile_id: string
          client_signature_data?: string | null
          client_signed_at?: string | null
          created_at?: string
          down_payment_amount?: number | null
          down_payment_status?: string
          hosting_notes?: string
          id?: string
          id_document_path?: string | null
          is_locked?: boolean
          paid_at?: string | null
          payment_schedule?: string
          project_scope?: string
          revision_rounds?: number
          sent_at?: string | null
          services_included?: string
          stripe_checkout_session_id?: string | null
          submitted_at?: string | null
          timeline_end?: string | null
          timeline_start?: string | null
          total_investment?: number | null
          unlock_count?: number
          updated_at?: string
        }
        Update: {
          additional_terms?: string
          client_address?: string
          client_company?: string
          client_legal_name?: string
          client_profile_id?: string
          client_signature_data?: string | null
          client_signed_at?: string | null
          created_at?: string
          down_payment_amount?: number | null
          down_payment_status?: string
          hosting_notes?: string
          id?: string
          id_document_path?: string | null
          is_locked?: boolean
          paid_at?: string | null
          payment_schedule?: string
          project_scope?: string
          revision_rounds?: number
          sent_at?: string | null
          services_included?: string
          stripe_checkout_session_id?: string | null
          submitted_at?: string | null
          timeline_end?: string | null
          timeline_start?: string | null
          total_investment?: number | null
          unlock_count?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_agreement_records_client_profile_id_fkey"
            columns: ["client_profile_id"]
            isOneToOne: true
            referencedRelation: "client_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      client_agreements: {
        Row: {
          agreement_url: string | null
          amount: number | null
          client_email: string | null
          client_name: string
          client_profile_id: string | null
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
          client_profile_id?: string | null
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
          client_profile_id?: string | null
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
      client_asset_scrape_items: {
        Row: {
          content: string | null
          created_at: string
          id: string
          kind: string
          scrape_id: string
          source_url: string | null
          status: string
          suggested_category: string
          suggested_label: string
        }
        Insert: {
          content?: string | null
          created_at?: string
          id?: string
          kind: string
          scrape_id: string
          source_url?: string | null
          status?: string
          suggested_category?: string
          suggested_label: string
        }
        Update: {
          content?: string | null
          created_at?: string
          id?: string
          kind?: string
          scrape_id?: string
          source_url?: string | null
          status?: string
          suggested_category?: string
          suggested_label?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_asset_scrape_items_scrape_id_fkey"
            columns: ["scrape_id"]
            isOneToOne: false
            referencedRelation: "client_asset_scrapes"
            referencedColumns: ["id"]
          },
        ]
      }
      client_asset_scrapes: {
        Row: {
          client_profile_id: string
          completed_at: string | null
          created_at: string
          error_message: string | null
          id: string
          source_url: string
          status: string
        }
        Insert: {
          client_profile_id: string
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          source_url: string
          status?: string
        }
        Update: {
          client_profile_id?: string
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          source_url?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_asset_scrapes_client_profile_id_fkey"
            columns: ["client_profile_id"]
            isOneToOne: false
            referencedRelation: "client_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      client_assets: {
        Row: {
          bg_color: string | null
          category: string
          client_profile_id: string
          content: string | null
          created_at: string
          file_name: string | null
          file_size: number | null
          file_url: string | null
          id: string
          label: string
          plan_id: string | null
          sort_order: number
          type: string
          updated_at: string
        }
        Insert: {
          bg_color?: string | null
          category?: string
          client_profile_id: string
          content?: string | null
          created_at?: string
          file_name?: string | null
          file_size?: number | null
          file_url?: string | null
          id?: string
          label: string
          plan_id?: string | null
          sort_order?: number
          type?: string
          updated_at?: string
        }
        Update: {
          bg_color?: string | null
          category?: string
          client_profile_id?: string
          content?: string | null
          created_at?: string
          file_name?: string | null
          file_size?: number | null
          file_url?: string | null
          id?: string
          label?: string
          plan_id?: string | null
          sort_order?: number
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_assets_client_profile_id_fkey"
            columns: ["client_profile_id"]
            isOneToOne: false
            referencedRelation: "client_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_assets_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "client_project_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      client_document_slots: {
        Row: {
          client_profile_id: string
          created_at: string
          file_name: string | null
          file_size: number | null
          id: string
          slot_type: string
          status: string
          storage_path: string | null
          updated_at: string
          uploaded_at: string | null
        }
        Insert: {
          client_profile_id: string
          created_at?: string
          file_name?: string | null
          file_size?: number | null
          id?: string
          slot_type: string
          status?: string
          storage_path?: string | null
          updated_at?: string
          uploaded_at?: string | null
        }
        Update: {
          client_profile_id?: string
          created_at?: string
          file_name?: string | null
          file_size?: number | null
          id?: string
          slot_type?: string
          status?: string
          storage_path?: string | null
          updated_at?: string
          uploaded_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_document_slots_client_profile_id_fkey"
            columns: ["client_profile_id"]
            isOneToOne: false
            referencedRelation: "client_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      client_documents: {
        Row: {
          client_profile_id: string | null
          created_at: string
          file_url: string
          id: string
          note: string | null
          parent_admin_doc_id: string | null
          title: string
          uploaded_by: string
          user_id: string
        }
        Insert: {
          client_profile_id?: string | null
          created_at?: string
          file_url: string
          id?: string
          note?: string | null
          parent_admin_doc_id?: string | null
          title: string
          uploaded_by?: string
          user_id: string
        }
        Update: {
          client_profile_id?: string | null
          created_at?: string
          file_url?: string
          id?: string
          note?: string | null
          parent_admin_doc_id?: string | null
          title?: string
          uploaded_by?: string
          user_id?: string
        }
        Relationships: []
      }
      client_intakes: {
        Row: {
          business_name: string | null
          client_profile_id: string | null
          created_at: string
          email: string
          full_name: string
          id: string
          linked_user_id: string | null
          notes: string | null
          phone: string | null
          referral_code: string | null
          responses: Json
          status: string
          updated_at: string
        }
        Insert: {
          business_name?: string | null
          client_profile_id?: string | null
          created_at?: string
          email: string
          full_name: string
          id?: string
          linked_user_id?: string | null
          notes?: string | null
          phone?: string | null
          referral_code?: string | null
          responses?: Json
          status?: string
          updated_at?: string
        }
        Update: {
          business_name?: string | null
          client_profile_id?: string | null
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          linked_user_id?: string | null
          notes?: string | null
          phone?: string | null
          referral_code?: string | null
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
          needs_review: boolean
          paid_at: string | null
          review_reason: string | null
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
          needs_review?: boolean
          paid_at?: string | null
          review_reason?: string | null
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
          needs_review?: boolean
          paid_at?: string | null
          review_reason?: string | null
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
          client_profile_id: string | null
          created_at: string
          document_id: string | null
          id: string
          message: string
          sender: string
          user_id: string
        }
        Insert: {
          client_profile_id?: string | null
          created_at?: string
          document_id?: string | null
          id?: string
          message: string
          sender?: string
          user_id: string
        }
        Update: {
          client_profile_id?: string | null
          created_at?: string
          document_id?: string | null
          id?: string
          message?: string
          sender?: string
          user_id?: string
        }
        Relationships: []
      }
      client_portal_seen_at: {
        Row: {
          client_profile_id: string
          id: string
          item_type: string
          last_seen_at: string
        }
        Insert: {
          client_profile_id: string
          id?: string
          item_type: string
          last_seen_at?: string
        }
        Update: {
          client_profile_id?: string
          id?: string
          item_type?: string
          last_seen_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_portal_seen_at_client_profile_id_fkey"
            columns: ["client_profile_id"]
            isOneToOne: false
            referencedRelation: "client_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      client_profiles: {
        Row: {
          archived_at: string | null
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
          intake_completed_at: string | null
          intake_required: boolean
          last_name: string | null
          notes: string | null
          phone: string | null
          portal_activated_at: string | null
          portal_last_login_notified_at: string | null
          referral_enabled: boolean
          source: string | null
          status: string
          stripe_customer_id: string | null
          stripe_customer_ids: string[]
          updated_at: string
          user_id: string
        }
        Insert: {
          archived_at?: string | null
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
          intake_completed_at?: string | null
          intake_required?: boolean
          last_name?: string | null
          notes?: string | null
          phone?: string | null
          portal_activated_at?: string | null
          portal_last_login_notified_at?: string | null
          referral_enabled?: boolean
          source?: string | null
          status?: string
          stripe_customer_id?: string | null
          stripe_customer_ids?: string[]
          updated_at?: string
          user_id: string
        }
        Update: {
          archived_at?: string | null
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
          intake_completed_at?: string | null
          intake_required?: boolean
          last_name?: string | null
          notes?: string | null
          phone?: string | null
          portal_activated_at?: string | null
          portal_last_login_notified_at?: string | null
          referral_enabled?: boolean
          source?: string | null
          status?: string
          stripe_customer_id?: string | null
          stripe_customer_ids?: string[]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      client_project_phases: {
        Row: {
          completion_percent: number
          created_at: string
          description: string | null
          id: string
          name: string
          plan_id: string
          sort_order: number
          status: string
          updated_at: string
        }
        Insert: {
          completion_percent?: number
          created_at?: string
          description?: string | null
          id?: string
          name: string
          plan_id: string
          sort_order?: number
          status?: string
          updated_at?: string
        }
        Update: {
          completion_percent?: number
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          plan_id?: string
          sort_order?: number
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_project_phases_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "client_project_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      client_project_plans: {
        Row: {
          client_profile_id: string
          completion_percent: number
          created_at: string
          github_url: string | null
          id: string
          overview: string | null
          project_name: string
          project_type: string
          start_date: string | null
          status: string
          target_date: string | null
          updated_at: string
        }
        Insert: {
          client_profile_id: string
          completion_percent?: number
          created_at?: string
          github_url?: string | null
          id?: string
          overview?: string | null
          project_name?: string
          project_type?: string
          start_date?: string | null
          status?: string
          target_date?: string | null
          updated_at?: string
        }
        Update: {
          client_profile_id?: string
          completion_percent?: number
          created_at?: string
          github_url?: string | null
          id?: string
          overview?: string | null
          project_name?: string
          project_type?: string
          start_date?: string | null
          status?: string
          target_date?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_project_plans_client_profile_id_fkey"
            columns: ["client_profile_id"]
            isOneToOne: false
            referencedRelation: "client_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      client_project_tasks: {
        Row: {
          assigned_to: string
          created_at: string
          description: string | null
          due_date: string | null
          id: string
          plan_id: string
          priority: string
          sort_order: number
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          plan_id: string
          priority?: string
          sort_order?: number
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          plan_id?: string
          priority?: string
          sort_order?: number
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_project_tasks_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "client_project_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      client_project_updates: {
        Row: {
          author: string
          content: string
          created_at: string
          id: string
          is_client_visible: boolean
          plan_id: string
        }
        Insert: {
          author?: string
          content: string
          created_at?: string
          id?: string
          is_client_visible?: boolean
          plan_id: string
        }
        Update: {
          author?: string
          content?: string
          created_at?: string
          id?: string
          is_client_visible?: boolean
          plan_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_project_updates_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "client_project_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      client_projects: {
        Row: {
          client_profile_id: string
          created_at: string
          current_phase: string | null
          dns_provider: string | null
          hosting_provider: string | null
          id: string
          live_url: string | null
          name: string
          notes: string | null
          progress_pct: number
          repo_url: string | null
          staging_url: string | null
          status: string
          updated_at: string
        }
        Insert: {
          client_profile_id: string
          created_at?: string
          current_phase?: string | null
          dns_provider?: string | null
          hosting_provider?: string | null
          id?: string
          live_url?: string | null
          name: string
          notes?: string | null
          progress_pct?: number
          repo_url?: string | null
          staging_url?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          client_profile_id?: string
          created_at?: string
          current_phase?: string | null
          dns_provider?: string | null
          hosting_provider?: string | null
          id?: string
          live_url?: string | null
          name?: string
          notes?: string | null
          progress_pct?: number
          repo_url?: string | null
          staging_url?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_projects_client_profile_id_fkey"
            columns: ["client_profile_id"]
            isOneToOne: false
            referencedRelation: "client_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      document_categories: {
        Row: {
          created_at: string
          display_order: number
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          display_order?: number
          id?: string
          name?: string
        }
        Relationships: []
      }
      document_schedules: {
        Row: {
          active: boolean
          admin_document_id: string
          created_at: string
          cron_expr: string | null
          delivery: string
          event_name: string | null
          id: string
          last_run_at: string | null
          message: string | null
          next_run_at: string | null
          recurrence: string | null
          run_at: string | null
          subject: string | null
          target_client_ids: string[]
          target_type: string
          trigger_type: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          admin_document_id: string
          created_at?: string
          cron_expr?: string | null
          delivery?: string
          event_name?: string | null
          id?: string
          last_run_at?: string | null
          message?: string | null
          next_run_at?: string | null
          recurrence?: string | null
          run_at?: string | null
          subject?: string | null
          target_client_ids?: string[]
          target_type?: string
          trigger_type: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          admin_document_id?: string
          created_at?: string
          cron_expr?: string | null
          delivery?: string
          event_name?: string | null
          id?: string
          last_run_at?: string | null
          message?: string | null
          next_run_at?: string | null
          recurrence?: string | null
          run_at?: string | null
          subject?: string | null
          target_client_ids?: string[]
          target_type?: string
          trigger_type?: string
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
      project_tasks: {
        Row: {
          assignee: string
          client_profile_id: string | null
          completed_at: string | null
          created_at: string
          created_by: string
          description: string | null
          due_date: string | null
          id: string
          priority: string
          project_id: string
          source: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          assignee?: string
          client_profile_id?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          due_date?: string | null
          id?: string
          priority?: string
          project_id: string
          source?: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          assignee?: string
          client_profile_id?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          due_date?: string | null
          id?: string
          priority?: string
          project_id?: string
          source?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "client_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_updates: {
        Row: {
          client_profile_id: string | null
          created_at: string
          created_by: string
          id: string
          kind: string
          payload: Json
          project_id: string
          summary: string
        }
        Insert: {
          client_profile_id?: string | null
          created_at?: string
          created_by?: string
          id?: string
          kind?: string
          payload?: Json
          project_id: string
          summary: string
        }
        Update: {
          client_profile_id?: string | null
          created_at?: string
          created_by?: string
          id?: string
          kind?: string
          payload?: Json
          project_id?: string
          summary?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_updates_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "client_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      referral_links: {
        Row: {
          client_profile_id: string
          code: string
          created_at: string
          id: string
        }
        Insert: {
          client_profile_id: string
          code: string
          created_at?: string
          id?: string
        }
        Update: {
          client_profile_id?: string
          code?: string
          created_at?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "referral_links_client_profile_id_fkey"
            columns: ["client_profile_id"]
            isOneToOne: true
            referencedRelation: "client_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      referral_program_settings: {
        Row: {
          commission_rate: number
          completion_bonus_amount: number
          eligibility_notes: string
          enabled: boolean
          first_reward_amount: number
          id: string
          new_client_discount: number
          payout_methods: string[]
          tier_threshold: number
          updated_at: string
        }
        Insert: {
          commission_rate?: number
          completion_bonus_amount?: number
          eligibility_notes?: string
          enabled?: boolean
          first_reward_amount?: number
          id?: string
          new_client_discount?: number
          payout_methods?: string[]
          tier_threshold?: number
          updated_at?: string
        }
        Update: {
          commission_rate?: number
          completion_bonus_amount?: number
          eligibility_notes?: string
          enabled?: boolean
          first_reward_amount?: number
          id?: string
          new_client_discount?: number
          payout_methods?: string[]
          tier_threshold?: number
          updated_at?: string
        }
        Relationships: []
      }
      referrals: {
        Row: {
          completion_bonus_paid_at: string | null
          created_at: string
          first_reward_paid_at: string | null
          id: string
          notes: string | null
          payout_method: string | null
          referred_email: string
          referred_name: string | null
          referred_profile_id: string | null
          referrer_bounty_applicant_id: string | null
          referrer_profile_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          completion_bonus_paid_at?: string | null
          created_at?: string
          first_reward_paid_at?: string | null
          id?: string
          notes?: string | null
          payout_method?: string | null
          referred_email: string
          referred_name?: string | null
          referred_profile_id?: string | null
          referrer_bounty_applicant_id?: string | null
          referrer_profile_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          completion_bonus_paid_at?: string | null
          created_at?: string
          first_reward_paid_at?: string | null
          id?: string
          notes?: string | null
          payout_method?: string | null
          referred_email?: string
          referred_name?: string | null
          referred_profile_id?: string | null
          referrer_bounty_applicant_id?: string | null
          referrer_profile_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "referrals_referred_profile_id_fkey"
            columns: ["referred_profile_id"]
            isOneToOne: false
            referencedRelation: "client_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referrals_referrer_bounty_applicant_id_fkey"
            columns: ["referrer_bounty_applicant_id"]
            isOneToOne: false
            referencedRelation: "bounty_applicants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referrals_referrer_profile_id_fkey"
            columns: ["referrer_profile_id"]
            isOneToOne: false
            referencedRelation: "client_profiles"
            referencedColumns: ["id"]
          },
        ]
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
      get_client_last_sign_ins: {
        Args: never
        Returns: {
          client_profile_id: string
          last_sign_in_at: string
        }[]
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
      resolve_and_record_referral: {
        Args: {
          p_code: string
          p_intake_id: string
          p_referred_email: string
          p_referred_name: string
        }
        Returns: undefined
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

