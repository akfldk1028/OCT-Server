// main/stores/mcp/mcpRegistry-types.ts
import {
  Prompt,
  Resource,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';

export interface MCPServer {
  id: string;
  name: string;
  description?: string;
  clientId: string;
  transportType: 'stdio' | 'sse' | 'streamable-http';
  command?: string;
  args?: string[];
  env?: Record<string, string>;
  url?: string;
  headers?: Record<string, string>;
  autoConnect?: boolean;
  useProxy?: boolean;
  proxyPort?: number;
  originalUrl?: string;
  capabilities: {
    tools?: boolean;
    prompts?: boolean;
    resources?: boolean;
  };
  status: 'connected' | 'disconnected' | 'error';
}

export interface RegisteredTool extends Tool {
  serverId: string;
  serverName: string;
  category?: string;
  usage?: {
    count: number;
    lastUsed?: string;
    averageLatency?: number;
  };
}

export interface RegisteredPrompt extends Prompt {
  serverId: string;
  serverName: string;
  category?: string;
}

export interface RegisteredResource extends Resource {
  serverId: string;
  serverName: string;
}

export interface MCPRegistryState {
  // Servers - Map을 Record로 변경
  servers: Record<string, MCPServer>;

  // Registry - Map을 Record로 변경
  tools: Record<string, RegisteredTool>;
  prompts: Record<string, RegisteredPrompt>;
  resources: Record<string, RegisteredResource>;

  // Categories - Set을 배열로 변경
  toolCategories: string[];
  promptCategories: string[];

  // Actions - Server Management
  registerServer: (server: MCPServer) => boolean;
  unregisterServer: (serverId: string) => void;
  updateServerStatus: (serverId: string, status: MCPServer['status']) => void;
  initializeDefaultServers: () => void;

  // Actions - Discovery
  discoverServerCapabilities: (serverId: string) => Promise<{
    tools: RegisteredTool[];
    prompts: RegisteredPrompt[];
    resources: RegisteredResource[];
  }>;

  // Actions - Tool Management
  refreshTools: (serverId: string) => Promise<void>;
  executeTool: (toolName: string, args: any) => Promise<any>;
  getToolsByCategory: (category: string) => RegisteredTool[];
  searchTools: (query: string) => RegisteredTool[];
  getServerTools: (serverId: string) => RegisteredTool[];

  // Actions - Prompt Management
  refreshPrompts: (serverId: string) => Promise<void>;
  getPromptsByCategory: (category: string) => RegisteredPrompt[];
  getPrompt: (promptName: string, args?: any) => Promise<string>;

  // Actions - Resource Management
  refreshResources: (serverId: string) => Promise<void>;
  readResource: (resourceUri: string) => Promise<any>;

  // Actions - Bulk Operations
  refreshAllServers: () => Promise<void>;

  // Utilities
  getServer: (serverId: string) => MCPServer | undefined;
  getTool: (toolName: string) => RegisteredTool | undefined;
  getPromptInfo: (promptName: string) => RegisteredPrompt | undefined;
  getResource: (resourceUri: string) => RegisteredResource | undefined;

  // Statistics - Map 반환 타입도 Record로 변경
  getToolUsageStats: () => Record<string, { count: number; averageLatency: number }>;
}
