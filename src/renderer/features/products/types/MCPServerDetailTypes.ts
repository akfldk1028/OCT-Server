import { Database } from "../../../supa-client";

// enhanced_info, install_methods, config_options의 상세 타입 정의
export type EnhancedInfo = {
  description_en: string | null;
  description_ja: string | null;
  description_ko: string | null;
  is_safety_verified: boolean | null;
  safety_check_at: string | null;
  safety_issues: any | null; // 실제 타입이 있다면 any 대신 구체적인 타입으로
  recommended_method: string | null;
} | null;

export type InstallMethod = {
  id: number;
  description: string | null;
  command: string | null;
  args: any | null; // 실제 타입이 있다면 any 대신 구체적인 타입으로
  env: any | null; // 실제 타입이 있다면 any 대신 구체적인 타입으로
  is_multi_command: boolean | null;
  multi_command: any | null; // 실제 타입이 있다면 any 대신 구체적인 타입으로
  is_zero_install: boolean | null;
  created_at: string;
  updated_at: string;
};

export type ConfigOption = {
  id: number;
  config_name: string | null;
  platform: string | null;
  command: string | null;
  args: any | null; // 실제 타입이 있다면 any 대신 구체적인 타입으로
  env: any | null; // 실제 타입이 있다면 any 대신 구체적인 타입으로
  is_recommended: boolean | null;
  created_at: string;
  updated_at: string;
};

// 기존 Database 타입의 Row를 가져와서 특정 필드만 오버라이드
type BaseMCPServerDetailView = Database["public"]["Views"]["mcp_server_detail_view"]["Row"];

export interface MCPServerDetailView extends Omit<BaseMCPServerDetailView, 'enhanced_info' | 'install_methods' | 'config_options'> {
  enhanced_info: EnhancedInfo;
  install_methods: InstallMethod[] | null; // Json이 배열을 나타낸다고 가정
  config_options: ConfigOption[] | null;  // Json이 배열을 나타낸다고 가정
}

// 로더 데이터 타입 정의도 여기에 포함 (재사용 가능)
export type ProductDetailLoaderData = {
  product: MCPServerDetailView;
}; 