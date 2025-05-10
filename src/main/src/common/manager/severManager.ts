import { ExecutionConfig, InstallationConfig, MCPServerExtended } from '../types/server-config';

// 임시 타입 정의
interface ServerStatus {
  name: string;
  status?: string;
  online: boolean;
  pingMs?: number;
}

interface BaseMCPServer {
  name: string;
  status: string;
  config: any;
  start(): Promise<void>;
  stop(): Promise<void>;
  checkStatus(): Promise<ServerStatus>;
}

interface ServerInstallationMethod {
  type: string;
  command?: string;
  args?: string[];
}

export class ServerManager {
  private servers: Map<string, BaseMCPServer>;

  constructor(serverList: BaseMCPServer[]) {
    this.servers = new Map(serverList.map((s) => [s.name, s]));
  }
  // Claude Desktop 연결 전용 메서드 (새로 추가)
  // async connectToClaudeDesktop(serverName: string): Promise<boolean> {
  //   try {
  //     // 서버 찾기
  //     const server = this.getServer(serverName);
  //     if (!server) {
  //       console.error(`[ServerManager] 서버 '${serverName}'를 찾을 수 없습니다.`);
  //       return false;
  //     }

  //     // 서버가 실행 중인지 확인
  //     if (server.status !== 'running') {
  //       console.warn(`[ServerManager] 서버 '${serverName}'가 실행 중이 아닙니다. 먼저 서버를 시작하세요.`);
  //       return false;
  //     }

  //     // 서버 설정 준비
  //     const serverConfig = {
  //       name: server.name,
  //       execution: {
  //         command: server.config.command,
  //         args: Array.isArray(server.config.args) ? server.config.args : [server.config.args],
  //         env: server.config.env || {}
  //       }
  //     };

  //     // Claude Desktop에 연결
  //     const claudeDesktop = new ClaudeDesktopIntegration();
  //     const connected = claudeDesktop.connectServer(serverName, serverConfig);
      
  //     if (connected) {
  //       console.log(`[ServerManager] 서버 '${serverName}'가 Claude Desktop에 연결되었습니다.`);
  //       return true;
  //     } else {
  //       console.error(`[ServerManager] 서버 '${serverName}'를 Claude Desktop에 연결하지 못했습니다.`);
  //       return false;
  //     }
  //   } catch (error) {
  //     console.error(`[ServerManager] Claude Desktop 연결 오류:`, error);
  //     return false;
  //   }
  // }

  // // Claude Desktop 연결 해제 메서드 (새로 추가)
  // async disconnectFromClaudeDesktop(serverName: string): Promise<boolean> {
  //   try {
  //     const claudeDesktop = new ClaudeDesktopIntegration();
  //     const disconnected = claudeDesktop.disconnectServer(serverName);
      
  //     if (disconnected) {
  //       console.log(`[ServerManager] 서버 '${serverName}'가 Claude Desktop에서 연결 해제되었습니다.`);
  //       return true;
  //     } else {
  //       console.error(`[ServerManager] 서버 '${serverName}'를 Claude Desktop에서 연결 해제하지 못했습니다.`);
  //       return false;
  //     }
  //   } catch (error) {
  //     console.error(`[ServerManager] Claude Desktop 연결 해제 오류:`, error);
  //     return false;
  //   }
  // }

  // // Claude Desktop 연결 상태 확인 메서드 (새로 추가)
  // isConnectedToClaudeDesktop(serverName: string): boolean {
  //   try {
  //     const claudeDesktop = new ClaudeDesktopIntegration();
  //     return claudeDesktop.isServerConnected(serverName);
  //   } catch (error) {
  //     console.error(`[ServerManager] Claude Desktop 연결 상태 확인 오류:`, error);
  //     return false;
  //   }
  // }



  getServer(name: string): BaseMCPServer | undefined {
    console.log("#####################################");
    console.log(this.servers);
    console.log("#####################################");

    return this.servers.get(name);
  }

  getAllServers(): BaseMCPServer[] {
    return Array.from(this.servers.values());
  }

  getStatus(): ServerStatus[] {
    return Array.from(this.servers.values()).map((srv) => ({
      name: srv.name,
      status: srv.status,
      online: srv.status === 'running',
      pingMs: srv.status === 'running' ? 0 : undefined,
    }));
  }

  async startServer(name: string): Promise<void> {
    const srv = this.servers.get(name);
    if (!srv) return;
    if (srv.status !== 'running') {
      await srv.start();
    }
  }

  async stopServer(name: string): Promise<void> {
    const srv = this.servers.get(name);
    if (!srv) return;
    if (srv.status === 'running') {
      await srv.stop();
    }
  }

  async updateStatuses(): Promise<ServerStatus[]> {
    const statuses: ServerStatus[] = [];
    // eslint-disable-next-line no-restricted-syntax
    for (const srv of this.servers.values()) {
      try {
        const stat = await srv.checkStatus();
        // also mirror it into srv.status if you like:
        srv.status = stat.online ? 'running' : 'stopped';
        statuses.push({ ...stat });
      } catch {
        srv.status = 'error';
        statuses.push({ name: srv.name, online: false });
      }
    }
    return statuses;
  }

  updateServerExecutionDetails(
    serverName: string,
    method: ServerInstallationMethod,
  ): void {
    const srv = this.servers.get(serverName);
    if (srv) {
      // JSON 설정에서 command/args를 가져와 MCPServer 인스턴스의 config를 업데이트
      const jsonCommand = method.command; // 예: 'uvx'
      const jsonArgs = method.args; // 예: ['mcp-server-qdrant', '--transport', 'sse']

      console.log(
        `[Manager] Updating execution details for ${serverName}: Command=${jsonCommand}, Args=${JSON.stringify(jsonArgs)}`,
      );

      // LocalMCPServer 또는 MCPServer의 config 객체 직접 수정
      srv.config.command = jsonCommand;
      srv.config.args = jsonArgs;

      // Docker나 다른 타입에 따라 필요한 환경변수 등도 여기서 업데이트 가능
      // 예: if (method.type === 'docker') { srv.config.port = config.port; ... }
    } else {
      console.error(
        `[Manager] Cannot update details: Server ${serverName} not found.`,
      );
    }
  }

