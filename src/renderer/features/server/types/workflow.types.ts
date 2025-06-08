import type { InstalledServer } from './server-types';

// 🔥 워크플로우 실행 설정
export interface WorkflowExecutionConfig {
  workflowData: any; // 워크플로우 JSON 데이터
  selectedServers: InstalledServer[];
  onProgress?: (progress: number) => void;
  onComplete?: (results: WorkflowExecutionResult[]) => void;
  onError?: (error: Error) => void;
}

// 🔥 MCP 서버 설정 정보
export interface MCPServerConfig {
  command: string;
  args: string[];
  env?: Record<string, string>;
  platform?: string;
  isRecommended: boolean;
  configType: string;
  selectionReason: string;
}

// 🔥 워크플로우 실행 결과
export interface WorkflowExecutionResult {
  serverId: string;
  serverName: string;
  success: boolean;
  message: string;
  config: MCPServerConfig;
  error?: string;
  timestamp: string;
}

// 🔥 워크플로우 실행 상태
export interface WorkflowExecutionState {
  isExecuting: boolean;
  progress: number;
  currentStep: string;
  results: WorkflowExecutionResult[];
  error?: string;
}

// 🔥 MCP 서버 등록 요청
export interface MCPServerRegistrationRequest {
  id: string;
  name: string;
  description: string;
  clientId: string;
  transportType: 'stdio' | 'sse' | 'streamable-http';
  command: string;
  args: string[];
  env?: Record<string, string>;
  url?: string;
  autoConnect: boolean;
  capabilities: {
    tools: boolean;
    prompts: boolean;
    resources: boolean;
  };
  status: 'connected' | 'disconnected' | 'error';
} 