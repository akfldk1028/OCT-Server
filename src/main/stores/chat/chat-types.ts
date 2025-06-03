import { ToolCall } from "../openrouter/openrouter-type";

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
  sendStreamingMessage: (payload: { sessionId: string; content: string }) => Promise<string | void>;
  clearSession: (payload: { sessionId: string }) => void;
  updateConfig: (payload: { sessionId: string; config: Partial<ChatConfig> }) => void;
  handleToolCalls: (payload: { sessionId: string; toolCalls: ToolCall[] }) => Promise<void>;
  getMessages: (sessionId: string) => ChatMessage[];
  getConfig: (sessionId: string) => ChatConfig | undefined;
}