import type { Database } from '../../../database.types';

// 클라이언트 타입 정의 (기존 ClientRow 대신 사용)
export type ClientType = Database['public']['Tables']['clients']['Row'];

// 🔥 설치된 서버 타입: user_mcp_usage 테이블 Row에 관계 테이블과 설정들 포함
export type InstalledServer = Database['public']['Tables']['user_mcp_usage']['Row'] & {
  mcp_install_methods: Database['public']['Tables']['mcp_install_methods']['Row'][] | Database['public']['Tables']['mcp_install_methods']['Row'] | null;
  mcp_servers: Database['public']['Tables']['mcp_servers']['Row'] | null;
  mcp_configs?: Database['public']['Tables']['mcp_configs']['Row'][]; // 🔥 해당 서버의 설정들
};

// OutletContext 타입 정의
export type ServerLayoutContext = {
  isLoggedIn: boolean;
  userId?: string; // 🔥 상위에서 전달받은 사용자 ID
  servers: InstalledServer[]; // 🔥 실제 DB에서 조회한 설치된 서버들 (타입 지정)
  clients: ClientType[];
  isLoadingServers?: boolean; // 🔥 서버 로딩 상태
};

// 서버 노드용 데이터 타입 (React Flow용)
export type ServerNodeData = {
  id: string | number;
  type: 'server';
  data: InstalledServer;
  position?: { x: number; y: number };
  measured?: { width: number; height: number };
  selected?: boolean;
};

// 서비스 노드용 데이터 타입 (React Flow용) 
export type ServiceNodeData = {
  id: string | number;
  type: 'service';
  data: {
    config: ClientType;
  };
  position?: { x: number; y: number };
  measured?: { width: number; height: number };
  selected?: boolean;
};

// 트리거 노드용 데이터 타입 (React Flow용)
export type TriggerNodeData = {
  id: string | number;
  type: 'trigger';
  data: {
    label: string;
    onTrigger?: () => void;
    onExtractJson?: (json: any) => void;
  };
  position?: { x: number; y: number };
  measured?: { width: number; height: number };
  selected?: boolean;
};

// 모든 노드 타입의 유니언
export type FlowNodeData = ServerNodeData | ServiceNodeData | TriggerNodeData;

// Workflow 관련 타입들 (workflow-types.ts와 동일)
export interface NodeExecutionResult {
  status: 'pending' | 'running' | 'success' | 'error' | 'skipped';
  startedAt?: string;
  completedAt?: string;
  result?: any;
  error?: string;
  duration?: number;
}

export interface WorkflowExecution {
  id: string;
  workflowId: string;
  name: string;
  status: 'idle' | 'running' | 'completed' | 'failed' | 'cancelled';
  startedAt: string;
  completedAt?: string;
  error?: string;
  currentNodeId?: string;
  progress: number; // 0-100
  
  // 실행 컨텍스트 (직렬화 가능한 Record)
  context: Record<string, any>;
  
  // 노드별 실행 결과
  nodeResults: Record<string, NodeExecutionResult>;
  
  // 워크플로우 데이터
  nodes: any[];
  edges: any[];
}

export interface SavedWorkflow {
  id: string;
  name: string;
  description?: string;
  version: string;
  createdAt: string;
  updatedAt: string;
  author?: string;
  tags?: string[];
  nodes: any[];
  edges: any[];
  settings?: {
    autoStart?: boolean;
    maxRetries?: number;
    timeout?: number;
  };
}

export interface WorkflowState {
  // 실행 중인 워크플로우들 (Record 사용)
  executions: Record<string, WorkflowExecution>;
  
  // 저장된 워크플로우들
  workflows: Record<string, SavedWorkflow>;
  
  // 현재 활성 실행 ID들 (여러 개 동시 실행 가능)
  activeExecutionIds: string[];
  
  // 로딩 상태
  loading: boolean;
  error?: string;
} 