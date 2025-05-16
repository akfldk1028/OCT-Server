import {
  CreateMessageResult,
  Resource,
  ResourceTemplate,
  Root,
  ServerNotification,
  Tool,
  CompatibilityCallToolResult
} from "@modelcontextprotocol/sdk/types.js";
import { PendingRequest } from "./common/components/SamplingTab";
import { StdErrNotification } from "./lib/notificationTypes";
import { InspectorConfig } from "./lib/configurationTypes";

// 앱 전체의 중앙 상태와 관련된 타입
export interface AppState {
  resources: Resource[];
  resourceTemplates: ResourceTemplate[];
  resourceContent: string;
  prompts: any[]; // Prompt 타입을 별도로 가져와야 함
  promptContent: string;
  tools: Tool[];
  toolResult: CompatibilityCallToolResult | null;
  errors: Record<string, string | null>;
}

// 연결 설정과 관련된 타입
export interface ConnectionConfig {
  transportType: "stdio" | "sse" | "streamable-http";
  command: string;
  args: string;
  sseUrl: string;
  bearerToken: string;
  headerName: string;
  env: Record<string, string>;
  config: InspectorConfig;
}

// 샘플링 요청 확장 타입
export interface ExtendedPendingRequest extends PendingRequest {
  id: number;
  resolve: (result: CreateMessageResult) => void;
  reject: (error: Error) => void;
}

// 커서 상태 관련 타입
export interface CursorState {
  nextResourceCursor?: string;
  nextResourceTemplateCursor?: string;
  nextPromptCursor?: string;
  nextToolCursor?: string;
}

// 알림 관련 타입
export interface NotificationState {
  notifications: ServerNotification[];
  stdErrNotifications: StdErrNotification[];
}

// 클라이언트 정보를 나타내는 타입
export interface ClientRow {
  client_id: number;
  name: string;
  tagline: string;
  description: string;
  how_it_works: string;
  icon: string;
  url: string;
  stats: {
    views: number;
    reviews: number;
    upvotes: number;
  };
  promoted_from: string | null;
  promoted_to: string | null;
  created_at: string;
  updated_at: string;
}

// MCP 서버/Express 서버 등 다양한 서버 정보를 포괄하는 타입 정의

export interface GithubInfo {
  url: string;
  repo: string;
  forks: number;
  owner: string;
  stars: number;
  topics: string[];
  license: string;
  language: string;
  folderPath: string;
  description: string;
  lastUpdated: string;
  readmeContent: string;
  ownerAvatarUrl: string;
}

export interface ServerConfig {
  // 공통
  command?: string;
  args?: string[];
  port?: number;
  env?: Record<string, string>;
  // MCP 서버 상세
  id?: number | string;
  name?: string;
  unique_id?: string;
  description?: string;
  server_type?: string;
  primary_url?: string;
  github_info?: GithubInfo;
  repo_name?: string;
  owner?: string;
  stars?: number;
  github_url?: string;
  created_at?: string;
  updated_at?: string;
  analysis_result?: any;
  forks?: number;
  last_updated?: string;
  fallback_avatar_color?: string | null;
  fallback_avatar_initials?: string | null;
  local_image_path?: string;
  installation?: any;
  mcp_config?: any;
  analysis_title?: string;
  analyzed_name?: string;
  analyzed_description?: string;
  version?: string | null;
  license?: string;
  supported_platforms?: string[];
  supported_languages?: string[];
  tags?: string[];
  categories?: string[];
  is_official?: boolean | string;
  is_community?: boolean | string;
  is_featured?: boolean | string;
  is_remote_available?: boolean | string;
  detected_tools?: any[];
  config_options?: any[];
  usage_instructions?: string;
  runtime_config_notes?: string;
  metadata_map?: Record<string, any>;
  metadata?: any[];
  is_test?: boolean;
  is_zero_install?: boolean;
  type?: string;
  execution?: any;
  host?: string;
  isInstalled?: boolean;
  isRunning?: boolean;
  transportType?: string;
  // 기타 확장 필드
  [key: string]: any;
}

export interface ServerItem {
  id: string;
  name: string;
  serverType: string;
  status: 'running' | 'stopped' | 'error' | string;
  online: boolean;
  config: ServerConfig;
}

export interface AllServersResponse {
  allServers: ServerItem[];
  defaultEnvironment: Record<string, string>;
  defaultCommand: string;
  defaultArgs: string;
}




export interface ServiceConfig {
  client_id: number;
  name: string;
  tagline: string;
  description: string;
  how_it_works: string;
  icon: string;
  url: string;
  stats: {
    views: number;
    reviews: number;
    upvotes: number;
  };
  promoted_from: string | null;
  promoted_to: string | null;
  created_at: string;
  updated_at: string;
}



export interface ServiceItem {
  config: ServiceConfig;
}