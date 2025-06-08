import { ToolCall } from "../openrouter/openrouter-type";

export interface Tag {
  type: 'tool' | 'prompt' | 'resource';
  name: string;
  description?: string;
  inputSchema?: any;
}

// common/types/chat-types.ts
export interface ChatMessage {
  id: string;
  sessionId: string; // 어느 세션의 메시지인지
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  timestamp: string;
  metadata?: {
    model?: string;
    duration?: number;
    tokens?: number;
    toolName?: string;
    toolCallId?: string;
    // 🔥 새로운 속성들 추가
    type?: string;
    isCooperative?: boolean;
    avatar?: string;
    connectedServers?: string[];
    isSystemMessage?: boolean;
  };
}

export interface ChatConfig {
  model: string;
  temperature: number;
  maxTokens?: number;
  activeTools: string[];
}

export interface ChatState {
  messages: Record<string, ChatMessage[]>;
  configs: Record<string, ChatConfig>;
  streamingMessages: Record<string, string>;

  initializeSession: (payload: { sessionId: string; config?: Partial<ChatConfig> }) => void;
  sendMessage: (payload: { sessionId: string; content: string }) => Promise<void>;
  sendStreamingMessage: (payload: { sessionId: string; content: string; selectedTags?: Tag[] }) => Promise<string | void>;
  clearSession: (payload: { sessionId: string }) => void;
  updateConfig: (payload: { sessionId: string; config: Partial<ChatConfig> }) => void;
  handleToolCalls: (payload: { sessionId: string; toolCalls: ToolCall[] }) => Promise<void>;
  
  // 🔧 헬퍼 메서드들 (리팩토링으로 추가됨)
  processSelectedTags: (sessionId: string, selectedTags: Tag[]) => Promise<{
    tools: any[] | undefined;
    systemPrompts: string;
    resourceContents: string;
  }>;
  prepareAIMessages: (sessionId: string, systemPrompts: string, resourceContents: string) => any[];
  reconstructToolCalls: (allToolCalls: any[]) => any[];
  executeMCPTools: (sessionId: string, toolCalls: any[]) => Promise<string>;

  
  getMessages: (sessionId: string) => ChatMessage[];
  getConfig: (sessionId: string) => ChatConfig | undefined;
  
  // 🔥 SDK 스타일 메서드들 추가
  connectMCPServers: (sessionId: string, serverConfigs?: any[]) => Promise<{
    total: number;
    successful: number;
    failed: number;
    alreadyConnected: number;
    results: any[];
  }>;
  sendMessageWithAutoMCP: (payload: { sessionId: string; content: string; selectedTags?: Tag[] }) => Promise<string | void>;
  sendOverlayMessage: (payload: { 
    sessionId: string; 
    content: string; 
    selectedTags?: Tag[];
    triggerOverlay?: boolean;
  }) => Promise<string | void>;
  notifyNewToolsAdded: (payload: { 
    sessionId: string; 
    connectedServers: string[];
    message?: string;
  }) => Promise<void>;
  addMessage: (payload: { 
    sessionId: string; 
    message: Omit<ChatMessage, 'sessionId'>;
  }) => void;
}