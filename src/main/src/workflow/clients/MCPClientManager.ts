// ===== MCP 클라이언트 통합 관리자 =====
// main/workflow/clients/MCPClientManager.ts

import { IMCPClient, MCPServerConfig, MCPConnectionResult, MCPConnectionStatus } from './IMCPClient';
import { ClaudeDesktopClient } from './ClaudeDesktopClient';
import { OpenAIAPIClient } from './OpenAIAPIClient';
import { VSCodeExtensionClient } from './VSCodeExtensionClient';

export type ClientType = 'claude-desktop' | 'openai-api' | 'vscode-extension' | 'cursor-extension';

export interface MCPClientManagerOptions {
  enabledClients?: ClientType[];
  autoDetectClients?: boolean;
  defaultClient?: ClientType;
}

export class MCPClientManager {
  private clients: Map<ClientType, IMCPClient> = new Map();
  private availableClients: Set<ClientType> = new Set();
  private defaultClient: ClientType;

  constructor(private options: MCPClientManagerOptions = {}) {
    this.defaultClient = options.defaultClient || 'claude-desktop';
    this.initializeClients();
  }

  /**
   * 모든 클라이언트 초기화
   */
  private async initializeClients(): Promise<void> {
    const enabledClients = this.options.enabledClients || [
      'claude-desktop',
      'openai-api',
      'vscode-extension'
    ];

    // 클라이언트 인스턴스 생성
    for (const clientType of enabledClients) {
      let client: IMCPClient | null = null;

      switch (clientType) {
        case 'claude-desktop':
          client = new ClaudeDesktopClient();
          break;
        case 'openai-api':
          client = new OpenAIAPIClient();
          break;
        case 'vscode-extension':
          client = new VSCodeExtensionClient();
          break;
        // 향후 확장: Cursor, JetBrains 등
        default:
          console.warn(`지원하지 않는 클라이언트: ${clientType}`);
          continue;
      }

      if (client) {
        this.clients.set(clientType, client);

        // 자동 감지가 활성화된 경우 사용 가능 여부 확인
        if (this.options.autoDetectClients !== false) {
          if (await client.isAvailable()) {
            await client.initialize();
            this.availableClients.add(clientType);
            console.log(`✅ ${clientType} 클라이언트 사용 가능`);
          } else {
            console.log(`⚠️ ${clientType} 클라이언트 사용 불가`);
          }
        } else {
          // 자동 감지 비활성화된 경우 모든 클라이언트 초기화 시도
          try {
            await client.initialize();
            this.availableClients.add(clientType);
          } catch (error) {
            console.warn(`${clientType} 초기화 실패:`, error);
          }
        }
      }
    }
  }

  /**
   * 🔥 단일 서버를 모든 사용 가능한 클라이언트에 연결
   */
  async connectServerToAllClients(serverConfig: MCPServerConfig): Promise<MCPConnectionResult[]> {
    const results: MCPConnectionResult[] = [];

    for (const clientType of this.availableClients) {
      const client = this.clients.get(clientType);
      if (client) {
        try {
          const result = await client.connectServer(serverConfig);
          results.push({
            ...result,
            message: `[${clientType}] ${result.message}`
          });
        } catch (error) {
          results.push({
            success: false,
            message: `[${clientType}] 연결 실패: ${error}`,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }
    }

    return results;
  }

  /**
   * 🔥 단일 서버를 특정 클라이언트에 연결
   */
  async connectServerToClient(
    serverConfig: MCPServerConfig,
    clientType: ClientType
  ): Promise<MCPConnectionResult> {
    const client = this.clients.get(clientType);

    if (!client) {
      return {
        success: false,
        message: `❌ 클라이언트 ${clientType}를 찾을 수 없습니다`,
        error: 'Client not found'
      };
    }

    if (!this.availableClients.has(clientType)) {
      return {
        success: false,
        message: `❌ 클라이언트 ${clientType}가 사용 불가능합니다`,
        error: 'Client not available'
      };
    }

    return client.connectServer(serverConfig);
  }

  /**
   * 🔥 여러 서버를 병렬로 연결
   */
  async connectMultipleServers(
    serverConfigs: MCPServerConfig[],
    clientType?: ClientType
  ): Promise<MCPConnectionResult[]> {
    const promises = serverConfigs.map(config => {
      if (clientType) {
        return this.connectServerToClient(config, clientType);
      } else {
        return this.connectServerToAllClients(config);
      }
    });

    const results = await Promise.all(promises);
    return results.flat();
  }

  /**
   * 서버 연결 해제
   */
  async disconnectServer(serverName: string, clientType?: ClientType): Promise<boolean[]> {
    const results: boolean[] = [];

    if (clientType) {
      const client = this.clients.get(clientType);
      if (client) {
        results.push(await client.disconnectServer(serverName));
      }
    } else {
      // 모든 클라이언트에서 해제
      for (const client of this.clients.values()) {
        results.push(await client.disconnectServer(serverName));
      }
    }

    return results;
  }

  /**
   * 특정 서버의 모든 클라이언트 연결 상태
   */
  getServerStatusAcrossClients(serverName: string): MCPConnectionStatus[] {
    const statuses: MCPConnectionStatus[] = [];

    for (const client of this.clients.values()) {
      const status = client.getServerStatus(serverName);
      if (status) {
        statuses.push(status);
      }
    }

    return statuses;
  }

  /**
   * 모든 클라이언트의 연결된 서버 목록
   */
  getAllConnectedServers(): Record<ClientType, MCPConnectionStatus[]> {
    const result: Record<string, MCPConnectionStatus[]> = {};

    for (const [clientType, client] of this.clients.entries()) {
      result[clientType] = client.getConnectedServers();
    }

    return result as Record<ClientType, MCPConnectionStatus[]>;
  }

  /**
   * 사용 가능한 클라이언트 목록
   */
  getAvailableClients(): ClientType[] {
    return Array.from(this.availableClients);
  }

  /**
   * 특정 클라이언트 인스턴스 반환
   */
  getClient(clientType: ClientType): IMCPClient | undefined {
    return this.clients.get(clientType);
  }

  /**
   * 기본 클라이언트 설정
   */
  setDefaultClient(clientType: ClientType): void {
    if (this.availableClients.has(clientType)) {
      this.defaultClient = clientType;
    } else {
      throw new Error(`클라이언트 ${clientType}가 사용 불가능합니다`);
    }
  }

  /**
   * 기본 클라이언트 반환
   */
  getDefaultClient(): ClientType {
    return this.defaultClient;
  }

  /**
   * 🔥 전체 연결 상태 요약
   */
  getConnectionSummary(): {
    totalServers: number;
    connectedClients: number;
    totalConnections: number;
    clientStats: Record<ClientType, { connected: number; total: number }>;
  } {
    const allConnections = this.getAllConnectedServers();
    let totalConnections = 0;
    const clientStats: Record<string, { connected: number; total: number }> = {};

    for (const [clientType, connections] of Object.entries(allConnections)) {
      const connected = connections.filter(c => c.connected).length;
      const total = connections.length;

      clientStats[clientType] = { connected, total };
      totalConnections += connected;
    }

    // 고유 서버 이름 수 계산
    const allServerNames = new Set<string>();
    for (const connections of Object.values(allConnections)) {
      for (const conn of connections) {
        allServerNames.add(conn.serverName);
      }
    }

    return {
      totalServers: allServerNames.size,
      connectedClients: this.availableClients.size,
      totalConnections,
      clientStats: clientStats as Record<ClientType, { connected: number; total: number }>
    };
  }
}
