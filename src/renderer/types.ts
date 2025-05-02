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
