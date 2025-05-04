export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      mcp_servers: {
        Row: {
          analysis_result: Json | null
          created_at: string
          derived_config: Json | null
          derived_install_command: string | null
          derived_tools: Json | null
          description: string | null
          fallback_avatar_color: string | null
          fallback_avatar_initials: string | null
          github_info: Json | null
          id: number
          local_image_path: string | null
          metadata: Json | null
          name: string
          primary_url: string | null
          pulse_mcp_info: Json | null
          server_type: string | null
          unique_id: string
          updated_at: string
        }
        Insert: {
          analysis_result?: Json | null
          created_at?: string
          derived_config?: Json | null
          derived_install_command?: string | null
          derived_tools?: Json | null
          description?: string | null
          fallback_avatar_color?: string | null
          fallback_avatar_initials?: string | null
          github_info?: Json | null
          id?: number
          local_image_path?: string | null
          metadata?: Json | null
          name: string
          primary_url?: string | null
          pulse_mcp_info?: Json | null
          server_type?: string | null
          unique_id: string
          updated_at?: string
        }
        Update: {
          analysis_result?: Json | null
          created_at?: string
          derived_config?: Json | null
          derived_install_command?: string | null
          derived_tools?: Json | null
          description?: string | null
          fallback_avatar_color?: string | null
          fallback_avatar_initials?: string | null
          github_info?: Json | null
          id?: number
          local_image_path?: string | null
          metadata?: Json | null
          name?: string
          primary_url?: string | null
          pulse_mcp_info?: Json | null
          server_type?: string | null
          unique_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      users: {
        Row: {
          bio: string | null
          created_at: string
          email: string
          id: number
          is_active: boolean
          name: string | null
          password: string
          role: string
          updated_at: string
        }
        Insert: {
          bio?: string | null
          created_at?: string
          email: string
          id?: number
          is_active?: boolean
          name?: string | null
          password: string
          role?: string
          updated_at?: string
        }
        Update: {
          bio?: string | null
          created_at?: string
          email?: string
          id?: number
          is_active?: boolean
          name?: string | null
          password?: string
          role?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      empty_mcpconfig_servers_view: {
        Row: {
          analysis_result: Json | null
          created_at: string | null
          description: string | null
          github_info: Json | null
          github_url: string | null
          id: number | null
          name: string | null
          owner: string | null
          primary_url: string | null
          repo_name: string | null
          server_type: string | null
          stars: number | null
          unique_id: string | null
          updated_at: string | null
        }
        Insert: {
          analysis_result?: Json | null
          created_at?: string | null
          description?: string | null
          github_info?: Json | null
          github_url?: never
          id?: number | null
          name?: string | null
          owner?: never
          primary_url?: string | null
          repo_name?: never
          server_type?: string | null
          stars?: never
          unique_id?: string | null
          updated_at?: string | null
        }
        Update: {
          analysis_result?: Json | null
          created_at?: string | null
          description?: string | null
          github_info?: Json | null
          github_url?: never
          id?: number | null
          name?: string | null
          owner?: never
          primary_url?: string | null
          repo_name?: never
          server_type?: string | null
          stars?: never
          unique_id?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      github_popularity_view: {
        Row: {
          created_at: string | null
          fallback_avatar_color: string | null
          fallback_avatar_initials: string | null
          forks: number | null
          github_url: string | null
          id: number | null
          last_updated: string | null
          local_image_path: string | null
          name: string | null
          owner: string | null
          repo_name: string | null
          stars: number | null
          unique_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          fallback_avatar_color?: string | null
          fallback_avatar_initials?: string | null
          forks?: never
          github_url?: never
          id?: number | null
          last_updated?: never
          local_image_path?: string | null
          name?: string | null
          owner?: never
          repo_name?: never
          stars?: never
          unique_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          fallback_avatar_color?: string | null
          fallback_avatar_initials?: string | null
          forks?: never
          github_url?: never
          id?: number | null
          last_updated?: never
          local_image_path?: string | null
          name?: string | null
          owner?: never
          repo_name?: never
          stars?: never
          unique_id?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      mcp_servers_full_view: {
        Row: {
          created_at: string | null
          description: string | null
          github_info: Json | null
          github_url: string | null
          id: number | null
          name: string | null
          owner: string | null
          primary_url: string | null
          repo_name: string | null
          server_type: string | null
          stars: number | null
          unique_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          github_info?: Json | null
          github_url?: never
          id?: number | null
          name?: string | null
          owner?: never
          primary_url?: string | null
          repo_name?: never
          server_type?: string | null
          stars?: never
          unique_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          github_info?: Json | null
          github_url?: never
          id?: number | null
          name?: string | null
          owner?: never
          primary_url?: string | null
          repo_name?: never
          server_type?: string | null
          stars?: never
          unique_id?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
