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
      events: {
        Row: {
          created_at: string | null
          event_data: Json | null
          event_id: string
          event_type: Database["public"]["Enums"]["event_type"] | null
        }
        Insert: {
          created_at?: string | null
          event_data?: Json | null
          event_id?: string
          event_type?: Database["public"]["Enums"]["event_type"] | null
        }
        Update: {
          created_at?: string | null
          event_data?: Json | null
          event_id?: string
          event_type?: Database["public"]["Enums"]["event_type"] | null
        }
        Relationships: []
      }
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
          is_test: boolean | null
          is_zero_install: boolean | null
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
          is_test?: boolean | null
          is_zero_install?: boolean | null
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
          is_test?: boolean | null
          is_zero_install?: boolean | null
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
          is_test: boolean | null
          is_zero_install: boolean | null
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
          is_test?: boolean | null
          is_zero_install?: boolean | null
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
          is_test?: boolean | null
          is_zero_install?: boolean | null
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
      mcp_server_categories_view: {
        Row: {
          activity_status: string | null
          categories: string | null
          created_at: string | null
          description: string | null
          detected_tools: Json | null
          fallback_avatar_color: string | null
          fallback_avatar_initials: string | null
          forks: number | null
          github_url: string | null
          id: number | null
          is_community: boolean | null
          is_featured: boolean | null
          is_official: boolean | null
          is_remote_available: boolean | null
          last_updated: string | null
          license: string | null
          local_image_path: string | null
          name: string | null
          owner: string | null
          popularity_category: string | null
          primary_url: string | null
          pulse_mcp_id: string | null
          pulse_mcp_url: string | null
          repo_name: string | null
          server_type: string | null
          stars: number | null
          status: string | null
          supported_languages: string | null
          supported_platforms: string | null
          tags: string | null
          tool_count: number | null
          unique_id: string | null
          updated_at: string | null
        }
        Insert: {
          activity_status?: never
          categories?: never
          created_at?: string | null
          description?: string | null
          detected_tools?: never
          fallback_avatar_color?: string | null
          fallback_avatar_initials?: string | null
          forks?: never
          github_url?: never
          id?: number | null
          is_community?: never
          is_featured?: never
          is_official?: never
          is_remote_available?: never
          last_updated?: never
          license?: never
          local_image_path?: string | null
          name?: string | null
          owner?: never
          popularity_category?: never
          primary_url?: string | null
          pulse_mcp_id?: never
          pulse_mcp_url?: never
          repo_name?: never
          server_type?: string | null
          stars?: never
          status?: never
          supported_languages?: never
          supported_platforms?: never
          tags?: never
          tool_count?: never
          unique_id?: string | null
          updated_at?: string | null
        }
        Update: {
          activity_status?: never
          categories?: never
          created_at?: string | null
          description?: string | null
          detected_tools?: never
          fallback_avatar_color?: string | null
          fallback_avatar_initials?: string | null
          forks?: never
          github_url?: never
          id?: number | null
          is_community?: never
          is_featured?: never
          is_official?: never
          is_remote_available?: never
          last_updated?: never
          license?: never
          local_image_path?: string | null
          name?: string | null
          owner?: never
          popularity_category?: never
          primary_url?: string | null
          pulse_mcp_id?: never
          pulse_mcp_url?: never
          repo_name?: never
          server_type?: string | null
          stars?: never
          status?: never
          supported_languages?: never
          supported_platforms?: never
          tags?: never
          tool_count?: never
          unique_id?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      mcp_servers_full_view: {
        Row: {
          analysis_result: Json | null
          analysis_title: string | null
          analyzed_description: string | null
          analyzed_name: string | null
          categories: Json | null
          config_options: Json | null
          created_at: string | null
          description: string | null
          detected_tools: Json | null
          fallback_avatar_color: string | null
          fallback_avatar_initials: string | null
          forks: number | null
          github_info: Json | null
          github_url: string | null
          id: number | null
          installation: Json | null
          is_community: string | null
          is_featured: string | null
          is_official: string | null
          is_remote_available: string | null
          is_test: boolean | null
          is_zero_install: boolean | null
          last_updated: string | null
          license: string | null
          local_image_path: string | null
          mcp_config: Json | null
          metadata: Json | null
          metadata_map: Json | null
          name: string | null
          owner: string | null
          primary_url: string | null
          repo_name: string | null
          runtime_config_notes: Json | null
          server_type: string | null
          stars: number | null
          supported_languages: Json | null
          supported_platforms: Json | null
          tags: Json | null
          unique_id: string | null
          updated_at: string | null
          usage_instructions: Json | null
          version: string | null
        }
        Insert: {
          analysis_result?: Json | null
          analysis_title?: never
          analyzed_description?: never
          analyzed_name?: never
          categories?: never
          config_options?: never
          created_at?: string | null
          description?: string | null
          detected_tools?: never
          fallback_avatar_color?: string | null
          fallback_avatar_initials?: string | null
          forks?: never
          github_info?: Json | null
          github_url?: never
          id?: number | null
          installation?: never
          is_community?: never
          is_featured?: never
          is_official?: never
          is_remote_available?: never
          is_test?: boolean | null
          is_zero_install?: boolean | null
          last_updated?: never
          license?: never
          local_image_path?: string | null
          mcp_config?: never
          metadata?: Json | null
          metadata_map?: never
          name?: string | null
          owner?: never
          primary_url?: string | null
          repo_name?: never
          runtime_config_notes?: never
          server_type?: string | null
          stars?: never
          supported_languages?: never
          supported_platforms?: never
          tags?: never
          unique_id?: string | null
          updated_at?: string | null
          usage_instructions?: never
          version?: never
        }
        Update: {
          analysis_result?: Json | null
          analysis_title?: never
          analyzed_description?: never
          analyzed_name?: never
          categories?: never
          config_options?: never
          created_at?: string | null
          description?: string | null
          detected_tools?: never
          fallback_avatar_color?: string | null
          fallback_avatar_initials?: string | null
          forks?: never
          github_info?: Json | null
          github_url?: never
          id?: number | null
          installation?: never
          is_community?: never
          is_featured?: never
          is_official?: never
          is_remote_available?: never
          is_test?: boolean | null
          is_zero_install?: boolean | null
          last_updated?: never
          license?: never
          local_image_path?: string | null
          mcp_config?: never
          metadata?: Json | null
          metadata_map?: never
          name?: string | null
          owner?: never
          primary_url?: string | null
          repo_name?: never
          runtime_config_notes?: never
          server_type?: string | null
          stars?: never
          supported_languages?: never
          supported_platforms?: never
          tags?: never
          unique_id?: string | null
          updated_at?: string | null
          usage_instructions?: never
          version?: never
        }
        Relationships: []
      }
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      event_type: "product_view" | "product_visit" | "profile_view"
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
    Enums: {
      event_type: ["product_view", "product_visit", "profile_view"],
    },
  },
} as const
