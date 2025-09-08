// ===== VSCode Extension MCP 클라이언트 =====
// main/workflow/clients/VSCodeExtensionClient.ts

import { IMCPClient, MCPServerConfig, MCPConnectionResult } from './IMCPClient';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

export class VSCodeExtensionClient extends IMCPClient {
  private settingsPath: string;

  constructor() {
    super('vscode-extension');
    this.settingsPath = this.getVSCodeSettingsPath();
  }

  async isAvailable(): Promise<boolean> {
    try {
      // VSCode 설치 확인
      const configDir = path.dirname(this.settingsPath);
      await fs.access(configDir);
      return true;
    } catch {
      return false;
    }
  }

  async initialize(): Promise<boolean> {
    try {
      // 설정 디렉토리 생성 (없다면)
      const configDir = path.dirname(this.settingsPath);
      await fs.mkdir(configDir, { recursive: true });

      // 기본 설정 파일 생성 (없다면)
      try {
        await fs.access(this.settingsPath);
      } catch {
        const defaultSettings = {
          "mcp.servers": {}
        };
        await fs.writeFile(this.settingsPath, JSON.stringify(defaultSettings, null, 2));
      }

      return true;
    } catch (error) {
      console.error('VSCode Extension 초기화 실패:', error);
      return false;
    }
  }

  async connectServer(serverConfig: MCPServerConfig): Promise<MCPConnectionResult> {
    try {
      // 기존 설정 읽기
      const settings = await this.readVSCodeSettings();

      // MCP 서버 설정이 없다면 초기화
      if (!settings["mcp.servers"]) {
        settings["mcp.servers"] = {};
      }

      // 새 서버 설정 추가
      settings["mcp.servers"][serverConfig.name] = {
        command: serverConfig.command,
        args: serverConfig.args,
        ...(serverConfig.env && { env: serverConfig.env }),
        ...(serverConfig.cwd && { cwd: serverConfig.cwd })
      };

      // 설정 파일 저장
      await fs.writeFile(this.settingsPath, JSON.stringify(settings, null, 2));

      // 연결 상태 업데이트
      this.updateConnectionStatus(serverConfig.name, {
        connected: true,
        lastConnected: new Date(),
        capabilities: ['mcp-standard', 'vscode-integration', 'language-server']
      });

      return {
        success: true,
        message: `📝 ${serverConfig.name}이 VSCode 설정에 추가되었습니다. VSCode를 재시작하거나 확장을 다시 로드해주세요.`,
        connectionId: serverConfig.name
      };

    } catch (error) {
      this.updateConnectionStatus(serverConfig.name, {
        connected: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      return {
        success: false,
        message: `❌ VSCode Extension 연결 실패: ${error}`,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async disconnectServer(serverName: string): Promise<boolean> {
    try {
      const settings = await this.readVSCodeSettings();

      if (settings["mcp.servers"] && settings["mcp.servers"][serverName]) {
        delete settings["mcp.servers"][serverName];
        await fs.writeFile(this.settingsPath, JSON.stringify(settings, null, 2));

        this.updateConnectionStatus(serverName, {
          connected: false
        });

        return true;
      }

      return false;
    } catch (error) {
      console.error(`VSCode Extension에서 ${serverName} 제거 실패:`, error);
      return false;
    }
  }

  /**
   * VSCode 확장에 명령어 전송
   */
  async sendCommandToVSCode(command: string, args?: any[]): Promise<boolean> {
    try {
      // VSCode CLI를 통한 명령어 실행
      const { spawn } = require('child_process');
      const vscodeCommand = process.platform === 'win32' ? 'code.cmd' : 'code';

      return new Promise((resolve) => {
        const process = spawn(vscodeCommand, [
          '--command', command,
          ...(args ? ['--args', JSON.stringify(args)] : [])
        ]);

        process.on('exit', (code) => {
          resolve(code === 0);
        });

        process.on('error', () => {
          resolve(false);
        });
      });
    } catch {
      return false;
    }
  }

  /**
   * MCP 확장 재로드
   */
  async reloadMCPExtension(): Promise<boolean> {
    return this.sendCommandToVSCode('mcp.reload');
  }

  private getVSCodeSettingsPath(): string {
    const platform = process.platform;
    const homeDir = os.homedir();

    switch (platform) {
      case 'win32':
        return path.join(homeDir, 'AppData', 'Roaming', 'Code', 'User', 'settings.json');
      case 'darwin':
        return path.join(homeDir, 'Library', 'Application Support', 'Code', 'User', 'settings.json');
      case 'linux':
        return path.join(homeDir, '.config', 'Code', 'User', 'settings.json');
      default:
        throw new Error(`지원하지 않는 플랫폼: ${platform}`);
    }
  }

  private async readVSCodeSettings(): Promise<any> {
    try {
      const content = await fs.readFile(this.settingsPath, 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      // 파일이 없으면 기본 설정 반환
      return {};
    }
  }
}
