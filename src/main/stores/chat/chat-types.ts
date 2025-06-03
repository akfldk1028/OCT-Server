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
}