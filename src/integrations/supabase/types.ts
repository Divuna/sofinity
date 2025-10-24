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
    PostgrestVersion: "12.2.12 (cd3cf9e)"
  }
  public: {
    Tables: {
      agent_event_queue: {
        Row: {
          created_at: string | null
          event_type: string
          id: string
          payload: Json
          processed: boolean | null
          record_id: string
          source_table: string
        }
        Insert: {
          created_at?: string | null
          event_type: string
          id?: string
          payload: Json
          processed?: boolean | null
          record_id: string
          source_table: string
        }
        Update: {
          created_at?: string | null
          event_type?: string
          id?: string
          payload?: Json
          processed?: boolean | null
          record_id?: string
          source_table?: string
        }
        Relationships: []
      }
      Agents: {
        Row: {
          active: boolean | null
          created_at: string | null
          description: string | null
          gpt_id: string
          id: string
          name: string
          persona: string | null
          role: string
        }
        Insert: {
          active?: boolean | null
          created_at?: string | null
          description?: string | null
          gpt_id: string
          id?: string
          name: string
          persona?: string | null
          role: string
        }
        Update: {
          active?: boolean | null
          created_at?: string | null
          description?: string | null
          gpt_id?: string
          id?: string
          name?: string
          persona?: string | null
          role?: string
        }
        Relationships: []
      }
      AIRequests: {
        Row: {
          agent_id: string | null
          created_at: string
          event_id: string | null
          event_name: string | null
          id: string
          metadata: Json | null
          project_id: string | null
          prompt: string
          response: string | null
          status: string
          type: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          agent_id?: string | null
          created_at?: string
          event_id?: string | null
          event_name?: string | null
          id?: string
          metadata?: Json | null
          project_id?: string | null
          prompt: string
          response?: string | null
          status?: string
          type: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          agent_id?: string | null
          created_at?: string
          event_id?: string | null
          event_name?: string | null
          id?: string
          metadata?: Json | null
          project_id?: string | null
          prompt?: string
          response?: string | null
          status?: string
          type?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "AIRequests_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "Agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "AIRequests_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "Projects"
            referencedColumns: ["id"]
          },
        ]
      }
      AIRequests_AuditArchive: {
        Row: {
          airequest_id: string | null
          archived_at: string | null
          changed_at: string | null
          id: string
          new_status: string | null
          note: string | null
          old_status: string | null
          user_id: string | null
        }
        Insert: {
          airequest_id?: string | null
          archived_at?: string | null
          changed_at?: string | null
          id?: string
          new_status?: string | null
          note?: string | null
          old_status?: string | null
          user_id?: string | null
        }
        Update: {
          airequest_id?: string | null
          archived_at?: string | null
          changed_at?: string | null
          id?: string
          new_status?: string | null
          note?: string | null
          old_status?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      AIRequests_AuditLog: {
        Row: {
          airequest_id: string
          changed_at: string
          id: string
          new_status: string | null
          note: string | null
          old_status: string | null
          user_id: string | null
        }
        Insert: {
          airequest_id: string
          changed_at?: string
          id?: string
          new_status?: string | null
          note?: string | null
          old_status?: string | null
          user_id?: string | null
        }
        Update: {
          airequest_id?: string
          changed_at?: string
          id?: string
          new_status?: string | null
          note?: string | null
          old_status?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "AIRequests_AuditLog_airequest_id_fkey"
            columns: ["airequest_id"]
            isOneToOne: false
            referencedRelation: "AIRequests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "AIRequests_AuditLog_airequest_id_fkey"
            columns: ["airequest_id"]
            isOneToOne: false
            referencedRelation: "AIRequests_Campaigns_View"
            referencedColumns: ["airequest_id"]
          },
          {
            foreignKeyName: "AIRequests_AuditLog_airequest_id_fkey"
            columns: ["airequest_id"]
            isOneToOne: false
            referencedRelation: "AIRequests_DashboardView"
            referencedColumns: ["last_request_id"]
          },
          {
            foreignKeyName: "AIRequests_AuditLog_airequest_id_fkey"
            columns: ["airequest_id"]
            isOneToOne: false
            referencedRelation: "AIRequests_StatusView"
            referencedColumns: ["airequest_id"]
          },
          {
            foreignKeyName: "AIRequests_AuditLog_airequest_id_fkey"
            columns: ["airequest_id"]
            isOneToOne: false
            referencedRelation: "AIRequests_View_Recent"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "AIRequests_AuditLog_airequest_id_fkey"
            columns: ["airequest_id"]
            isOneToOne: false
            referencedRelation: "v_ai_requests_status"
            referencedColumns: ["id"]
          },
        ]
      }
      AISettings: {
        Row: {
          allow_responses: boolean | null
          auto_generate_campaigns: boolean | null
          auto_generate_emails: boolean | null
          created_at: string | null
          id: string
          language: string | null
          tone: string | null
          user_id: string | null
        }
        Insert: {
          allow_responses?: boolean | null
          auto_generate_campaigns?: boolean | null
          auto_generate_emails?: boolean | null
          created_at?: string | null
          id?: string
          language?: string | null
          tone?: string | null
          user_id?: string | null
        }
        Update: {
          allow_responses?: boolean | null
          auto_generate_campaigns?: boolean | null
          auto_generate_emails?: boolean | null
          created_at?: string | null
          id?: string
          language?: string | null
          tone?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          created_at: string
          event_data: Json | null
          event_name: string
          id: string
          ip_address: unknown
          project_id: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          event_data?: Json | null
          event_name: string
          id?: string
          ip_address?: unknown
          project_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          event_data?: Json | null
          event_name?: string
          id?: string
          ip_address?: unknown
          project_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "Projects"
            referencedColumns: ["id"]
          },
        ]
      }
      AuditHistory: {
        Row: {
          created_at: string
          created_by: string | null
          details: Json | null
          id: string
          run_at: string
          summary_text: string | null
          total_tables: number | null
          valid_ratio: number | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          details?: Json | null
          id?: string
          run_at?: string
          summary_text?: string | null
          total_tables?: number | null
          valid_ratio?: number | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          details?: Json | null
          id?: string
          run_at?: string
          summary_text?: string | null
          total_tables?: number | null
          valid_ratio?: number | null
        }
        Relationships: []
      }
      Autoresponses: {
        Row: {
          channel: string | null
          created_at: string | null
          generated_by_ai: boolean | null
          id: string
          question: string
          response: string
          user_id: string | null
        }
        Insert: {
          channel?: string | null
          created_at?: string | null
          generated_by_ai?: boolean | null
          id?: string
          question: string
          response: string
          user_id?: string | null
        }
        Update: {
          channel?: string | null
          created_at?: string | null
          generated_by_ai?: boolean | null
          id?: string
          question?: string
          response?: string
          user_id?: string | null
        }
        Relationships: []
      }
      CallToAction: {
        Row: {
          campaign_id: string | null
          created_at: string | null
          id: string
          label: string
          performance_score: number | null
          style: string | null
          type: string
          url: string | null
          user_id: string | null
        }
        Insert: {
          campaign_id?: string | null
          created_at?: string | null
          id?: string
          label: string
          performance_score?: number | null
          style?: string | null
          type: string
          url?: string | null
          user_id?: string | null
        }
        Update: {
          campaign_id?: string | null
          created_at?: string | null
          id?: string
          label?: string
          performance_score?: number | null
          style?: string | null
          type?: string
          url?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "CallToAction_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "AIRequests_Campaigns_View"
            referencedColumns: ["campaign_id"]
          },
          {
            foreignKeyName: "CallToAction_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "Campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "CallToAction_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "filtered_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_contacts: {
        Row: {
          campaign_id: string
          contact_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          campaign_id: string
          contact_id: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Update: {
          campaign_id?: string
          contact_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_campaign_contacts_campaign_id"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "AIRequests_Campaigns_View"
            referencedColumns: ["campaign_id"]
          },
          {
            foreignKeyName: "fk_campaign_contacts_campaign_id"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "Campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_campaign_contacts_campaign_id"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "filtered_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_campaign_contacts_contact_id"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "Contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      CampaignReports: {
        Row: {
          campaign_id: string | null
          click_rate: number | null
          conversions: number | null
          created_at: string | null
          export_link: string | null
          id: string
          impressions: number | null
          open_rate: number | null
          summary_text: string | null
          user_id: string | null
        }
        Insert: {
          campaign_id?: string | null
          click_rate?: number | null
          conversions?: number | null
          created_at?: string | null
          export_link?: string | null
          id?: string
          impressions?: number | null
          open_rate?: number | null
          summary_text?: string | null
          user_id?: string | null
        }
        Update: {
          campaign_id?: string | null
          click_rate?: number | null
          conversions?: number | null
          created_at?: string | null
          export_link?: string | null
          id?: string
          impressions?: number | null
          open_rate?: number | null
          summary_text?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "CampaignReports_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "AIRequests_Campaigns_View"
            referencedColumns: ["campaign_id"]
          },
          {
            foreignKeyName: "CampaignReports_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "Campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "CampaignReports_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "filtered_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      Campaigns: {
        Row: {
          ai_request_id: string | null
          created_at: string | null
          email: string | null
          email_mode: string | null
          event_id: string | null
          id: string
          name: string
          post: string | null
          project: string | null
          project_id: string | null
          status: string
          targeting: string | null
          user_id: string
          video: string | null
        }
        Insert: {
          ai_request_id?: string | null
          created_at?: string | null
          email?: string | null
          email_mode?: string | null
          event_id?: string | null
          id?: string
          name: string
          post?: string | null
          project?: string | null
          project_id?: string | null
          status?: string
          targeting?: string | null
          user_id: string
          video?: string | null
        }
        Update: {
          ai_request_id?: string | null
          created_at?: string | null
          email?: string | null
          email_mode?: string | null
          event_id?: string | null
          id?: string
          name?: string
          post?: string | null
          project?: string | null
          project_id?: string | null
          status?: string
          targeting?: string | null
          user_id?: string
          video?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "Campaigns_ai_request_id_fkey"
            columns: ["ai_request_id"]
            isOneToOne: false
            referencedRelation: "AIRequests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "Campaigns_ai_request_id_fkey"
            columns: ["ai_request_id"]
            isOneToOne: false
            referencedRelation: "AIRequests_Campaigns_View"
            referencedColumns: ["airequest_id"]
          },
          {
            foreignKeyName: "Campaigns_ai_request_id_fkey"
            columns: ["ai_request_id"]
            isOneToOne: false
            referencedRelation: "AIRequests_DashboardView"
            referencedColumns: ["last_request_id"]
          },
          {
            foreignKeyName: "Campaigns_ai_request_id_fkey"
            columns: ["ai_request_id"]
            isOneToOne: false
            referencedRelation: "AIRequests_StatusView"
            referencedColumns: ["airequest_id"]
          },
          {
            foreignKeyName: "Campaigns_ai_request_id_fkey"
            columns: ["ai_request_id"]
            isOneToOne: false
            referencedRelation: "AIRequests_View_Recent"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "Campaigns_ai_request_id_fkey"
            columns: ["ai_request_id"]
            isOneToOne: false
            referencedRelation: "v_ai_requests_status"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "Campaigns_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "Projects"
            referencedColumns: ["id"]
          },
        ]
      }
      CampaignSchedule: {
        Row: {
          campaign_id: string | null
          channel: string
          content: string
          created_at: string | null
          id: string
          project_id: string | null
          publish_at: string
          published: boolean | null
          user_id: string | null
        }
        Insert: {
          campaign_id?: string | null
          channel: string
          content: string
          created_at?: string | null
          id?: string
          project_id?: string | null
          publish_at: string
          published?: boolean | null
          user_id?: string | null
        }
        Update: {
          campaign_id?: string | null
          channel?: string
          content?: string
          created_at?: string | null
          id?: string
          project_id?: string | null
          publish_at?: string
          published?: boolean | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "CampaignSchedule_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "AIRequests_Campaigns_View"
            referencedColumns: ["campaign_id"]
          },
          {
            foreignKeyName: "CampaignSchedule_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "Campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "CampaignSchedule_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "filtered_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "CampaignSchedule_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "Projects"
            referencedColumns: ["id"]
          },
        ]
      }
      CampaignStats: {
        Row: {
          campaign_id: string | null
          clicks: number | null
          conversions: number | null
          created_at: string | null
          id: string
          impressions: number | null
          revenue: number | null
        }
        Insert: {
          campaign_id?: string | null
          clicks?: number | null
          conversions?: number | null
          created_at?: string | null
          id?: string
          impressions?: number | null
          revenue?: number | null
        }
        Update: {
          campaign_id?: string | null
          clicks?: number | null
          conversions?: number | null
          created_at?: string | null
          id?: string
          impressions?: number | null
          revenue?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "CampaignStats_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "AIRequests_Campaigns_View"
            referencedColumns: ["campaign_id"]
          },
          {
            foreignKeyName: "CampaignStats_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "Campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "CampaignStats_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "filtered_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      CampaignTags: {
        Row: {
          campaign_id: string | null
          created_at: string | null
          id: string
          tag: string
          user_id: string | null
        }
        Insert: {
          campaign_id?: string | null
          created_at?: string | null
          id?: string
          tag: string
          user_id?: string | null
        }
        Update: {
          campaign_id?: string | null
          created_at?: string | null
          id?: string
          tag?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "CampaignTags_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "AIRequests_Campaigns_View"
            referencedColumns: ["campaign_id"]
          },
          {
            foreignKeyName: "CampaignTags_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "Campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "CampaignTags_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "filtered_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      Contacts: {
        Row: {
          city: string | null
          created_at: string | null
          email: string
          full_name: string | null
          id: string
          name: string | null
          phone: string | null
          project_id: string | null
          role: string | null
          source: string | null
          subscribed: boolean | null
          tags: string[] | null
          unsubscribed_at: string | null
          user_id: string
        }
        Insert: {
          city?: string | null
          created_at?: string | null
          email: string
          full_name?: string | null
          id?: string
          name?: string | null
          phone?: string | null
          project_id?: string | null
          role?: string | null
          source?: string | null
          subscribed?: boolean | null
          tags?: string[] | null
          unsubscribed_at?: string | null
          user_id?: string
        }
        Update: {
          city?: string | null
          created_at?: string | null
          email?: string
          full_name?: string | null
          id?: string
          name?: string | null
          phone?: string | null
          project_id?: string | null
          role?: string | null
          source?: string | null
          subscribed?: boolean | null
          tags?: string[] | null
          unsubscribed_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "Contacts_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "Projects"
            referencedColumns: ["id"]
          },
        ]
      }
      contests: {
        Row: {
          description: string | null
          id: string
          status: string | null
          title: string
        }
        Insert: {
          description?: string | null
          id?: string
          status?: string | null
          title: string
        }
        Update: {
          description?: string | null
          id?: string
          status?: string | null
          title?: string
        }
        Relationships: []
      }
      cron_request_nonces: {
        Row: {
          created_at: string
          function_name: string
          id: string
          nonce: string
          timestamp: string
        }
        Insert: {
          created_at?: string
          function_name: string
          id?: string
          nonce: string
          timestamp: string
        }
        Update: {
          created_at?: string
          function_name?: string
          id?: string
          nonce?: string
          timestamp?: string
        }
        Relationships: []
      }
      EmailEvents: {
        Row: {
          campaign_id: string | null
          email_id: string | null
          event_timestamp: string | null
          event_type: string
          id: string
          raw_data: Json | null
          recipient_email: string
        }
        Insert: {
          campaign_id?: string | null
          email_id?: string | null
          event_timestamp?: string | null
          event_type: string
          id?: string
          raw_data?: Json | null
          recipient_email: string
        }
        Update: {
          campaign_id?: string | null
          email_id?: string | null
          event_timestamp?: string | null
          event_type?: string
          id?: string
          raw_data?: Json | null
          recipient_email?: string
        }
        Relationships: [
          {
            foreignKeyName: "EmailEvents_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "AIRequests_Campaigns_View"
            referencedColumns: ["campaign_id"]
          },
          {
            foreignKeyName: "EmailEvents_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "Campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "EmailEvents_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "filtered_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "EmailEvents_email_id_fkey"
            columns: ["email_id"]
            isOneToOne: false
            referencedRelation: "Emails"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "EmailEvents_email_id_fkey"
            columns: ["email_id"]
            isOneToOne: false
            referencedRelation: "filtered_emails"
            referencedColumns: ["id"]
          },
        ]
      }
      EmailLogs: {
        Row: {
          campaign_id: string | null
          clicked_at: string | null
          created_at: string
          id: string
          message_id: string | null
          opened_at: string | null
          payload: Json | null
          project: string | null
          recipient: string | null
          recipient_email: string
          sent_at: string | null
          status: string | null
          subject: string | null
          type: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          campaign_id?: string | null
          clicked_at?: string | null
          created_at?: string
          id?: string
          message_id?: string | null
          opened_at?: string | null
          payload?: Json | null
          project?: string | null
          recipient?: string | null
          recipient_email: string
          sent_at?: string | null
          status?: string | null
          subject?: string | null
          type?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          campaign_id?: string | null
          clicked_at?: string | null
          created_at?: string
          id?: string
          message_id?: string | null
          opened_at?: string | null
          payload?: Json | null
          project?: string | null
          recipient?: string | null
          recipient_email?: string
          sent_at?: string | null
          status?: string | null
          subject?: string | null
          type?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "EmailLogs_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "AIRequests_Campaigns_View"
            referencedColumns: ["campaign_id"]
          },
          {
            foreignKeyName: "EmailLogs_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "Campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "EmailLogs_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "filtered_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      EmailMedia: {
        Row: {
          created_at: string
          email_id: string
          file_name: string
          file_size: number | null
          generated_by_ai: boolean
          generation_prompt: string | null
          id: string
          media_type: string
          media_url: string
          status: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email_id: string
          file_name: string
          file_size?: number | null
          generated_by_ai?: boolean
          generation_prompt?: string | null
          id?: string
          media_type: string
          media_url: string
          status?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email_id?: string
          file_name?: string
          file_size?: number | null
          generated_by_ai?: boolean
          generation_prompt?: string | null
          id?: string
          media_type?: string
          media_url?: string
          status?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      EmailOutbox: {
        Row: {
          body: string
          created_at: string
          id: string
          project_id: string | null
          sent_at: string | null
          status: string
          subject: string
          to_email: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          project_id?: string | null
          sent_at?: string | null
          status?: string
          subject: string
          to_email: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          project_id?: string | null
          sent_at?: string | null
          status?: string
          subject?: string
          to_email?: string
        }
        Relationships: []
      }
      Emails: {
        Row: {
          content: string
          created_at: string
          email_mode: string
          id: string
          project: string | null
          project_id: string | null
          recipient: string | null
          scheduled_at: string | null
          status: string | null
          subject: string | null
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          email_mode?: string
          id?: string
          project?: string | null
          project_id?: string | null
          recipient?: string | null
          scheduled_at?: string | null
          status?: string | null
          subject?: string | null
          type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          email_mode?: string
          id?: string
          project?: string | null
          project_id?: string | null
          recipient?: string | null
          scheduled_at?: string | null
          status?: string | null
          subject?: string | null
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "Emails_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "Projects"
            referencedColumns: ["id"]
          },
        ]
      }
      event_forward_log: {
        Row: {
          created_at: string | null
          error_message: string | null
          event_name: string
          id: string
          payload: Json
          record_id: string
          response_data: Json | null
          retry_count: number | null
          status: string
          table_name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          error_message?: string | null
          event_name: string
          id?: string
          payload: Json
          record_id: string
          response_data?: Json | null
          retry_count?: number | null
          status?: string
          table_name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          error_message?: string | null
          event_name?: string
          id?: string
          payload?: Json
          record_id?: string
          response_data?: Json | null
          retry_count?: number | null
          status?: string
          table_name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      eventlogs: {
        Row: {
          contest_id: string | null
          created_at: string | null
          event_name: string
          id: string
          metadata: Json | null
          project_id: string | null
          user_id: string | null
        }
        Insert: {
          contest_id?: string | null
          created_at?: string | null
          event_name: string
          id?: string
          metadata?: Json | null
          project_id?: string | null
          user_id?: string | null
        }
        Update: {
          contest_id?: string | null
          created_at?: string | null
          event_name?: string
          id?: string
          metadata?: Json | null
          project_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "eventlogs_contest_id_fkey"
            columns: ["contest_id"]
            isOneToOne: false
            referencedRelation: "contests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "eventlogs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      EventLogs: {
        Row: {
          contest_id: string | null
          event_name: string
          id: string
          metadata: Json | null
          project_id: string
          source_system: string | null
          timestamp: string | null
          user_id: string
        }
        Insert: {
          contest_id?: string | null
          event_name: string
          id?: string
          metadata?: Json | null
          project_id: string
          source_system?: string | null
          timestamp?: string | null
          user_id: string
        }
        Update: {
          contest_id?: string | null
          event_name?: string
          id?: string
          metadata?: Json | null
          project_id?: string
          source_system?: string | null
          timestamp?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "eventlogs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      EventTypes: {
        Row: {
          created_at: string
          description: string | null
          id: string
          original_event: string
          source_system: string
          standardized_event: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          original_event: string
          source_system: string
          standardized_event: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          original_event?: string
          source_system?: string
          standardized_event?: string
        }
        Relationships: []
      }
      external_integrations: {
        Row: {
          contains_credentials: boolean | null
          created_at: string
          external_email: string | null
          external_system: string
          external_user_id: string | null
          id: string
          mapping_data: Json | null
          updated_at: string
          user_id: string
        }
        Insert: {
          contains_credentials?: boolean | null
          created_at?: string
          external_email?: string | null
          external_system: string
          external_user_id?: string | null
          id?: string
          mapping_data?: Json | null
          updated_at?: string
          user_id: string
        }
        Update: {
          contains_credentials?: boolean | null
          created_at?: string
          external_email?: string | null
          external_system?: string
          external_user_id?: string | null
          id?: string
          mapping_data?: Json | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      Feedback: {
        Row: {
          campaign_id: string | null
          comment: string | null
          created_at: string | null
          email_id: string | null
          feedback_type: string | null
          id: string
          ip_address: string | null
          rating: number | null
          sentiment: string | null
          source: string | null
          submitted_at: string | null
          user_id: string | null
        }
        Insert: {
          campaign_id?: string | null
          comment?: string | null
          created_at?: string | null
          email_id?: string | null
          feedback_type?: string | null
          id?: string
          ip_address?: string | null
          rating?: number | null
          sentiment?: string | null
          source?: string | null
          submitted_at?: string | null
          user_id?: string | null
        }
        Update: {
          campaign_id?: string | null
          comment?: string | null
          created_at?: string | null
          email_id?: string | null
          feedback_type?: string | null
          id?: string
          ip_address?: string | null
          rating?: number | null
          sentiment?: string | null
          source?: string | null
          submitted_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "Feedback_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "AIRequests_Campaigns_View"
            referencedColumns: ["campaign_id"]
          },
          {
            foreignKeyName: "Feedback_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "Campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "Feedback_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "filtered_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      MarketingCampaigns: {
        Row: {
          campaign_name: string
          created_at: string | null
          id: string
          project_id: string | null
          status: string | null
        }
        Insert: {
          campaign_name: string
          created_at?: string | null
          id?: string
          project_id?: string | null
          status?: string | null
        }
        Update: {
          campaign_name?: string
          created_at?: string | null
          id?: string
          project_id?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "MarketingCampaigns_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "Projects"
            referencedColumns: ["id"]
          },
        ]
      }
      NotificationQueue: {
        Row: {
          created_at: string | null
          event_id: string | null
          event_name: string
          id: string
          payload: Json | null
          status: string | null
          target_email: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          event_id?: string | null
          event_name: string
          id?: string
          payload?: Json | null
          status?: string | null
          target_email?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          event_id?: string | null
          event_name?: string
          id?: string
          payload?: Json | null
          status?: string | null
          target_email?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "NotificationQueue_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "EventLogs"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          id: string
          message: string | null
          sent_at: string | null
          status: string | null
          title: string | null
          type: string
          user_id: string | null
        }
        Insert: {
          id?: string
          message?: string | null
          sent_at?: string | null
          status?: string | null
          title?: string | null
          type: string
          user_id?: string | null
        }
        Update: {
          id?: string
          message?: string | null
          sent_at?: string | null
          status?: string | null
          title?: string | null
          type?: string
          user_id?: string | null
        }
        Relationships: []
      }
      Notifications: {
        Row: {
          id: string
          message: string
          project_id: string | null
          read: boolean | null
          sent_at: string | null
          title: string
          type: string
          user_id: string | null
        }
        Insert: {
          id?: string
          message: string
          project_id?: string | null
          read?: boolean | null
          sent_at?: string | null
          title: string
          type: string
          user_id?: string | null
        }
        Update: {
          id?: string
          message?: string
          project_id?: string | null
          read?: boolean | null
          sent_at?: string | null
          title?: string
          type?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "Notifications_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "Projects"
            referencedColumns: ["id"]
          },
        ]
      }
      offers: {
        Row: {
          created_at: string
          external_request_id: string | null
          id: string
          price: number | null
          project_id: string | null
          repairer_id: string | null
          request_id: string | null
          status: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          external_request_id?: string | null
          id?: string
          price?: number | null
          project_id?: string | null
          repairer_id?: string | null
          request_id?: string | null
          status?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          external_request_id?: string | null
          id?: string
          price?: number | null
          project_id?: string | null
          repairer_id?: string | null
          request_id?: string | null
          status?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      opravo_jobs: {
        Row: {
          created_at: string | null
          fotky: string[] | null
          id: string
          kategorie: string | null
          latitude: number | null
          lokalita: string | null
          longitude: number | null
          popis: string | null
          urgentni: boolean | null
        }
        Insert: {
          created_at?: string | null
          fotky?: string[] | null
          id: string
          kategorie?: string | null
          latitude?: number | null
          lokalita?: string | null
          longitude?: number | null
          popis?: string | null
          urgentni?: boolean | null
        }
        Update: {
          created_at?: string | null
          fotky?: string[] | null
          id?: string
          kategorie?: string | null
          latitude?: number | null
          lokalita?: string | null
          longitude?: number | null
          popis?: string | null
          urgentni?: boolean | null
        }
        Relationships: []
      }
      opravojobs: {
        Row: {
          created_at: string
          external_request_id: string | null
          id: string
          lokalita: string | null
          popis: string | null
          project_id: string | null
          request_id: string | null
          status: string | null
          urgentni: boolean | null
          user_id: string
          vybrany_opravar: string | null
          vytvoreno: string | null
          zadavatel_id: string | null
        }
        Insert: {
          created_at?: string
          external_request_id?: string | null
          id?: string
          lokalita?: string | null
          popis?: string | null
          project_id?: string | null
          request_id?: string | null
          status?: string | null
          urgentni?: boolean | null
          user_id?: string
          vybrany_opravar?: string | null
          vytvoreno?: string | null
          zadavatel_id?: string | null
        }
        Update: {
          created_at?: string
          external_request_id?: string | null
          id?: string
          lokalita?: string | null
          popis?: string | null
          project_id?: string | null
          request_id?: string | null
          status?: string | null
          urgentni?: boolean | null
          user_id?: string
          vybrany_opravar?: string | null
          vytvoreno?: string | null
          zadavatel_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "opravojobs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "Projects"
            referencedColumns: ["id"]
          },
        ]
      }
      opravooffers: {
        Row: {
          cena: number | null
          created_at: string
          finalizovana: boolean | null
          id: string
          offer_id: string | null
          opravar_id: string | null
          popis: string | null
          user_id: string
          vybrana: boolean | null
          zakazka_id: string | null
        }
        Insert: {
          cena?: number | null
          created_at?: string
          finalizovana?: boolean | null
          id?: string
          offer_id?: string | null
          opravar_id?: string | null
          popis?: string | null
          user_id?: string
          vybrana?: boolean | null
          zakazka_id?: string | null
        }
        Update: {
          cena?: number | null
          created_at?: string
          finalizovana?: boolean | null
          id?: string
          offer_id?: string | null
          opravar_id?: string | null
          popis?: string | null
          user_id?: string
          vybrana?: boolean | null
          zakazka_id?: string | null
        }
        Relationships: []
      }
      Phase4_MigrationLog: {
        Row: {
          id: string
          migrated_at: string | null
          new_project_id: string | null
          old_project_id: string | null
          record_id: string
          source_system: string | null
          status: string | null
          table_name: string
        }
        Insert: {
          id?: string
          migrated_at?: string | null
          new_project_id?: string | null
          old_project_id?: string | null
          record_id: string
          source_system?: string | null
          status?: string | null
          table_name: string
        }
        Update: {
          id?: string
          migrated_at?: string | null
          new_project_id?: string | null
          old_project_id?: string | null
          record_id?: string
          source_system?: string | null
          status?: string | null
          table_name?: string
        }
        Relationships: []
      }
      posts: {
        Row: {
          channel: string
          created_at: string
          format: string
          id: string
          project_id: string | null
          publish_date: string
          status: string
          text: string
          updated_at: string
          user_id: string
        }
        Insert: {
          channel: string
          created_at?: string
          format?: string
          id?: string
          project_id?: string | null
          publish_date: string
          status?: string
          text: string
          updated_at?: string
          user_id: string
        }
        Update: {
          channel?: string
          created_at?: string
          format?: string
          id?: string
          project_id?: string | null
          publish_date?: string
          status?: string
          text?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          favorite_project: string | null
          id: string
          name: string
          onboarding_complete: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email: string
          favorite_project?: string | null
          id?: string
          name: string
          onboarding_complete?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string
          favorite_project?: string | null
          id?: string
          name?: string
          onboarding_complete?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      Projects: {
        Row: {
          created_at: string | null
          description: string | null
          external_connection: string | null
          id: string
          is_active: boolean | null
          name: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          external_connection?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          external_connection?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          user_id?: string | null
        }
        Relationships: []
      }
      Reactions: {
        Row: {
          ai_confidence: number | null
          created_at: string
          event_id: string
          id: string
          recommendation: string
          summary: string
          user_id: string
        }
        Insert: {
          ai_confidence?: number | null
          created_at?: string
          event_id: string
          id?: string
          recommendation: string
          summary: string
          user_id: string
        }
        Update: {
          ai_confidence?: number | null
          created_at?: string
          event_id?: string
          id?: string
          recommendation?: string
          summary?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "Reactions_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "EventLogs"
            referencedColumns: ["id"]
          },
        ]
      }
      Stats: {
        Row: {
          id: string
          metric: string
          recorded_at: string | null
          source: string
          unit: string | null
          user_id: string | null
          value: number
        }
        Insert: {
          id?: string
          metric: string
          recorded_at?: string | null
          source: string
          unit?: string | null
          user_id?: string | null
          value: number
        }
        Update: {
          id?: string
          metric?: string
          recorded_at?: string | null
          source?: string
          unit?: string | null
          user_id?: string | null
          value?: number
        }
        Relationships: []
      }
      system_snapshots: {
        Row: {
          created_at: string | null
          functions_sql: string | null
          id: string
          policies_sql: string | null
          schema_sql: string | null
          snapshot_name: string
          views_sql: string | null
        }
        Insert: {
          created_at?: string | null
          functions_sql?: string | null
          id?: string
          policies_sql?: string | null
          schema_sql?: string | null
          snapshot_name: string
          views_sql?: string | null
        }
        Update: {
          created_at?: string | null
          functions_sql?: string | null
          id?: string
          policies_sql?: string | null
          schema_sql?: string | null
          snapshot_name?: string
          views_sql?: string | null
        }
        Relationships: []
      }
      Templates: {
        Row: {
          content: string
          created_at: string | null
          id: string
          name: string
          type: string | null
          user_id: string | null
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          name: string
          type?: string | null
          user_id?: string | null
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          name?: string
          type?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      tickets: {
        Row: {
          contest_id: string
          created_at: string | null
          id: string
          user_id: string
        }
        Insert: {
          contest_id: string
          created_at?: string | null
          id?: string
          user_id: string
        }
        Update: {
          contest_id?: string
          created_at?: string | null
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tickets_contest_id_fkey"
            columns: ["contest_id"]
            isOneToOne: false
            referencedRelation: "contests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_preferences: {
        Row: {
          created_at: string | null
          dark_mode: boolean | null
          email_mode: string | null
          favorite_project: string | null
          id: string
          onboarding_complete: boolean | null
          role: string | null
          selected_project_id: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          dark_mode?: boolean | null
          email_mode?: string | null
          favorite_project?: string | null
          id?: string
          onboarding_complete?: boolean | null
          role?: string | null
          selected_project_id?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          dark_mode?: boolean | null
          email_mode?: string | null
          favorite_project?: string | null
          id?: string
          onboarding_complete?: boolean | null
          role?: string | null
          selected_project_id?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "UserPreferences_selected_project_id_fkey"
            columns: ["selected_project_id"]
            isOneToOne: false
            referencedRelation: "Projects"
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
      users: {
        Row: {
          created_at: string | null
          email: string
          full_name: string | null
          id: string
          role: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          full_name?: string | null
          id?: string
          role?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          full_name?: string | null
          id?: string
          role?: string | null
        }
        Relationships: []
      }
      videos: {
        Row: {
          campaign_id: string | null
          created_at: string
          description: string | null
          duration: number | null
          id: string
          metadata: Json | null
          status: string
          thumbnail_url: string | null
          title: string
          updated_at: string
          user_id: string
          video_url: string | null
        }
        Insert: {
          campaign_id?: string | null
          created_at?: string
          description?: string | null
          duration?: number | null
          id?: string
          metadata?: Json | null
          status?: string
          thumbnail_url?: string | null
          title: string
          updated_at?: string
          user_id: string
          video_url?: string | null
        }
        Update: {
          campaign_id?: string | null
          created_at?: string
          description?: string | null
          duration?: number | null
          id?: string
          metadata?: Json | null
          status?: string
          thumbnail_url?: string | null
          title?: string
          updated_at?: string
          user_id?: string
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "videos_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "AIRequests_Campaigns_View"
            referencedColumns: ["campaign_id"]
          },
          {
            foreignKeyName: "videos_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "Campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "videos_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "filtered_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      vouchers: {
        Row: {
          id: string
          status: string | null
          user_id: string
          value: number
        }
        Insert: {
          id?: string
          status?: string | null
          user_id: string
          value: number
        }
        Update: {
          id?: string
          status?: string | null
          user_id?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "vouchers_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      webhook_requests: {
        Row: {
          created_at: string
          endpoint: string
          id: string
          idempotency_key: string
          source_ip: string | null
          timestamp: string
        }
        Insert: {
          created_at?: string
          endpoint: string
          id?: string
          idempotency_key: string
          source_ip?: string | null
          timestamp: string
        }
        Update: {
          created_at?: string
          endpoint?: string
          id?: string
          idempotency_key?: string
          source_ip?: string | null
          timestamp?: string
        }
        Relationships: []
      }
    }
    Views: {
      AIRequests_Campaigns_View: {
        Row: {
          ai_prompt: string | null
          ai_response: string | null
          ai_status: string | null
          ai_type: string | null
          airequest_id: string | null
          campaign_id: string | null
          campaign_name: string | null
          campaign_status: string | null
          event_name: string | null
          event_timestamp: string | null
          logged_campaign_name: string | null
          project_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "AIRequests_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "Projects"
            referencedColumns: ["id"]
          },
        ]
      }
      AIRequests_DashboardView: {
        Row: {
          avg_completion_time_s: number | null
          completed_count: number | null
          error_count: number | null
          last_change_at: string | null
          last_request_id: string | null
          last_status: string | null
          project_id: string | null
          success_rate_pct: number | null
          total_requests: number | null
          type: string | null
        }
        Relationships: [
          {
            foreignKeyName: "AIRequests_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "Projects"
            referencedColumns: ["id"]
          },
        ]
      }
      AIRequests_PerformanceView: {
        Row: {
          avg_completion_time_s: number | null
          completed_count: number | null
          day: string | null
          error_count: number | null
          first_request_at: string | null
          last_request_at: string | null
          project_id: string | null
          request_ids_desc: string | null
          success_rate_pct: number | null
          total_requests: number | null
          type: string | null
        }
        Relationships: [
          {
            foreignKeyName: "AIRequests_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "Projects"
            referencedColumns: ["id"]
          },
        ]
      }
      AIRequests_StatsView: {
        Row: {
          avg_completion_time_s: number | null
          completed_count: number | null
          error_count: number | null
          first_request_at: string | null
          last_request_at: string | null
          project_id: string | null
          request_ids_desc: string | null
          success_rate_pct: number | null
          total_requests: number | null
          type: string | null
        }
        Relationships: [
          {
            foreignKeyName: "AIRequests_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "Projects"
            referencedColumns: ["id"]
          },
        ]
      }
      AIRequests_StatusView: {
        Row: {
          airequest_id: string | null
          changed_at: string | null
          created_at: string | null
          current_status: string | null
          new_status: string | null
          type: string | null
          user_id: string | null
          viewer_email: string | null
        }
        Relationships: []
      }
      AIRequests_TimelineView: {
        Row: {
          completed_count: number | null
          day: string | null
          error_count: number | null
          request_ids_desc: string | null
          success_rate_pct: number | null
          total_requests: number | null
          type: string | null
        }
        Relationships: []
      }
      AIRequests_Trend7dView: {
        Row: {
          avg_success_7d_pct: number | null
          avg_time_7d_s: number | null
          day: string | null
          project_id: string | null
          total_requests_7d: number | null
          type: string | null
        }
        Relationships: [
          {
            foreignKeyName: "AIRequests_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "Projects"
            referencedColumns: ["id"]
          },
        ]
      }
      AIRequests_View_Recent: {
        Row: {
          created_at: string | null
          id: string | null
          project_id: string | null
          project_name: string | null
          prompt: string | null
          response: string | null
          status: string | null
          type: string | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "AIRequests_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "Projects"
            referencedColumns: ["id"]
          },
        ]
      }
      filtered_campaigns: {
        Row: {
          created_at: string | null
          email: string | null
          email_mode: string | null
          event_id: string | null
          id: string | null
          name: string | null
          post: string | null
          project: string | null
          project_id: string | null
          status: string | null
          targeting: string | null
          user_id: string | null
          video: string | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          email_mode?: string | null
          event_id?: string | null
          id?: string | null
          name?: string | null
          post?: string | null
          project?: string | null
          project_id?: string | null
          status?: string | null
          targeting?: string | null
          user_id?: string | null
          video?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          email_mode?: string | null
          event_id?: string | null
          id?: string | null
          name?: string | null
          post?: string | null
          project?: string | null
          project_id?: string | null
          status?: string | null
          targeting?: string | null
          user_id?: string | null
          video?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "Campaigns_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "Projects"
            referencedColumns: ["id"]
          },
        ]
      }
      filtered_emails: {
        Row: {
          content: string | null
          created_at: string | null
          email_mode: string | null
          id: string | null
          project: string | null
          project_id: string | null
          recipient: string | null
          scheduled_at: string | null
          status: string | null
          subject: string | null
          type: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          content?: string | null
          created_at?: string | null
          email_mode?: string | null
          id?: string | null
          project?: string | null
          project_id?: string | null
          recipient?: string | null
          scheduled_at?: string | null
          status?: string | null
          subject?: string | null
          type?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          content?: string | null
          created_at?: string | null
          email_mode?: string | null
          id?: string | null
          project?: string | null
          project_id?: string | null
          recipient?: string | null
          scheduled_at?: string | null
          status?: string | null
          subject?: string | null
          type?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "Emails_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "Projects"
            referencedColumns: ["id"]
          },
        ]
      }
      filtered_posts: {
        Row: {
          channel: string | null
          created_at: string | null
          format: string | null
          id: string | null
          project_id: string | null
          publish_date: string | null
          status: string | null
          text: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          channel?: string | null
          created_at?: string | null
          format?: string | null
          id?: string | null
          project_id?: string | null
          publish_date?: string | null
          status?: string | null
          text?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          channel?: string | null
          created_at?: string | null
          format?: string | null
          id?: string | null
          project_id?: string | null
          publish_date?: string | null
          status?: string | null
          text?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      onemill_reporting: {
        Row: {
          campaign_id: string | null
          click_rate: number | null
          conversions: number | null
          created_at: string | null
          export_link: string | null
          id: string | null
          impressions: number | null
          open_rate: number | null
          summary_text: string | null
          user_id: string | null
        }
        Insert: {
          campaign_id?: string | null
          click_rate?: number | null
          conversions?: number | null
          created_at?: string | null
          export_link?: string | null
          id?: string | null
          impressions?: number | null
          open_rate?: number | null
          summary_text?: string | null
          user_id?: string | null
        }
        Update: {
          campaign_id?: string | null
          click_rate?: number | null
          conversions?: number | null
          created_at?: string | null
          export_link?: string | null
          id?: string | null
          impressions?: number | null
          open_rate?: number | null
          summary_text?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "CampaignReports_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "AIRequests_Campaigns_View"
            referencedColumns: ["campaign_id"]
          },
          {
            foreignKeyName: "CampaignReports_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "Campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "CampaignReports_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "filtered_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      Phase4_MigrationSummary: {
        Row: {
          distinct_projects: number | null
          first_migration: string | null
          last_migration: string | null
          records_migrated: number | null
          table_name: string | null
        }
        Relationships: []
      }
      v_ai_requests_status: {
        Row: {
          agent_id: string | null
          created_at: string | null
          event_id: string | null
          event_name: string | null
          id: string | null
          metadata: Json | null
          project_id: string | null
          prompt: string | null
          response: string | null
          status: string | null
          status_label: string | null
          type: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          agent_id?: string | null
          created_at?: string | null
          event_id?: string | null
          event_name?: string | null
          id?: string | null
          metadata?: Json | null
          project_id?: string | null
          prompt?: string | null
          response?: string | null
          status?: string | null
          status_label?: never
          type?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          agent_id?: string | null
          created_at?: string | null
          event_id?: string | null
          event_name?: string | null
          id?: string | null
          metadata?: Json | null
          project_id?: string | null
          prompt?: string | null
          response?: string | null
          status?: string | null
          status_label?: never
          type?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "AIRequests_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "Agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "AIRequests_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "Projects"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      bytea_to_text: { Args: { data: string }; Returns: string }
      call_insert_opravo_job: {
        Args: { _request_id: string; _user_id: string }
        Returns: undefined
      }
      check_fk_integrity_admin: {
        Args: never
        Returns: {
          invalid_count: number
          status: boolean
          table_name: string
          valid_count: number
        }[]
      }
      cleanup_old_nonces: { Args: never; Returns: undefined }
      cleanup_old_webhook_requests: { Args: never; Returns: undefined }
      find_or_create_user_project:
        | {
            Args: { p_source_system?: string; p_user_id: string }
            Returns: string
          }
        | {
            Args: { fallback_project_id: string; target_user_id: string }
            Returns: string
          }
      fn_archive_old_audit_logs: { Args: never; Returns: undefined }
      get_safe_integration_data: {
        Args: { integration_id: string }
        Returns: Json
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      http: {
        Args: { request: Database["public"]["CompositeTypes"]["http_request"] }
        Returns: Database["public"]["CompositeTypes"]["http_response"]
        SetofOptions: {
          from: "http_request"
          to: "http_response"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      http_delete:
        | {
            Args: { uri: string }
            Returns: Database["public"]["CompositeTypes"]["http_response"]
            SetofOptions: {
              from: "*"
              to: "http_response"
              isOneToOne: true
              isSetofReturn: false
            }
          }
        | {
            Args: { content: string; content_type: string; uri: string }
            Returns: Database["public"]["CompositeTypes"]["http_response"]
            SetofOptions: {
              from: "*"
              to: "http_response"
              isOneToOne: true
              isSetofReturn: false
            }
          }
      http_get:
        | {
            Args: { uri: string }
            Returns: Database["public"]["CompositeTypes"]["http_response"]
            SetofOptions: {
              from: "*"
              to: "http_response"
              isOneToOne: true
              isSetofReturn: false
            }
          }
        | {
            Args: { data: Json; uri: string }
            Returns: Database["public"]["CompositeTypes"]["http_response"]
            SetofOptions: {
              from: "*"
              to: "http_response"
              isOneToOne: true
              isSetofReturn: false
            }
          }
      http_head: {
        Args: { uri: string }
        Returns: Database["public"]["CompositeTypes"]["http_response"]
        SetofOptions: {
          from: "*"
          to: "http_response"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      http_header: {
        Args: { field: string; value: string }
        Returns: Database["public"]["CompositeTypes"]["http_header"]
        SetofOptions: {
          from: "*"
          to: "http_header"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      http_list_curlopt: {
        Args: never
        Returns: {
          curlopt: string
          value: string
        }[]
      }
      http_patch: {
        Args: { content: string; content_type: string; uri: string }
        Returns: Database["public"]["CompositeTypes"]["http_response"]
        SetofOptions: {
          from: "*"
          to: "http_response"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      http_post:
        | {
            Args: { content: string; content_type: string; uri: string }
            Returns: Database["public"]["CompositeTypes"]["http_response"]
            SetofOptions: {
              from: "*"
              to: "http_response"
              isOneToOne: true
              isSetofReturn: false
            }
          }
        | {
            Args: { data: Json; uri: string }
            Returns: Database["public"]["CompositeTypes"]["http_response"]
            SetofOptions: {
              from: "*"
              to: "http_response"
              isOneToOne: true
              isSetofReturn: false
            }
          }
      http_put: {
        Args: { content: string; content_type: string; uri: string }
        Returns: Database["public"]["CompositeTypes"]["http_response"]
        SetofOptions: {
          from: "*"
          to: "http_response"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      http_reset_curlopt: { Args: never; Returns: boolean }
      http_set_curlopt: {
        Args: { curlopt: string; value: string }
        Returns: boolean
      }
      run_daily_audit: { Args: never; Returns: undefined }
      text_to_bytea: { Args: { data: string }; Returns: string }
      trigger_ai_evaluation: { Args: { event_id: string }; Returns: undefined }
      urlencode:
        | { Args: { data: Json }; Returns: string }
        | {
            Args: { string: string }
            Returns: {
              error: true
            } & "Could not choose the best candidate function between: public.urlencode(string => bytea), public.urlencode(string => varchar). Try renaming the parameters or the function itself in the database so function overloading can be resolved"
          }
        | {
            Args: { string: string }
            Returns: {
              error: true
            } & "Could not choose the best candidate function between: public.urlencode(string => bytea), public.urlencode(string => varchar). Try renaming the parameters or the function itself in the database so function overloading can be resolved"
          }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
    }
    CompositeTypes: {
      http_header: {
        field: string | null
        value: string | null
      }
      http_request: {
        method: unknown
        uri: string | null
        headers: Database["public"]["CompositeTypes"]["http_header"][] | null
        content_type: string | null
        content: string | null
      }
      http_response: {
        status: number | null
        content_type: string | null
        headers: Database["public"]["CompositeTypes"]["http_header"][] | null
        content: string | null
      }
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
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const
