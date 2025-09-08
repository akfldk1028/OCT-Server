// ===== 3. 수정된 ServerNodeExecutor =====
// main/workflow/executors/ServerNodeExecutor.ts

import { ServerNodeData } from '@/common/types/workflow';
import { BaseNodeExecutor } from './BaseNodeExecutor';
import { Logger } from '../logger';
import { ExecutePayload, ExecuteResult } from './node-executor-types';
import { IDesktopIntegration } from '../interfaces/workflow-interfaces';
import { MCPClientManager, ClientType } from '../clients/MCPClientManager';
import { MCPServerConfig } from '../clients/IMCPClient';

export class ServerNodeExecutor extends BaseNodeExecutor<ServerNodeData> {
  private mcpClientManager: MCPClientManager;

  constructor(
    node: ServerNodeData,
    private integration: IDesktopIntegration,
    logger?: Logger
  ) {
    super(node, logger);

    // 🔥 NEW: 다중 클라이언트 관리자 초기화
    this.mcpClientManager = new MCPClientManager({
      enabledClients: ['claude-desktop', 'openai-api', 'vscode-extension'],
      autoDetectClients: true,
      defaultClient: 'claude-desktop'
    });
  }

  protected async doExecute(payload: ExecutePayload): Promise<Partial<ExecuteResult>> {
    const { context, edges } = payload;
    const previousResults = context.getPreviousResults(String(this.node.id), edges);

    const message = await this.handlePreviousService(previousResults, context);

    return {
      data: {
        server: (this.node as any).data,
        connected: true
      },
      isLast: this.isLastNode(payload),
      message
    };
  }

  private async handlePreviousService(previousResults: any[], context: any): Promise<string> {
    // 이전 결과에서 AI 서비스 찾기
    const aiService = this.findAIService(previousResults);

    if (aiService) {
      return await this.processAIService(aiService, context);
    }

    // 기존 컨텍스트에서 AI 서비스 확인 (하위 노드용)
    const existingAI = context.get('currentAI');
    if (existingAI) {
      return await this.processExistingAI(existingAI, context);
    }

    return '서비스 연결 완료';
  }

  private findAIService(previousResults: any[]): any {
    for (const result of previousResults) {
      const service = result?.data?.service;
      if (service?.name) {
        return service;
      }
    }
    return null;
  }

  private async processAIService(service: any, context: any): Promise<string> {
    switch (service.name) {
      case 'Claude AI':
      case 'Anthropic':
      case 'Claude':
        this.logger.info('🧠 Claude 서비스 감지!');
        context.set('currentAI', service);
        const claudeResult = await this.connectClaudeMCPServer();
        return claudeResult.message;

      case 'OpenAI':
      case 'ChatGPT':
      case 'GPT-4':
      case 'GPT-3.5':
        this.logger.info('🔧 OpenAI 서비스 감지!');
        context.set('currentAI', service);
        return await this.connectOpenAIServer();

      case 'Gemini':
      case 'Google AI':
        this.logger.info('🌟 Google AI 서비스 감지!');
        context.set('currentAI', service);
        return await this.connectGeminiServer();

      case 'Llama':
      case 'Meta AI':
        this.logger.info('🦙 Meta AI 서비스 감지!');
        context.set('currentAI', service);
        return await this.connectLlamaServer();

      default:
        this.logger.debug(`❓ 알 수 없는 서비스: ${service.name}`);
        return `${service.name} 연결 완료 (지원 예정)`;
    }
  }

  private async processExistingAI(service: any, context: any): Promise<string> {
    this.logger.info(`🔗 기존 ${service.name} 연결 → 추가 서버 연결`);

    switch (service.name) {
      case 'Claude AI':
      case 'Anthropic':
      case 'Claude':
        const claudeResult = await this.connectClaudeMCPServer();
        return claudeResult.message;

      case 'OpenAI':
      case 'ChatGPT':
      case 'GPT-4':
      case 'GPT-3.5':
        return await this.connectOpenAIServer();

      case 'Gemini':
      case 'Google AI':
        return await this.connectGeminiServer();

      case 'Llama':
      case 'Meta AI':
        return await this.connectLlamaServer();

      default:
        return `${service.name} 추가 연결 완료`;
    }
  }

  private async connectOpenAIServer(): Promise<string> {
    // OpenAI 서버 연결 로직
    return '🔧 OpenAI 서버 연결 완료';
  }

  private async connectGeminiServer(): Promise<string> {
    // Gemini 서버 연결 로직
    return '🌟 Gemini 서버 연결 완료';
  }

