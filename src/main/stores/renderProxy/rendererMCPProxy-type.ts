export interface MCPProxyState {
  // 상태 (캐시)
  servers: Map<string, any>;
  tools: Map<string, any>;

  // Actions - Transport
  createTransport: (serverId: string, config: any) => Promise<string>;
  closeTransport: (transportId: string) => Promise<void>;

  // Actions - Client
  createClient: (sessionId: string, name: string, capabilities?: any) => Promise<string>;
  connectClient: (clientId: string, transportId: string) => Promise<void>;
  sendRequest: (clientId: string, request: any, schema: any) => Promise<any>;

  // Actions - Registry
  registerServer: (server: any) => Promise<void>;
  refreshTools: (serverId: string) => Promise<any[]>;
  executeTool: (toolName: string, args: any) => Promise<any>;

  // Actions - Room/Session
  createRoom: (name: string) => Promise<string>;
  createSession: (roomId: string) => Promise<string>;

  // Integrated Actions
  connectMCPServer: (config: any) => Promise<any>;
  getStatus: () => Promise<any>;
}