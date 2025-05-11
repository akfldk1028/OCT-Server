import {
  ExecutionConfig,
  InstallationConfig,
  MCPServerExtended,
} from '../types/server-config';

// 임시 타입 정의
export interface ServerStatus {
  name: string;
  status?: string;
  online: boolean;
  pingMs?: number;
  displayName?: string;
  serverType?: string;
}

export interface BaseMCPServer {
  name: string;
  displayName?: string;
  serverType?: string;
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
  private sessions: Map<string, Array<{sessionId: string, serverName: string}>>;
  private _expressApiUnavailable: boolean = false;

  constructor(serverList: BaseMCPServer[]) {
    this.servers = new Map(serverList.map((s) => [s.name, s]));
    this.sessions = new Map();
  }

  public addServer(server: BaseMCPServer): void {
    if (this.servers.has(server.name)) {
      console.warn(`⚠️ [ServerManager] 서버 '${server.name}'가 이미 존재하여 덮어씁니다.`);
    }
    this.servers.set(server.name, server);
    console.log(`📦 [ServerManager] 서버 인스턴스 '${server.name}'가 추가/업데이트되었습니다.`);
  }

  getServer(name: string): BaseMCPServer | undefined {
    return this.servers.get(name);
  }

  getAllServers(): BaseMCPServer[] {
    return Array.from(this.servers.values());
  }

  getStatus(): ServerStatus[] {
    return Array.from(this.servers.values()).map((srv) => ({
      name: srv.name,
      displayName: srv.displayName || srv.name,
      serverType: srv.serverType || (srv.name === 'local-express-server' ? 'express' : 'mcp'),
      status: srv.status,
      online: srv.status === 'running',
      pingMs: srv.status === 'running' ? 0 : undefined,
    }));
  }

  async getServerStatus(name: string): Promise<ServerStatus | null> {
    const server = this.getServer(name);
    if (server) {
      return {
        name: server.name,
        displayName: server.displayName || server.name,
        serverType: server.serverType,
        status: server.status,
        online: server.status === 'running',
        pingMs: server.status === 'running' ? 0 : undefined,
      };
    }
    return null;
  }

  // 📌 실제 서버 시작 로직 - express 서버와 MCP 서버 구분
  async startServer(name: string): Promise<void> {
    const srv = this.servers.get(name);
    if (!srv) {
      throw new Error(`Server ${name} not found`);
    }

    // Express 서버는 기존 방식대로
    if (name === 'local-express-server') {
      if (srv.status !== 'running') {
        await srv.start(); // 기존 start 메서드 호출
      }
      return;
    }

    // MCP 서버들은 API를 통해 시작
    const success = await this._startMcpServer(name, srv.config);
    if (!success) {
      throw new Error(`Failed to start server ${name}`);
    }
  }

  // 📌 MCP 서버 시작 전용 메서드 (무한 재귀 방지)
  private async _startMcpServer(
    serverName: string,
    config: any,
  ): Promise<boolean> {
    try {
      // Express 서버 체크 - 무한 재귀 방지
      const expressServer = this.getServer('local-express-server');
      if (!expressServer || expressServer.status !== 'running') {
        // Express 서버의 start 메서드만 직접 호출
        await expressServer?.start();
      }

      // API 호출 구성
      const PORT = 4303;
      const command = config.command || config.execution?.command || '';
      const args =
        config.args?.join(' ') || config.execution?.args?.join(' ') || '';
      const transportType = 'stdio';

      const apiUrl = `http://localhost:${PORT}/stdio?transportType=${transportType}&command=${encodeURIComponent(command)}&args=${encodeURIComponent(args)}&serverName=${encodeURIComponent(serverName)}`;

      console.log(`[ServerManager] Starting ${serverName}: ${apiUrl}`);

      const response = await fetch(apiUrl);

      if (response.ok) {
        console.log(`[ServerManager] ${serverName} started successfully`);

        const sessionId = response.headers.get('mcp-session-id');
        if (sessionId) {
          console.log(
            `[ServerManager] Session ID for ${serverName}: ${sessionId}`,
          );
          
          this.addSession(serverName, sessionId);
        }

        // 로컬 상태 업데이트
        this.updateServerStatus(serverName, 'running');
        return true;
      }
      console.error(
        `[ServerManager] Failed to start ${serverName}: ${response.status}`,
      );
      return false;
    } catch (error) {
      console.error(`[ServerManager] Error starting ${serverName}:`, error);
      return false;
    }
  }