  // MCP API 호출 전용 메서드
  // MCP API 호출 전용 메서드 수정
  async callMcpApi(config: any): Promise<boolean> {
    try {
      // Express 서버 확인 및 필요시 시작
      const expressServer = this.getServer('local-express-server');
      if (!expressServer || expressServer.status !== 'running') {
        await this.startServer('local-express-server');
      }
      
      // API 호출 구성
      const PORT = 4303; // Express 서버 포트
      const command = config.command || config.execution?.command || '';
      const args = config.args?.join(' ') || config.execution?.args?.join(' ') || '';
      
      // transportType을 'stdio'로 설정
      const transportType = 'stdio';
      
      const apiUrl = `http://localhost:${PORT}/stdio?transportType=${transportType}&command=${encodeURIComponent(command)}&args=${encodeURIComponent(args)}`;
      
      console.log(`[ServerManager] MCP API 호출: ${apiUrl}`);
      
      // API 호출
      const response = await fetch(apiUrl);
      
      if (response.ok) {
        console.log(`[ServerManager] MCP API 호출 성공`);
        
        const sessionId = response.headers.get('mcp-session-id'); // 이 부분을 수정/추가합니다.
      
        if (sessionId) {
          console.log(`[ServerManager] 직접 가져온 세션 ID: ${sessionId}`);
          // 필요하다면 여기서 sessionId를 사용하여 추가 작업을 수행할 수 있습니다.
          // 예: this.mcpSessionId = sessionId; 또는 config 객체에 저장 등
        } else {
          console.warn('[ServerManager] 응답 헤더에서 mcp-session-id를 찾을 수 없습니다.');
        }

        
        return true;
      } else {
        console.error(`[ServerManager] MCP API 호출 실패: ${response.status}`);
        return false;
      }
    } catch (error) {
      console.error(`[ServerManager] MCP API 호출 오류:`, error);
      return false;
    }
  }


  async getMcpSessionId(config: any): Promise<string | null> {
    try {
      // Express 서버가 실행 중인지 확인
      const expressServer = this.getServer('local-express-server');
      if (!expressServer || expressServer.status !== 'running') {
        console.error('[ServerManager] Express 서버가 실행되고 있지 않습니다');
        return null;
      }
      
      // 세션 ID 요청을 위한 API 호출 구성
      const PORT = 4303;
      
      // 먼저 stdio 전송 방식으로 시도해보기
      const transportType = 'stdio';
      const command = config.command || config.execution?.command || '';
      const args = config.args?.join(' ') || config.execution?.args?.join(' ') || '';
      
      // 세션 요청을 위한 API URL
      const apiUrl = `http://localhost:${PORT}/stdio?transportType=${transportType}&command=${encodeURIComponent(command)}&args=${encodeURIComponent(args)}`;
      
      console.log(`[ServerManager] 세션 ID 요청: ${apiUrl}`);
      
      // API 호출
      const response = await fetch(apiUrl);
      
      if (response.ok) {
        // 응답 헤더에서 세션 ID 추출
        const sessionId = response.headers.get('mcp-session-id');
        
        if (sessionId) {
          console.log(`[ServerManager] 세션 ID 획득 성공: ${sessionId}`);
          return sessionId;
        } else {
          console.log('[ServerManager] 응답 헤더에서 세션 ID를 찾을 수 없습니다, 다른 방법 시도 중...');
        }
      } else {
        console.error(`[ServerManager] 세션 ID 요청 실패: ${response.status}`);
      }
      
      // 대체 방법으로 /health 엔드포인트 호출해보기
      try {
        console.log('[ServerManager] 서버 상태 확인 중...');
        const healthResponse = await fetch(`http://localhost:${PORT}/health`);
        
        if (healthResponse.ok) {
          const data = await healthResponse.json();
          console.log(`[ServerManager] 서버 상태: ${JSON.stringify(data)}`);
          
          // 연결된 세션 목록 확인 시도
          try {
            const sessionsResponse = await fetch(`http://localhost:${PORT}/message?sessionId=list`);
            if (sessionsResponse.ok) {
              const sessionsData = await sessionsResponse.json();
              console.log(`[ServerManager] 활성 세션: ${JSON.stringify(sessionsData)}`);
              
              // 세션 ID 추출 시도
              if (sessionsData && sessionsData.sessions && sessionsData.sessions.length > 0) {
                const firstSessionId = sessionsData.sessions[0];
                console.log(`[ServerManager] 활성 세션 ID 획득: ${firstSessionId}`);
                return firstSessionId;
              }
            }
          } catch (e) {
            console.log('[ServerManager] 세션 목록 확인 불가');
          }
        }
      } catch (e) {
        console.error(`[ServerManager] 서버 상태 확인 실패:`, e);
      }
      
      console.error('[ServerManager] 세션 ID를 찾을 수 없습니다');
      return null;
    } catch (error) {
      console.error(`[ServerManager] 세션 ID 요청 오류:`, error);
      return null;
    }
  }
  // 서버 상태 업데이트
  updateServerStatus(name: string, status: string): void {
    const server = this.getServer(name);
    if (server) {
      server.status = status;
      console.log(`[ServerManager] 서버 상태 업데이트: ${name} -> ${status}`);
    }
  }
}
