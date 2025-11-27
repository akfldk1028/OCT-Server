// ===== Claude Desktop MCP 클라이언트 =====
// main/workflow/clients/ClaudeDesktopClient.ts

import { IMCPClient, MCPServerConfig, MCPConnectionResult } from './IMCPClient';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

export class ClaudeDesktopClient extends IMCPClient {
  private configPath: string;

  constructor() {
    super('claude-desktop');
    this.configPath = this.getClaudeConfigPath();
  }

  async isAvailable(): Promise<boolean> {
    try {
      // Claude Desktop 설치 확인
      const configDir = path.dirname(this.configPath);
      await fs.access(configDir);
      return true;
    } catch {
      return false;
    }
  }

  async initialize(): Promise<boolean> {
    try {
      // 설정 디렉토리 생성 (없다면)
      const configDir = path.dirname(this.configPath);
      await fs.mkdir(configDir, { recursive: true });

      // 기본 설정 파일 생성 (없다면)
      try {
        await fs.access(this.configPath);
      } catch {
        const defaultConfig = {
          mcpServers: {}
        };
        await fs.writeFile(this.configPath, JSON.stringify(defaultConfig, null, 2));
      }

      return true;
    } catch (error) {
      console.error('Claude Desktop 초기화 실패:', error);
      return false;
    }
  }

  async connectServer(serverConfig: MCPServerConfig): Promise<MCPConnectionResult> {
    try {
      // 기존 설정 읽기
      const config = await this.readClaudeConfig();

      // 새 서버 설정 추가
      config.mcpServers[serverConfig.name] = {
        command: serverConfig.command,
        args: serverConfig.args,
        ...(serverConfig.env && { env: serverConfig.env })
      };

      // 설정 파일 저장
      await fs.writeFile(this.configPath, JSON.stringify(config, null, 2));

      // 연결 상태 업데이트
      this.updateConnectionStatus(serverConfig.name, {
        connected: true,
        lastConnected: new Date(),
        capabilities: ['mcp-standard']
      });

      return {
        success: true,
        message: `✅ ${serverConfig.name}이 Claude Desktop에 추가되었습니다. Claude Desktop을 재시작해주세요.`,
        connectionId: serverConfig.name
      };

    } catch (error) {
      this.updateConnectionStatus(serverConfig.name, {
        connected: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      return {
        success: false,
        message: `❌ Claude Desktop 연결 실패: ${error}`,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async disconnectServer(serverName: string): Promise<boolean> {
    try {
      const config = await this.readClaudeConfig();

      if (config.mcpServers[serverName]) {
        delete config.mcpServers[serverName];
        await fs.writeFile(this.configPath, JSON.stringify(config, null, 2));

        this.updateConnectionStatus(serverName, {
          connected: false
        });

        return true;
      }

      return false;
    } catch (error) {
      console.error(`Claude Desktop에서 ${serverName} 제거 실패:`, error);
      return false;
    }
  }

  private getClaudeConfigPath(): string {
    const platform = process.platform;
    const homeDir = os.homedir();

    switch (platform) {
      case 'win32':
        return path.join(homeDir, 'AppData', 'Roaming', 'Claude', 'claude_desktop_config.json');
      case 'darwin':
        return path.join(homeDir, 'Library', 'Application Support', 'Claude', 'claude_desktop_config.json');
      case 'linux':
        return path.join(homeDir, '.config', 'Claude', 'claude_desktop_config.json');
      default:
        throw new Error(`지원하지 않는 플랫폼: ${platform}`);
    }
  }

  private async readClaudeConfig(): Promise<any> {
    try {
      const content = await fs.readFile(this.configPath, 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      // 파일이 없으면 기본 설정 반환
      return {
        mcpServers: {}
      };
    }
  }
}