  // 📌 여러 서버 동시 시작
  async startMultipleServers(
    serverConfigs: Array<{ serverName: string; config: any }>,
  ): Promise<any> {
    console.log(`[ServerManager] Starting ${serverConfigs.length} servers...`);

    // 먼저 Express 서버 시작
    const expressServer = this.getServer('local-express-server');
    if (expressServer && expressServer.status !== 'running') {
      await expressServer.start();
    }

    const results = await Promise.allSettled(
      serverConfigs.map(async ({ serverName, config }) => {
        // 로컬 서버 객체 업데이트
        const srv = this.servers.get(serverName);
        if (srv) {
          srv.config = { ...srv.config, ...config };
        }

        // MCP 서버 시작 (Express 서버가 아닌 경우)
        if (serverName !== 'local-express-server') {
          const success = await this._startMcpServer(serverName, config);

          if (success) {
            return {
              serverName,
              status: 'started',
              sessionId: `${serverName}-session`,
            };
          }
          throw new Error(`Failed to start ${serverName}`);
        } else {
          // Express 서버는 이미 시작됨
          return {
            serverName,
            status: 'started',
            sessionId: null,
          };
        }
      }),
    );

    // 결과 정리
    const summary = {
      total: serverConfigs.length,
      succeeded: 0,
      failed: 0,
      results: results.map((result, index) => {
        if (result.status === 'fulfilled') {
          summary.succeeded++;
          return result.value;
        }
        summary.failed++;
        return {
          serverName: serverConfigs[index].serverName,
          status: 'failed',
          error: result.reason.message,
        };
      }),
    };

    console.log(
      `[ServerManager] Batch start complete: ${summary.succeeded}/${summary.total} succeeded`,
    );
    return summary;
  }

  // 📌 callMcpApi는 MCP 서버 시작만 담당
  async callMcpApi(config: any, serverName?: string): Promise<boolean> {
    const actualServerName = serverName || config.name || 'remote-mcp-server';

    // Express 서버인 경우 에러
    if (actualServerName === 'local-express-server') {
      throw new Error('Use startServer for express server, not callMcpApi');
    }

    return this._startMcpServer(actualServerName, config);
  }

  // 📌 서버 종료
  async stopServer(name: string): Promise<void> {
    const srv = this.servers.get(name);
    if (!srv) {
      throw new Error(`Server ${name} not found`);
    }

    // Express 서버는 기존 방식대로
    if (name === 'local-express-server') {
      await srv.stop();
      return;
    }

    // MCP 서버는 API로 종료
    const PORT = 4303;
    const response = await fetch(
      `http://localhost:${PORT}/mcp/server/${encodeURIComponent(name)}/stop`,
      {
        method: 'POST',
      },
    );

    if (response.ok) {
      console.log(`[ServerManager] ${name} stopped successfully`);
      this.updateServerStatus(name, 'stopped');
      
      this.removeSession(name);
    } else {
      throw new Error(`Failed to stop server ${name}: ${response.statusText}`);
    }
  }

  // 📌 여러 서버 동시 종료
  async stopMultipleServers(serverNames: string[]): Promise<any> {
    console.log(`[ServerManager] Stopping ${serverNames.length} servers...`);

    const results = await Promise.allSettled(
      serverNames.map(async (serverName) => {
        const srv = this.servers.get(serverName);

        if (serverName === 'local-express-server') {
          // Express 서버는 기존 메서드 사용
          if (srv) {
            await srv.stop();
          }
          return {
            serverName,
            status: 'stopped',
            sessionsRemoved: 0,
          };
        }
        // MCP 서버는 API 사용
        const PORT = 4303;
        const response = await fetch(
          `http://localhost:${PORT}/mcp/server/${encodeURIComponent(serverName)}/stop`,
          {
            method: 'POST',
          },
        );

        if (response.ok) {
          this.updateServerStatus(serverName, 'stopped');
          const data = await response.json();
          return {
            serverName,
            status: 'stopped',
            sessionsRemoved: data.sessionsRemoved || 0,
          };
        }
        throw new Error(`Failed to stop ${serverName}`);
      }),
    );

    // 결과 정리
    const summary = {
      total: serverNames.length,
      succeeded: 0,
      failed: 0,
      results: results.map((result, index) => {
        if (result.status === 'fulfilled') {
          summary.succeeded++;
          return result.value;
        }
        summary.failed++;
        return {
          serverName: serverNames[index],
          status: 'failed',
          error: result.reason.message,
        };
      }),
    };

    console.log(
      `[ServerManager] Batch stop complete: ${summary.succeeded}/${summary.total} succeeded`,
    );
    return summary;
  }

