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
      AIRequests: {
        Row: {
          created_at: string
          id: string
          project_id: string | null
          prompt: string
          response: string | null
          status: string
          type: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          project_id?: string | null
          prompt: string
          response?: string | null
          status?: string
          type: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          project_id?: string | null
          prompt?: string
          response?: string | null
          status?: string
          type?: string
          user_id?: string | null
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
            referencedRelation: "Campaigns"
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
        Relationships: []
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
            referencedRelation: "Campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      Campaigns: {
        Row: {
          created_at: string | null
          email: string | null
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
          created_at?: string | null
          email?: string | null
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
          created_at?: string | null
          email?: string | null
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
          publish_at?: string
          published?: boolean | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "CampaignSchedule_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "Campaigns"
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
            referencedRelation: "Campaigns"
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
      EmailLogs: {
        Row: {
          campaign_id: string | null
          clicked_at: string | null
          id: string
          message_id: string | null
          opened_at: string | null
          recipient_email: string
          sent_at: string | null
          status: string | null
          subject: string | null
          user_id: string | null
        }
        Insert: {
          campaign_id?: string | null
          clicked_at?: string | null
          id?: string
          message_id?: string | null
          opened_at?: string | null
          recipient_email: string
          sent_at?: string | null
          status?: string | null
          subject?: string | null
          user_id?: string | null
        }
        Update: {
          campaign_id?: string | null
          clicked_at?: string | null
          id?: string
          message_id?: string | null
          opened_at?: string | null
          recipient_email?: string
          sent_at?: string | null
          status?: string | null
          subject?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "EmailLogs_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "Campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      Emails: {
        Row: {
          content: string
          created_at: string
          id: string
          project: string | null
          project_id: string | null
          recipient: string | null
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          project?: string | null
          project_id?: string | null
          recipient?: string | null
          type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          project?: string | null
          project_id?: string | null
          recipient?: string | null
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
            referencedRelation: "Campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      Notifications: {
        Row: {
          id: string
          message: string
          read: boolean | null
          sent_at: string | null
          title: string
          type: string
          user_id: string | null
        }
        Insert: {
          id?: string
          message: string
          read?: boolean | null
          sent_at?: string | null
          title: string
          type: string
          user_id?: string | null
        }
        Update: {
          id?: string
          message?: string
          read?: boolean | null
          sent_at?: string | null
          title?: string
          type?: string
          user_id?: string | null
        }
        Relationships: []
      }
      offers: {
        Row: {
          created_at: string
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
          role: string
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
          role: string
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
          role?: string
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
      UserPreferences: {
        Row: {
          created_at: string | null
          dark_mode: boolean | null
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_safe_integration_data: {
        Args: { integration_id: string }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
