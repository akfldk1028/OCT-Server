// ===== MCP 클라이언트 인터페이스 =====
// main/workflow/clients/IMCPClient.ts

export interface MCPServerConfig {
  name: string;
  command: string;
  args: string[];
  env?: Record<string, string>;
  cwd?: string;
}

export interface MCPConnectionStatus {
  serverName: string;
  clientType: string;
  connected: boolean;
  lastConnected?: Date;
  error?: string;
  capabilities?: string[];
}

export interface MCPConnectionResult {
  success: boolean;
  message: string;
  connectionId?: string;
  error?: string;
}

/**
 * MCP 클라이언트의 공통 인터페이스
 * 각 클라이언트(Claude Desktop, OpenAI API, VSCode 등)는 이 인터페이스를 구현
 */
export abstract class IMCPClient {
  protected clientType: string;
  protected connections: Map<string, MCPConnectionStatus> = new Map();

  constructor(clientType: string) {
    this.clientType = clientType;
  }

  /**
   * MCP 서버를 클라이언트에 연결
   */
  abstract connectServer(serverConfig: MCPServerConfig): Promise<MCPConnectionResult>;

  /**
   * MCP 서버 연결 해제
   */
  abstract disconnectServer(serverName: string): Promise<boolean>;

  /**
   * 서버 연결 상태 확인
   */
  isServerConnected(serverName: string): boolean {
    const status = this.connections.get(serverName);
    return status?.connected ?? false;
  }

  /**
   * 모든 연결된 서버 목록
   */
  getConnectedServers(): MCPConnectionStatus[] {
    return Array.from(this.connections.values()).filter(conn => conn.connected);
  }

  /**
   * 특정 서버의 연결 상태
   */
  getServerStatus(serverName: string): MCPConnectionStatus | undefined {
    return this.connections.get(serverName);
  }

  /**
   * 클라이언트 타입 반환
   */
  getClientType(): string {
    return this.clientType;
  }

  /**
   * 클라이언트가 사용 가능한지 확인
   */
  abstract isAvailable(): Promise<boolean>;

  /**
   * 클라이언트 초기화/설정
   */
  abstract initialize(): Promise<boolean>;

  /**
   * 연결 상태 업데이트
   */
  protected updateConnectionStatus(serverName: string, status: Partial<MCPConnectionStatus>): void {
    const existing = this.connections.get(serverName) || {
      serverName,
      clientType: this.clientType,
      connected: false
    };

    this.connections.set(serverName, {
      ...existing,
      ...status,
      serverName,
      clientType: this.clientType
    });
  }
}