  // 📌 기타 헬퍼 메서드들
  updateServerExecutionDetails(
    serverName: string,
    method: ServerInstallationMethod,
  ): void {
    const srv = this.servers.get(serverName);
    if (srv) {
      srv.config.command = method.command;
      srv.config.args = method.args;
      console.log(`[Manager] Updated execution details for ${serverName}`);
    } else {
      console.error(
        `[Manager] Cannot update details: Server ${serverName} not found.`,
      );
    }
  }

  updateServerStatus(name: string, status: string): void {
    const server = this.getServer(name);
    if (server) {
      server.status = status;
      console.log(
        `[ServerManager] Server status updated: ${name} -> ${status}`,
      );
    }
  }

  async getActiveServers(): Promise<any> {
    const PORT = 4303;

    const response = await fetch(`http://localhost:${PORT}/mcp/active-servers`);

    if (!response.ok) {
      throw new Error(`Failed to get active servers: ${response.statusText}`);
    }

    return await response.json();
  }

  // getActiveSessions 메서드 수정 - 내부 데이터 사용
  async getActiveSessions(serverName?: string): Promise<any[]> {
    try {
      // 로그 출력 제거하여 콘솔 스팸 방지
      // console.log(`[ServerManager] 활성 세션 조회 요청 (서버: ${serverName || '전체'})`);
      
      // Express API 호출 시도 (첫 번째 시도할 때만 호출 - 정적 변수 사용)
      if (!this._expressApiUnavailable) {
        try {
          // Express 서버 API를 통해 활성 세션 정보 가져오기
          const PORT = 4303;
          const endpoint = serverName 
            ? `http://localhost:${PORT}/mcp/server/${encodeURIComponent(serverName)}/sessions`
            : `http://localhost:${PORT}/mcp/sessions`;
          
          const response = await fetch(endpoint);
          
          if (response.ok) {
            const sessions = await response.json();
            // console.log(`[ServerManager] 활성 세션 조회 성공: ${sessions.length}개 세션`);
            return sessions;
          } else {
            // console.log(`[ServerManager] Express API 세션 조회 실패 (${response.status}), 내부 데이터 사용`);
            // 404 에러가 지속적으로 발생하면 API 호출 중단
            if (response.status === 404) {
              this._expressApiUnavailable = true;
              console.log('[ServerManager] Express 세션 API 사용 불가능, 이후 API 호출 건너뜀');
            }
          }
        } catch (error) {
          // console.log(`[ServerManager] Express API 세션 조회 중 오류, 내부 데이터 사용:`, error);
        }
      }
      
      // 내부 데이터 사용
      const result: any[] = [];
      
      if (serverName) {
        // 특정 서버의 세션만 반환
        const serverSessions = this.sessions.get(serverName) || [];
        if (serverSessions.length > 0) {
          result.push({
            serverName,
            sessionCount: serverSessions.length,
            sessionId: serverSessions[0].sessionId
          });
        }
      } else {
        // 모든 서버의 세션 반환
        this.sessions.forEach((sessions, srvName) => {
          if (sessions.length > 0) {
            result.push({
              serverName: srvName,
              sessionCount: sessions.length,
              sessionId: sessions[0].sessionId
            });
          }
        });
      }
      
      // 결과가 있는 경우에만 로그 출력 (주기적인 호출로 인한 로그 제거)
      // if (result.length > 0) {
      //   console.log(`[ServerManager] 내부 세션 데이터 반환: ${result.length}개 서버`);
      // }
      return result;
    } catch (error) {
      console.error(`[ServerManager] 활성 세션 조회 중 오류:`, error);
      return [];
    }
  }