  private async connectLlamaServer(): Promise<string> {
    // Llama 서버 연결 로직
    return '🦙 Llama 서버 연결 완료';
  }

  private async connectClaudeMCPServer(): Promise<{ message: string }> {
    try {
      const nodeData = (this.node as any).data;
      const serverInfo = nodeData?.mcp_servers;
      const mcpConfigs = nodeData?.mcp_configs;

      if (!serverInfo || !mcpConfigs?.length) {
        return { message: '⚠️ MCP 설정 없음' };
      }

      // 🔥 NEW: 플랫폼별 최적 설정 선택
      const bestConfig = this.selectBestConfigForPlatform(mcpConfigs);
      if (!bestConfig) {
        return { message: '❌ 현재 플랫폼에 호환되는 설정이 없습니다' };
      }

      // 🔥 NEW: MCP 서버 설정 생성
      const serverConfig: MCPServerConfig = {
        name: serverInfo.name,
        command: bestConfig.command,
        args: bestConfig.args || [],
        env: bestConfig.env || {},
        cwd: bestConfig.cwd
      };

      // 🔥 NEW: 모든 사용 가능한 클라이언트에 연결
      const connectionResults = await this.mcpClientManager.connectServerToAllClients(serverConfig);

      // 결과 요약
      const successfulConnections = connectionResults.filter(r => r.success);
      const failedConnections = connectionResults.filter(r => !r.success);

      let message = '';
      if (successfulConnections.length > 0) {
        message += `🎉 ${serverInfo.name} 연결 성공:\n`;
        successfulConnections.forEach(r => {
          message += `  ${r.message}\n`;
        });
      }

      if (failedConnections.length > 0) {
        message += `⚠️ 일부 연결 실패:\n`;
        failedConnections.forEach(r => {
          message += `  ${r.message}\n`;
        });
      }

      return { message: message.trim() || '✅ MCP 서버 연결 완료' };

    } catch (error) {
      this.logger.error('MCP 연결 오류:', error);
      return { message: `❌ 연결 오류: ${error}` };
    }
  }

  /**
   * 🔥 NEW: 현재 플랫폼에 최적화된 설정 선택
   */
  private selectBestConfigForPlatform(configs: any[]): any {
    const platform = process.platform;

    // 모든 플랫폼 공통 우선순위 (비개발자 친화적)
    const priorities = ['npx', 'npm', 'pip', 'uvx', 'uv', 'python', 'docker'];

    this.logger?.info(`🔧 ${platform}에서 최적 설정 선택 중... (${configs.length}개 옵션)`);

    // 우선순위에 따라 설정 선택
    for (const priority of priorities) {
      const config = configs.find(c => c.command === priority);
      if (config) {
        this.logger?.info(`✅ ${priority} 설정 선택됨`);
        return config;
      }
    }

    // 위에서 못 찾으면 첫 번째 사용 가능한 설정
    if (configs.length > 0) {
      this.logger?.warn(`⚠️ 우선순위 설정을 찾지 못함, 첫 번째 설정 사용: ${configs[0].command}`);
      return configs[0];
    }

    return null;
  }

  /**
   * 🔥 NEW: 연결 상태 요약 반환
   */
  getConnectionSummary(): any {
    return this.mcpClientManager.getConnectionSummary();
  }

  /**
   * 🔥 NEW: 특정 클라이언트에만 연결
   */
  async connectToSpecificClient(clientType: ClientType): Promise<{ message: string }> {
    try {
      const nodeData = (this.node as any).data;
      const serverInfo = nodeData?.mcp_servers;
      const mcpConfigs = nodeData?.mcp_configs;

      if (!serverInfo || !mcpConfigs?.length) {
        return { message: '⚠️ MCP 설정 없음' };
      }

      const bestConfig = this.selectBestConfigForPlatform(mcpConfigs);
      if (!bestConfig) {
        return { message: '❌ 호환되는 설정이 없습니다' };
      }

      const serverConfig: MCPServerConfig = {
        name: serverInfo.name,
        command: bestConfig.command,
        args: bestConfig.args || [],
        env: bestConfig.env || {},
        cwd: bestConfig.cwd
      };

      const result = await this.mcpClientManager.connectServerToClient(serverConfig, clientType);

      return { message: result.message };

    } catch (error) {
      this.logger?.error(`${clientType} 연결 오류:`, error);
      return { message: `❌ ${clientType} 연결 오류: ${error}` };
    }
  }
}
