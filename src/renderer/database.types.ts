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
      api_call_logs: {
        Row: {
          created_at: string
          endpoint: string
          id: number
          latency_ms: number | null
          status_code: number | null
          subscription_id: number | null
        }
        Insert: {
          created_at?: string
          endpoint: string
          id?: number
          latency_ms?: number | null
          status_code?: number | null
          subscription_id?: number | null
        }
        Update: {
          created_at?: string
          endpoint?: string
          id?: number
          latency_ms?: number | null
          status_code?: number | null
          subscription_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "api_call_logs_subscription_id_user_subscriptions_id_fk"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "user_subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          client_id: number
          created_at: string
          description: string
          how_it_works: string
          icon: string
          name: string
          promoted_from: string | null
          promoted_to: string | null
          stats: Json
          tagline: string
          updated_at: string
          url: string
        }
        Insert: {
          client_id?: never
          created_at?: string
          description: string
          how_it_works: string
          icon: string
          name: string
          promoted_from?: string | null
          promoted_to?: string | null
          stats?: Json
          tagline: string
          updated_at?: string
          url: string
        }
        Update: {
          client_id?: never
          created_at?: string
          description?: string
          how_it_works?: string
          icon?: string
          name?: string
          promoted_from?: string | null
          promoted_to?: string | null
          stats?: Json
          tagline?: string
          updated_at?: string
          url?: string
        }
        Relationships: []
      }
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
      follows: {
        Row: {
          created_at: string
          follower_id: string
          following_id: string
        }
        Insert: {
          created_at?: string
          follower_id: string
          following_id: string
        }
        Update: {
          created_at?: string
          follower_id?: string
          following_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "follows_follower_id_profiles_profile_id_fk"
            columns: ["follower_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "follows_follower_id_profiles_profile_id_fk"
            columns: ["follower_id"]
            isOneToOne: false
            referencedRelation: "profiles_view"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "follows_following_id_profiles_profile_id_fk"
            columns: ["following_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "follows_following_id_profiles_profile_id_fk"
            columns: ["following_id"]
            isOneToOne: false
            referencedRelation: "profiles_view"
            referencedColumns: ["profile_id"]
          },
        ]
      }
      mcp_configs: {
        Row: {
          allowed_values: Json | null
          args: Json | null
          command: string | null
          config_name: string | null
          config_type: string | null
          created_at: string
          description: string | null
          env: Json | null
          id: number
          is_recommended: boolean | null
          is_user_customizable: boolean | null
          original_server_id: number | null
          platform: string | null
          updated_at: string
          value_placeholder: string | null
          value_type: string | null
        }
        Insert: {
          allowed_values?: Json | null
          args?: Json | null
          command?: string | null
          config_name?: string | null
          config_type?: string | null
          created_at?: string
          description?: string | null
          env?: Json | null
          id?: number
          is_recommended?: boolean | null
          is_user_customizable?: boolean | null
          original_server_id?: number | null
          platform?: string | null
          updated_at?: string
          value_placeholder?: string | null
          value_type?: string | null
        }
        Update: {
          allowed_values?: Json | null
          args?: Json | null
          command?: string | null
          config_name?: string | null
          config_type?: string | null
          created_at?: string
          description?: string | null
          env?: Json | null
          id?: number
          is_recommended?: boolean | null
          is_user_customizable?: boolean | null
          original_server_id?: number | null
          platform?: string | null
          updated_at?: string
          value_placeholder?: string | null
          value_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mcp_configs_original_server_id_mcp_servers_id_fk"
            columns: ["original_server_id"]
            isOneToOne: false
            referencedRelation: "empty_mcpconfig_servers_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mcp_configs_original_server_id_mcp_servers_id_fk"
            columns: ["original_server_id"]
            isOneToOne: false
            referencedRelation: "github_popularity_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mcp_configs_original_server_id_mcp_servers_id_fk"
            columns: ["original_server_id"]
            isOneToOne: false
            referencedRelation: "mcp_server_categories_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mcp_configs_original_server_id_mcp_servers_id_fk"
            columns: ["original_server_id"]
            isOneToOne: false
            referencedRelation: "mcp_server_detail_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mcp_configs_original_server_id_mcp_servers_id_fk"
            columns: ["original_server_id"]
            isOneToOne: false
            referencedRelation: "mcp_servers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mcp_configs_original_server_id_mcp_servers_id_fk"
            columns: ["original_server_id"]
            isOneToOne: false
            referencedRelation: "mcp_servers_full_view"
            referencedColumns: ["id"]
          },
        ]
      }
      mcp_install_methods: {
        Row: {
          args: Json | null
          command: string | null
          content_hash: string | null
          created_at: string
          description: string | null
          env: Json | null
          id: number
          is_multi_command: boolean | null
          is_zero_install: boolean | null
          multi_command: Json | null
          original_server_id: number | null
          updated_at: string
        }
        Insert: {
          args?: Json | null
          command?: string | null
          content_hash?: string | null
          created_at?: string
          description?: string | null
          env?: Json | null
          id?: number
          is_multi_command?: boolean | null
          is_zero_install?: boolean | null
          multi_command?: Json | null
          original_server_id?: number | null
          updated_at?: string
        }
        Update: {
          args?: Json | null
          command?: string | null
          content_hash?: string | null
          created_at?: string
          description?: string | null
          env?: Json | null
          id?: number
          is_multi_command?: boolean | null
          is_zero_install?: boolean | null
          multi_command?: Json | null
          original_server_id?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "mcp_install_methods_original_server_id_mcp_servers_id_fk"
            columns: ["original_server_id"]
            isOneToOne: false
            referencedRelation: "empty_mcpconfig_servers_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mcp_install_methods_original_server_id_mcp_servers_id_fk"
            columns: ["original_server_id"]
            isOneToOne: false
            referencedRelation: "github_popularity_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mcp_install_methods_original_server_id_mcp_servers_id_fk"
            columns: ["original_server_id"]
            isOneToOne: false
            referencedRelation: "mcp_server_categories_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mcp_install_methods_original_server_id_mcp_servers_id_fk"
            columns: ["original_server_id"]
            isOneToOne: false
            referencedRelation: "mcp_server_detail_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mcp_install_methods_original_server_id_mcp_servers_id_fk"
            columns: ["original_server_id"]
            isOneToOne: false
            referencedRelation: "mcp_servers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mcp_install_methods_original_server_id_mcp_servers_id_fk"
            columns: ["original_server_id"]
            isOneToOne: false
            referencedRelation: "mcp_servers_full_view"
            referencedColumns: ["id"]
          },
        ]
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
      mcp_servers_enhanced: {
        Row: {
          created_at: string
          description_en: string | null
          description_ja: string | null
          description_ko: string | null
          id: number
          is_safety_verified: boolean | null
          original_server_id: number | null
          recommended_method: string | null
          safety_check_at: string | null
          safety_issues: Json | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description_en?: string | null
          description_ja?: string | null
          description_ko?: string | null
          id?: number
          is_safety_verified?: boolean | null
          original_server_id?: number | null
          recommended_method?: string | null
          safety_check_at?: string | null
          safety_issues?: Json | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description_en?: string | null
          description_ja?: string | null
          description_ko?: string | null
          id?: number
          is_safety_verified?: boolean | null
          original_server_id?: number | null
          recommended_method?: string | null
          safety_check_at?: string | null
          safety_issues?: Json | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "mcp_servers_enhanced_original_server_id_mcp_servers_id_fk"
            columns: ["original_server_id"]
            isOneToOne: false
            referencedRelation: "empty_mcpconfig_servers_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mcp_servers_enhanced_original_server_id_mcp_servers_id_fk"
            columns: ["original_server_id"]
            isOneToOne: false
            referencedRelation: "github_popularity_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mcp_servers_enhanced_original_server_id_mcp_servers_id_fk"
            columns: ["original_server_id"]
            isOneToOne: false
            referencedRelation: "mcp_server_categories_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mcp_servers_enhanced_original_server_id_mcp_servers_id_fk"
            columns: ["original_server_id"]
            isOneToOne: false
            referencedRelation: "mcp_server_detail_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mcp_servers_enhanced_original_server_id_mcp_servers_id_fk"
            columns: ["original_server_id"]
            isOneToOne: false
            referencedRelation: "mcp_servers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mcp_servers_enhanced_original_server_id_mcp_servers_id_fk"
            columns: ["original_server_id"]
            isOneToOne: false
            referencedRelation: "mcp_servers_full_view"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_history: {
        Row: {
          amount: number
          created_at: string
          currency: Database["public"]["Enums"]["currency"]
          external_transaction_id: string
          failure_reason: string | null
          id: number
          payment_method: Database["public"]["Enums"]["payment_method"]
          payment_provider: Database["public"]["Enums"]["payment_provider"]
          processed_at: string
          status: Database["public"]["Enums"]["payment_status"]
          subscription_id: number
        }
        Insert: {
          amount: number
          created_at?: string
          currency: Database["public"]["Enums"]["currency"]
          external_transaction_id: string
          failure_reason?: string | null
          id?: number
          payment_method: Database["public"]["Enums"]["payment_method"]
          payment_provider: Database["public"]["Enums"]["payment_provider"]
          processed_at?: string
          status: Database["public"]["Enums"]["payment_status"]
          subscription_id: number
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: Database["public"]["Enums"]["currency"]
          external_transaction_id?: string
          failure_reason?: string | null
          id?: number
          payment_method?: Database["public"]["Enums"]["payment_method"]
          payment_provider?: Database["public"]["Enums"]["payment_provider"]
          processed_at?: string
          status?: Database["public"]["Enums"]["payment_status"]
          subscription_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "payment_history_subscription_id_user_subscriptions_id_fk"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "user_subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar: string | null
          bio: string | null
          created_at: string
          headline: string | null
          name: string
          profile_id: string
          role: Database["public"]["Enums"]["role"]
          stats: Json | null
          updated_at: string
          user_id: string
          username: string
          views: Json | null
        }
        Insert: {
          avatar?: string | null
          bio?: string | null
          created_at?: string
          headline?: string | null
          name: string
          profile_id: string
          role?: Database["public"]["Enums"]["role"]
          stats?: Json | null
          updated_at?: string
          user_id: string
          username: string
          views?: Json | null
        }
        Update: {
          avatar?: string | null
          bio?: string | null
          created_at?: string
          headline?: string | null
          name?: string
          profile_id?: string
          role?: Database["public"]["Enums"]["role"]
          stats?: Json | null
          updated_at?: string
          user_id?: string
          username?: string
          views?: Json | null
        }
        Relationships: []
      }
      subscription_limits: {
        Row: {
          advanced_analytics: boolean | null
          annual_price: number | null
          api_access: boolean | null
          api_calls_per_month: number | null
          client_computer_usage: boolean | null
          created_at: string
          currency: Database["public"]["Enums"]["currency"]
          id: number
          mcp_servers_per_month: number | null
          monthly_price: number | null
          priority_support: boolean | null
          region: Database["public"]["Enums"]["region"]
          security_mcp_servers: boolean | null
          storage_gb: number | null
          tier: Database["public"]["Enums"]["subscription_tier"]
          updated_at: string
        }
        Insert: {
          advanced_analytics?: boolean | null
          annual_price?: number | null
          api_access?: boolean | null
          api_calls_per_month?: number | null
          client_computer_usage?: boolean | null
          created_at?: string
          currency: Database["public"]["Enums"]["currency"]
          id?: number
          mcp_servers_per_month?: number | null
          monthly_price?: number | null
          priority_support?: boolean | null
          region: Database["public"]["Enums"]["region"]
          security_mcp_servers?: boolean | null
          storage_gb?: number | null
          tier: Database["public"]["Enums"]["subscription_tier"]
          updated_at?: string
        }
        Update: {
          advanced_analytics?: boolean | null
          annual_price?: number | null
          api_access?: boolean | null
          api_calls_per_month?: number | null
          client_computer_usage?: boolean | null
          created_at?: string
          currency?: Database["public"]["Enums"]["currency"]
          id?: number
          mcp_servers_per_month?: number | null
          monthly_price?: number | null
          priority_support?: boolean | null
          region?: Database["public"]["Enums"]["region"]
          security_mcp_servers?: boolean | null
          storage_gb?: number | null
          tier?: Database["public"]["Enums"]["subscription_tier"]
          updated_at?: string
        }
        Relationships: []
      }
      subscription_usage: {
        Row: {
          api_calls_made: number | null
          created_at: string
          id: number
          mcp_servers_used: number | null
          period_end: string
          period_start: string
          subscription_id: number
          successful_installations: number | null
        }
        Insert: {
          api_calls_made?: number | null
          created_at?: string
          id?: number
          mcp_servers_used?: number | null
          period_end: string
          period_start: string
          subscription_id: number
          successful_installations?: number | null
        }
        Update: {
          api_calls_made?: number | null
          created_at?: string
          id?: number
          mcp_servers_used?: number | null
          period_end?: string
          period_start?: string
          subscription_id?: number
          successful_installations?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "subscription_usage_subscription_id_user_subscriptions_id_fk"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "user_subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      user_mcp_bookmarks: {
        Row: {
          bookmarked_at: string
          original_server_id: number
          profile_id: string
        }
        Insert: {
          bookmarked_at?: string
          original_server_id: number
          profile_id: string
        }
        Update: {
          bookmarked_at?: string
          original_server_id?: number
          profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_mcp_bookmarks_original_server_id_mcp_servers_id_fk"
            columns: ["original_server_id"]
            isOneToOne: false
            referencedRelation: "empty_mcpconfig_servers_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_mcp_bookmarks_original_server_id_mcp_servers_id_fk"
            columns: ["original_server_id"]
            isOneToOne: false
            referencedRelation: "github_popularity_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_mcp_bookmarks_original_server_id_mcp_servers_id_fk"
            columns: ["original_server_id"]
            isOneToOne: false
            referencedRelation: "mcp_server_categories_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_mcp_bookmarks_original_server_id_mcp_servers_id_fk"
            columns: ["original_server_id"]
            isOneToOne: false
            referencedRelation: "mcp_server_detail_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_mcp_bookmarks_original_server_id_mcp_servers_id_fk"
            columns: ["original_server_id"]
            isOneToOne: false
            referencedRelation: "mcp_servers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_mcp_bookmarks_original_server_id_mcp_servers_id_fk"
            columns: ["original_server_id"]
            isOneToOne: false
            referencedRelation: "mcp_servers_full_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_mcp_bookmarks_profile_id_profiles_profile_id_fk"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "user_mcp_bookmarks_profile_id_profiles_profile_id_fk"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles_view"
            referencedColumns: ["profile_id"]
          },
        ]
      }
      user_mcp_usage: {
        Row: {
          config_attempted_at: string | null
          config_completed_at: string | null
          config_error: string | null
          config_id: number | null
          config_status: Database["public"]["Enums"]["config_status"] | null
          created_at: string
          difficulty_experienced: number | null
          execution_status:
            | Database["public"]["Enums"]["execution_status"]
            | null
          id: number
          install_attempted_at: string | null
          install_completed_at: string | null
          install_error: string | null
          install_method_id: number | null
          install_status: Database["public"]["Enums"]["install_status"] | null
          last_error: string | null
          last_run_at: string | null
          original_server_id: number
          profile_id: string
          total_runs: number | null
          updated_at: string
          user_client: string | null
          user_platform: string | null
          user_rating: number | null
          user_review: string | null
        }
        Insert: {
          config_attempted_at?: string | null
          config_completed_at?: string | null
          config_error?: string | null
          config_id?: number | null
          config_status?: Database["public"]["Enums"]["config_status"] | null
          created_at?: string
          difficulty_experienced?: number | null
          execution_status?:
            | Database["public"]["Enums"]["execution_status"]
            | null
          id?: number
          install_attempted_at?: string | null
          install_completed_at?: string | null
          install_error?: string | null
          install_method_id?: number | null
          install_status?: Database["public"]["Enums"]["install_status"] | null
          last_error?: string | null
          last_run_at?: string | null
          original_server_id: number
          profile_id: string
          total_runs?: number | null
          updated_at?: string
          user_client?: string | null
          user_platform?: string | null
          user_rating?: number | null
          user_review?: string | null
        }
        Update: {
          config_attempted_at?: string | null
          config_completed_at?: string | null
          config_error?: string | null
          config_id?: number | null
          config_status?: Database["public"]["Enums"]["config_status"] | null
          created_at?: string
          difficulty_experienced?: number | null
          execution_status?:
            | Database["public"]["Enums"]["execution_status"]
            | null
          id?: number
          install_attempted_at?: string | null
          install_completed_at?: string | null
          install_error?: string | null
          install_method_id?: number | null
          install_status?: Database["public"]["Enums"]["install_status"] | null
          last_error?: string | null
          last_run_at?: string | null
          original_server_id?: number
          profile_id?: string
          total_runs?: number | null
          updated_at?: string
          user_client?: string | null
          user_platform?: string | null
          user_rating?: number | null
          user_review?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_mcp_usage_config_id_mcp_configs_id_fk"
            columns: ["config_id"]
            isOneToOne: false
            referencedRelation: "mcp_configs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_mcp_usage_install_method_id_mcp_install_methods_id_fk"
            columns: ["install_method_id"]
            isOneToOne: false
            referencedRelation: "mcp_install_methods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_mcp_usage_original_server_id_mcp_servers_id_fk"
            columns: ["original_server_id"]
            isOneToOne: false
            referencedRelation: "empty_mcpconfig_servers_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_mcp_usage_original_server_id_mcp_servers_id_fk"
            columns: ["original_server_id"]
            isOneToOne: false
            referencedRelation: "github_popularity_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_mcp_usage_original_server_id_mcp_servers_id_fk"
            columns: ["original_server_id"]
            isOneToOne: false
            referencedRelation: "mcp_server_categories_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_mcp_usage_original_server_id_mcp_servers_id_fk"
            columns: ["original_server_id"]
            isOneToOne: false
            referencedRelation: "mcp_server_detail_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_mcp_usage_original_server_id_mcp_servers_id_fk"
            columns: ["original_server_id"]
            isOneToOne: false
            referencedRelation: "mcp_servers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_mcp_usage_original_server_id_mcp_servers_id_fk"
            columns: ["original_server_id"]
            isOneToOne: false
            referencedRelation: "mcp_servers_full_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_mcp_usage_profile_id_profiles_profile_id_fk"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "user_mcp_usage_profile_id_profiles_profile_id_fk"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles_view"
            referencedColumns: ["profile_id"]
          },
        ]
      }
      user_subscriptions: {
        Row: {
          annual_price: number | null
          billing_key: string | null
          cancel_at_period_end: boolean | null
          canceled_at: string | null
          created_at: string
          currency: Database["public"]["Enums"]["currency"]
          current_period_end: string
          current_period_start: string
          external_customer_id: string | null
          external_subscription_id: string | null
          id: number
          metadata: Json | null
          monthly_price: number | null
          payment_method: Database["public"]["Enums"]["payment_method"] | null
          payment_provider:
            | Database["public"]["Enums"]["payment_provider"]
            | null
          profile_id: string
          region: Database["public"]["Enums"]["region"]
          status: Database["public"]["Enums"]["subscription_status"]
          tier: Database["public"]["Enums"]["subscription_tier"]
          trial_end: string | null
          trial_start: string | null
          updated_at: string
        }
        Insert: {
          annual_price?: number | null
          billing_key?: string | null
          cancel_at_period_end?: boolean | null
          canceled_at?: string | null
          created_at?: string
          currency?: Database["public"]["Enums"]["currency"]
          current_period_end: string
          current_period_start: string
          external_customer_id?: string | null
          external_subscription_id?: string | null
          id?: number
          metadata?: Json | null
          monthly_price?: number | null
          payment_method?: Database["public"]["Enums"]["payment_method"] | null
          payment_provider?:
            | Database["public"]["Enums"]["payment_provider"]
            | null
          profile_id: string
          region?: Database["public"]["Enums"]["region"]
          status?: Database["public"]["Enums"]["subscription_status"]
          tier?: Database["public"]["Enums"]["subscription_tier"]
          trial_end?: string | null
          trial_start?: string | null
          updated_at?: string
        }
        Update: {
          annual_price?: number | null
          billing_key?: string | null
          cancel_at_period_end?: boolean | null
          canceled_at?: string | null
          created_at?: string
          currency?: Database["public"]["Enums"]["currency"]
          current_period_end?: string
          current_period_start?: string
          external_customer_id?: string | null
          external_subscription_id?: string | null
          id?: number
          metadata?: Json | null
          monthly_price?: number | null
          payment_method?: Database["public"]["Enums"]["payment_method"] | null
          payment_provider?:
            | Database["public"]["Enums"]["payment_provider"]
            | null
          profile_id?: string
          region?: Database["public"]["Enums"]["region"]
          status?: Database["public"]["Enums"]["subscription_status"]
          tier?: Database["public"]["Enums"]["subscription_tier"]
          trial_end?: string | null
          trial_start?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_subscriptions_profile_id_profiles_profile_id_fk"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "user_subscriptions_profile_id_profiles_profile_id_fk"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles_view"
            referencedColumns: ["profile_id"]
          },
        ]
      }
      workflow_edges: {
        Row: {
          created_at: string
          edge_config: Json | null
          edge_id: string
          id: number
          source_handle: string | null
          source_node_id: string
          target_handle: string | null
          target_node_id: string
          workflow_id: number
        }
        Insert: {
          created_at?: string
          edge_config?: Json | null
          edge_id: string
          id?: number
          source_handle?: string | null
          source_node_id: string
          target_handle?: string | null
          target_node_id: string
          workflow_id: number
        }
        Update: {
          created_at?: string
          edge_config?: Json | null
          edge_id?: string
          id?: number
          source_handle?: string | null
          source_node_id?: string
          target_handle?: string | null
          target_node_id?: string
          workflow_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "workflow_edges_workflow_id_workflows_id_fk"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "workflows"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_executions: {
        Row: {
          completed_at: string | null
          duration_ms: number | null
          error_message: string | null
          execution_id: string
          id: number
          nodes_executed: number | null
          nodes_failed: number | null
          result_data: Json | null
          started_at: string
          status: string | null
          user_id: string
          workflow_id: number
        }
        Insert: {
          completed_at?: string | null
          duration_ms?: number | null
          error_message?: string | null
          execution_id: string
          id?: number
          nodes_executed?: number | null
          nodes_failed?: number | null
          result_data?: Json | null
          started_at?: string
          status?: string | null
          user_id: string
          workflow_id: number
        }
        Update: {
          completed_at?: string | null
          duration_ms?: number | null
          error_message?: string | null
          execution_id?: string
          id?: number
          nodes_executed?: number | null
          nodes_failed?: number | null
          result_data?: Json | null
          started_at?: string
          status?: string | null
          user_id?: string
          workflow_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "workflow_executions_workflow_id_workflows_id_fk"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "workflows"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_nodes: {
        Row: {
          client_id: number | null
          created_at: string
          id: number
          node_config: Json | null
          node_id: string
          node_type: string
          original_server_id: number | null
          position_x: number
          position_y: number
          user_mcp_usage_id: number | null
          workflow_id: number
        }
        Insert: {
          client_id?: number | null
          created_at?: string
          id?: number
          node_config?: Json | null
          node_id: string
          node_type: string
          original_server_id?: number | null
          position_x: number
          position_y: number
          user_mcp_usage_id?: number | null
          workflow_id: number
        }
        Update: {
          client_id?: number | null
          created_at?: string
          id?: number
          node_config?: Json | null
          node_id?: string
          node_type?: string
          original_server_id?: number | null
          position_x?: number
          position_y?: number
          user_mcp_usage_id?: number | null
          workflow_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "workflow_nodes_client_id_clients_client_id_fk"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "workflow_nodes_original_server_id_mcp_servers_id_fk"
            columns: ["original_server_id"]
            isOneToOne: false
            referencedRelation: "empty_mcpconfig_servers_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_nodes_original_server_id_mcp_servers_id_fk"
            columns: ["original_server_id"]
            isOneToOne: false
            referencedRelation: "github_popularity_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_nodes_original_server_id_mcp_servers_id_fk"
            columns: ["original_server_id"]
            isOneToOne: false
            referencedRelation: "mcp_server_categories_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_nodes_original_server_id_mcp_servers_id_fk"
            columns: ["original_server_id"]
            isOneToOne: false
            referencedRelation: "mcp_server_detail_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_nodes_original_server_id_mcp_servers_id_fk"
            columns: ["original_server_id"]
            isOneToOne: false
            referencedRelation: "mcp_servers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_nodes_original_server_id_mcp_servers_id_fk"
            columns: ["original_server_id"]
            isOneToOne: false
            referencedRelation: "mcp_servers_full_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_nodes_user_mcp_usage_id_user_mcp_usage_id_fk"
            columns: ["user_mcp_usage_id"]
            isOneToOne: false
            referencedRelation: "user_mcp_usage"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_nodes_workflow_id_workflows_id_fk"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "workflows"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_shares: {
        Row: {
          can_copy: boolean | null
          can_edit: boolean | null
          can_view: boolean | null
          created_at: string
          download_count: number | null
          expires_at: string | null
          id: number
          is_active: boolean | null
          share_description: string | null
          share_title: string | null
          share_token: string | null
          share_type: string | null
          shared_by_user_id: string
          updated_at: string
          workflow_id: number
        }
        Insert: {
          can_copy?: boolean | null
          can_edit?: boolean | null
          can_view?: boolean | null
          created_at?: string
          download_count?: number | null
          expires_at?: string | null
          id?: number
          is_active?: boolean | null
          share_description?: string | null
          share_title?: string | null
          share_token?: string | null
          share_type?: string | null
          shared_by_user_id: string
          updated_at?: string
          workflow_id: number
        }
        Update: {
          can_copy?: boolean | null
          can_edit?: boolean | null
          can_view?: boolean | null
          created_at?: string
          download_count?: number | null
          expires_at?: string | null
          id?: number
          is_active?: boolean | null
          share_description?: string | null
          share_title?: string | null
          share_token?: string | null
          share_type?: string | null
          shared_by_user_id?: string
          updated_at?: string
          workflow_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "workflow_shares_workflow_id_workflows_id_fk"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "workflows"
            referencedColumns: ["id"]
          },
        ]
      }
      workflows: {
        Row: {
          created_at: string
          description: string | null
          execution_count: number | null
          flow_structure: Json
          id: number
          is_public: boolean | null
          is_template: boolean | null
          last_executed_at: string | null
          name: string
          profile_id: string
          status: string | null
          tags: Json | null
          updated_at: string
          version: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          execution_count?: number | null
          flow_structure: Json
          id?: number
          is_public?: boolean | null
          is_template?: boolean | null
          last_executed_at?: string | null
          name: string
          profile_id: string
          status?: string | null
          tags?: Json | null
          updated_at?: string
          version?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          execution_count?: number | null
          flow_structure?: Json
          id?: number
          is_public?: boolean | null
          is_template?: boolean | null
          last_executed_at?: string | null
          name?: string
          profile_id?: string
          status?: string | null
          tags?: Json | null
          updated_at?: string
          version?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "workflows_profile_id_profiles_profile_id_fk"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "workflows_profile_id_profiles_profile_id_fk"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles_view"
            referencedColumns: ["profile_id"]
          },
        ]
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
      mcp_server_detail_view: {
        Row: {
          analysis_title: string | null
          analyzed_description: string | null
          analyzed_name: string | null
          categories: Json | null
          config_options: Json | null
          created_at: string | null
          description: string | null
          detected_tools: Json | null
          enhanced_info: Json | null
          fallback_avatar_color: string | null
          fallback_avatar_initials: string | null
          forks: number | null
          github_url: string | null
          id: number | null
          install_methods: Json | null
          is_test: boolean | null
          is_zero_install: boolean | null
          last_updated: string | null
          license: string | null
          local_image_path: string | null
          name: string | null
          owner: string | null
          primary_url: string | null
          repo_name: string | null
          server_type: string | null
          stars: number | null
          tags: Json | null
          tool_count: number | null
          unique_id: string | null
          updated_at: string | null
          version: string | null
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
      profiles_view: {
        Row: {
          avatar: string | null
          bio: string | null
          created_at: string | null
          headline: string | null
          is_following: boolean | null
          name: string | null
          profile_id: string | null
          role: Database["public"]["Enums"]["role"] | null
          stats: Json | null
          updated_at: string | null
          user_id: string | null
          username: string | null
          views: Json | null
        }
        Insert: {
          avatar?: string | null
          bio?: string | null
          created_at?: string | null
          headline?: string | null
          is_following?: never
          name?: string | null
          profile_id?: string | null
          role?: Database["public"]["Enums"]["role"] | null
          stats?: Json | null
          updated_at?: string | null
          user_id?: string | null
          username?: string | null
          views?: Json | null
        }
        Update: {
          avatar?: string | null
          bio?: string | null
          created_at?: string | null
          headline?: string | null
          is_following?: never
          name?: string | null
          profile_id?: string | null
          role?: Database["public"]["Enums"]["role"] | null
          stats?: Json | null
          updated_at?: string | null
          user_id?: string | null
          username?: string | null
          views?: Json | null
        }
        Relationships: []
      }
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      config_status: "attempted" | "success" | "failed"
      currency: "KRW" | "USD" | "JPY"
      event_type: "product_view" | "product_visit" | "profile_view"
      execution_status: "never_run" | "running" | "success" | "failed"
      install_status: "attempted" | "success" | "failed"
      notification_type: "follow" | "review" | "reply"
      payment_method: "card" | "kakaopay" | "paypal" | "paypay"
      payment_provider:
        | "toss"
        | "iamport"
        | "kakaopay"
        | "lemonsqueezy"
        | "paypal"
        | "paypay"
      payment_status: "pending" | "success" | "failed" | "canceled" | "refunded"
      region: "korea" | "global" | "japan"
      role:
        | "developer"
        | "designer"
        | "marketer"
        | "founder"
        | "product-manager"
      subscription_status:
        | "incomplete"
        | "incomplete_expired"
        | "trialing"
        | "active"
        | "past_due"
        | "canceled"
        | "unpaid"
        | "paused"
      subscription_tier: "free" | "pro" | "enterprise"
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
      config_status: ["attempted", "success", "failed"],
      currency: ["KRW", "USD", "JPY"],
      event_type: ["product_view", "product_visit", "profile_view"],
      execution_status: ["never_run", "running", "success", "failed"],
      install_status: ["attempted", "success", "failed"],
      notification_type: ["follow", "review", "reply"],
      payment_method: ["card", "kakaopay", "paypal", "paypay"],
      payment_provider: [
        "toss",
        "iamport",
        "kakaopay",
        "lemonsqueezy",
        "paypal",
        "paypay",
      ],
      payment_status: ["pending", "success", "failed", "canceled", "refunded"],
      region: ["korea", "global", "japan"],
      role: ["developer", "designer", "marketer", "founder", "product-manager"],
      subscription_status: [
        "incomplete",
        "incomplete_expired",
        "trialing",
        "active",
        "past_due",
        "canceled",
        "unpaid",
        "paused",
      ],
      subscription_tier: ["free", "pro", "enterprise"],
    },
  },
} as const