  async updateStatuses(): Promise<ServerStatus[]> {
    const statuses: ServerStatus[] = [];

    for (const srv of this.servers.values()) {
      try {
        const stat = await srv.checkStatus();
        srv.status = stat.online ? 'running' : 'stopped';
        statuses.push({ ...stat });
      } catch {
        srv.status = 'error';
        statuses.push({ name: srv.name, online: false });
      }
    }
    return statuses;
  }

  // 서버의 전체 설정 정보를 포함한 모든 서버 정보 반환
  getAllServersWithFullConfig(): any[] {
    const fs = require('fs');
    const path = require('path');
    
    // 앱 데이터 경로 정의
    const appDataPath = path.join(
      process.env.APPDATA ||
        (process.platform === 'darwin'
          ? `${process.env.HOME}/Library/Application Support`
          : `${process.env.HOME}/.local/share`),
      'mcp-server-manager',
    );

    return Array.from(this.servers.values()).map((srv) => {
      const serverId = srv.name;
      const serverDir = path.join(appDataPath, 'servers', serverId);
      const configFilePath = path.join(serverDir, `${serverId}_config.json`);
      
      // 기본 서버 정보 객체
      const serverInfo = {
        id: serverId,
        name: srv.name,
        displayName: srv.displayName || srv.name,
        serverType: srv.serverType || (srv.name === 'local-express-server' ? 'express' : 'mcp'),
        status: srv.status,
        online: srv.status === 'running',
        config: srv.config, // 기본 설정 정보
      };
      
      // 설정 파일이 존재하면 해당 정보로 업데이트
      try {
        if (fs.existsSync(configFilePath)) {
          console.log(`[ServerManager] 설정 파일을 직접 읽습니다: ${configFilePath}`);
          const configContent = fs.readFileSync(configFilePath, 'utf8');
          const fullConfig = JSON.parse(configContent);
          
          // 설정 파일의 정보를 현재 서버 정보와 병합
          if (!serverInfo.config) {
            serverInfo.config = {};
          }
          
          // 주요 config 속성 복사
          serverInfo.config = { 
            ...serverInfo.config,
            command: fullConfig.execution?.command || fullConfig.command,
            args: fullConfig.execution?.args || fullConfig.args,
            transportType: fullConfig.transportType || 'stdio',
            env: fullConfig.execution?.env || fullConfig.env || {},
            execution: fullConfig.execution,
          };
          
          // 전체 이름 정보도 가져오기
          if (fullConfig.displayName) {
            serverInfo.displayName = fullConfig.displayName;
          }
          
          // 서버 타입 정보도 업데이트
          if (fullConfig.server_type || fullConfig.serverType) {
            serverInfo.serverType = fullConfig.server_type || fullConfig.serverType;
          }
          
          console.log(`[ServerManager] ${serverId} 서버의 전체 설정 정보를 가져왔습니다.`);
        }
      } catch (error) {
        console.error(`[ServerManager] ${serverId} 서버의 설정 파일 읽기 오류:`, error);
      }
      
      return serverInfo;
    });
  }

  private addSession(serverName: string, sessionId: string): void {
    if (!this.sessions.has(serverName)) {
      this.sessions.set(serverName, []);
    }
    
    const serverSessions = this.sessions.get(serverName);
    if (serverSessions && !serverSessions.find(s => s.sessionId === sessionId)) {
      serverSessions.push({ serverName, sessionId });
      console.log(`[ServerManager] Session ${sessionId} added for ${serverName}`);
    }
  }
  
  private removeSession(serverName: string, sessionId?: string): void {
    if (!this.sessions.has(serverName)) return;
    
    if (sessionId) {
      // 특정 세션만 제거
      const serverSessions = this.sessions.get(serverName);
      if (serverSessions) {
        const newSessions = serverSessions.filter(s => s.sessionId !== sessionId);
        this.sessions.set(serverName, newSessions);
        console.log(`[ServerManager] Session ${sessionId} removed from ${serverName}`);
      }
    } else {
      // 서버의 모든 세션 제거
      this.sessions.delete(serverName);
      console.log(`[ServerManager] All sessions removed for ${serverName}`);
    }
  }
}
