// main/stores/orchestrator/agent-types.ts

// === 🎭 Agent 페르소나 정의 ===
export interface AgentPersona {
  id: string;
  name: string;
  description: string;
  systemPrompt: string;
  defaultModel: string; // OpenRouter 모델 ID
  preferredTools: string[]; // MCP 도구명들
  color: string; // UI에서 표시할 색상
}

// === 🤖 Agent 인스턴스 ===
export interface AgentInstance {
  id: string; // sessionId와 동일
  personaId: string;
  name: string;
  sessionId: string; // 기존 session 시스템 활용
  roomId: string; // 기존 room 시스템 활용
  model: string;
  status: 'active' | 'idle' | 'error';
  createdAt: string;
  connectedMCPServers: string[];
  messageCount: number;
  lastActivity: string;
}

// === 💬 Agent 메시지 ===
export interface AgentMessage {
  id: string;
  fromAgentId: string;
  content: string;
  timestamp: string;
  conversationId: string;
}

// === 🗣️ Multi-Agent 대화 ===
export interface AgentConversation {
  id: string;
  name: string;
  agentIds: string[];
  messages: AgentMessage[];
  status: 'active' | 'completed' | 'paused';
  createdAt: string;
  lastActivity: string;
}

// === 🔄 워크플로우 (미래 확장용) ===
export interface MastraWorkflow {
  id: string;
  name: string;
  description: string;
  steps: WorkflowStep[];
  requiredAgents: string[];
}

export interface WorkflowStep {
  id: string;
  name: string;
  agentId?: string;
  action: string;
  inputs: Record<string, any>;
  outputs: Record<string, any>;
}

// === 🤝 협력 작업 관련 타입 ===
export interface CollaborationOptions {
  maxRounds?: number;
  autoMode?: boolean;
  coordinator?: string;
}

export interface CollaborationResult {
  conversationId: string;
  agentIds: string[];
}

export interface CollaborationStatus {
  conversationId: string;
  totalMessages: number;
  participants: Array<{
    agentId: string;
    name: string;
    persona: string;
    messageCount: number;
    lastMessage?: string;
  }>;
  status: string;
  lastActivity: string;
}

// === 📊 Agent Store 상태 ===
export interface AgentState {
  // 상태
  personas: AgentPersona[];
  activeAgents: Record<string, AgentInstance>;
  conversations: Record<string, AgentConversation>;

  // 페르소나 관리
  addPersona: (persona: AgentPersona) => void;
  updatePersona: (id: string, updates: Partial<AgentPersona>) => void;
  removePersona: (id: string) => void;
  getPersona: (id: string) => AgentPersona | undefined;

  // Agent 관리 (기존 시스템 활용)
  createAgent: (personaId: string, options?: {
    name?: string;
    model?: string;
    initialPrompt?: string;
    mcpServers?: string[];
  }) => Promise<string>;
  removeAgent: (agentId: string) => Promise<void>;
  getAgent: (agentId: string) => AgentInstance | undefined;

  // 메시지 (기존 chatStore 활용)
  sendMessageToAgent: (agentId: string, content: string, options?: {
    tags?: any[];
    expectResponse?: boolean;
  }) => Promise<string>;
  getAgentMessages: (agentId: string) => any[];

  // Multi-Agent 대화
  createConversation: (agentIds: string[], name?: string) => Promise<string>;
  sendMessageToConversation: (conversationId: string, fromAgentId: string, content: string) => Promise<string>;
  getConversation: (conversationId: string) => AgentConversation | undefined;

  // === 🤝 협력 워크플로우 메서드들 추가 ===
  startCollaborativeTask: (
    taskDescription: string, 
    participantPersonas: string[], 
    options?: CollaborationOptions
  ) => Promise<CollaborationResult>;
  
  runAutomaticCollaboration: (
    conversationId: string, 
    agentIds: string[], 
    taskDescription: string, 
    maxRounds: number
  ) => Promise<void>;
  
  generateContextualPrompt: (
    persona: AgentPersona, 
    taskDescription: string, 
    round: number
  ) => string;
  
  getCollaborationStatus: (conversationId: string) => CollaborationStatus | null;
  
  summarizeCollaboration: (conversationId: string) => Promise<string>;

  // === 🔗 초기화 메서드 ===
  initializeMastraBridge: (config: any) => Promise<boolean>;

  // MCP 연동 (기존 시스템 활용)
  connectMCPToAgent: (agentId: string, serverId: string) => Promise<void>;
  disconnectMCPFromAgent: (agentId: string, serverId: string) => Promise<void>;

  // 상태 조회
  getStatus: () => {
    agents: {
      total: number;
      active: number;
      list: Array<{
        id: string;
        name: string;
        persona: string;
        messageCount: number;
        lastActivity: string;
      }>;
    };
    conversations: {
      total: number;
      active: number;
    };
    personas: {
      total: number;
      available: Array<{ id: string; name: string }>;
    };
  };
} 