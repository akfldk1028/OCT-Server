// ===== OpenAI API MCP 클라이언트 =====
// main/workflow/clients/OpenAIAPIClient.ts

import { IMCPClient, MCPServerConfig, MCPConnectionResult } from './IMCPClient';
import { spawn, ChildProcess } from 'child_process';

interface OpenAIServerProcess {
  process: ChildProcess;
  port: number;
  pid: number;
  startTime: Date;
}

export class OpenAIAPIClient extends IMCPClient {
  private serverProcesses: Map<string, OpenAIServerProcess> = new Map();
  private portRange: { start: number; end: number } = { start: 3000, end: 3100 };
  private usedPorts: Set<number> = new Set();

  constructor() {
    super('openai-api');
  }

  async isAvailable(): Promise<boolean> {
    // OpenAI API는 항상 사용 가능 (네트워크 연결만 있으면)
    return true;
  }

  async initialize(): Promise<boolean> {
    // OpenAI API는 별도 초기화 불필요
    return true;
  }

  async connectServer(serverConfig: MCPServerConfig): Promise<MCPConnectionResult> {
    try {
      // 사용 가능한 포트 찾기
      const port = await this.findAvailablePort();
      if (!port) {
        return {
          success: false,
          message: '❌ 사용 가능한 포트를 찾을 수 없습니다',
          error: 'No available ports in range'
        };
      }

      // MCP 서버 프로세스 시작
      const serverProcess = await this.startMCPServer(serverConfig, port);

      // 서버 프로세스 정보 저장
      this.serverProcesses.set(serverConfig.name, {
        process: serverProcess,
        port,
        pid: serverProcess.pid!,
        startTime: new Date()
      });

      this.usedPorts.add(port);

      // 연결 상태 업데이트
      this.updateConnectionStatus(serverConfig.name, {
        connected: true,
        lastConnected: new Date(),
        capabilities: ['mcp-standard', 'openai-compatible', 'rest-api']
      });

      return {
        success: true,
        message: `🔧 ${serverConfig.name}이 포트 ${port}에서 OpenAI API로 시작되었습니다`,
        connectionId: `${serverConfig.name}:${port}`
      };

    } catch (error) {
      this.updateConnectionStatus(serverConfig.name, {
        connected: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      return {
        success: false,
        message: `❌ OpenAI API 연결 실패: ${error}`,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async disconnectServer(serverName: string): Promise<boolean> {
    try {
      const serverInfo = this.serverProcesses.get(serverName);
      if (!serverInfo) {
        return false;
      }

      // 프로세스 종료
      serverInfo.process.kill('SIGTERM');

      // 포트 해제
      this.usedPorts.delete(serverInfo.port);

      // 프로세스 정보 제거
      this.serverProcesses.delete(serverName);

      // 연결 상태 업데이트
      this.updateConnectionStatus(serverName, {
        connected: false
      });

      return true;
    } catch (error) {
      console.error(`OpenAI API에서 ${serverName} 제거 실패:`, error);
      return false;
    }
  }

  /**
   * 실행 중인 서버 프로세스 정보 반환
   */
  getServerProcess(serverName: string): OpenAIServerProcess | undefined {
    return this.serverProcesses.get(serverName);
  }

  /**
   * 모든 실행 중인 서버 프로세스 목록
   */
  getAllServerProcesses(): Array<{ name: string; info: OpenAIServerProcess }> {
    return Array.from(this.serverProcesses.entries()).map(([name, info]) => ({
      name,
      info
    }));
  }

  private async findAvailablePort(): Promise<number | null> {
    const { start, end } = this.portRange;

    for (let port = start; port <= end; port++) {
      if (!this.usedPorts.has(port)) {
        // 포트 사용 가능 여부 확인
        if (await this.isPortAvailable(port)) {
          return port;
        }
      }
    }

    return null;
  }

  private async isPortAvailable(port: number): Promise<boolean> {
    return new Promise((resolve) => {
      const { createServer } = require('net');
      const server = createServer();

      server.listen(port, () => {
        server.close();
        resolve(true);
      });

      server.on('error', () => {
        resolve(false);
      });
    });
  }

  private async startMCPServer(config: MCPServerConfig, port: number): Promise<ChildProcess> {
    return new Promise((resolve, reject) => {
      // MCP 서버를 HTTP API 모드로 시작
      const args = [
        ...config.args,
        '--api-mode',
        '--port', port.toString(),
        '--openai-compatible'
      ];

      const serverProcess = spawn(config.command, args, {
        env: {
          ...process.env,
          ...config.env,
          MCP_API_PORT: port.toString()
        },
        cwd: config.cwd,
        stdio: ['pipe', 'pipe', 'pipe']
      });

      // 프로세스 시작 확인
      setTimeout(() => {
        if (serverProcess.pid) {
          resolve(serverProcess);
        } else {
          reject(new Error('서버 프로세스 시작 실패'));
        }
      }, 2000);

      // 에러 처리
      serverProcess.on('error', (error) => {
        reject(error);
      });

      // 로그 처리
      serverProcess.stdout?.on('data', (data) => {
        console.log(`[${config.name}] ${data.toString()}`);
      });

      serverProcess.stderr?.on('data', (data) => {
        console.error(`[${config.name}] ${data.toString()}`);
      });
    });
  }
}
