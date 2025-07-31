// ===== 3. 수정된 ServerNodeExecutor =====
// main/workflow/executors/ServerNodeExecutor.ts

import { ServerNodeData } from '@/common/types/workflow';
import { BaseNodeExecutor } from './BaseNodeExecutor';
import { Logger } from '../logger';
import { ExecutePayload, ExecuteResult } from './node-executor-types';
import { IDesktopIntegration } from '../interfaces/workflow-interfaces';

export class ServerNodeExecutor extends BaseNodeExecutor<ServerNodeData> {
  constructor(
    node: ServerNodeData,
    private integration: IDesktopIntegration,
    logger?: Logger
  ) {
    super(node, logger);
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
      
      const platform = process.platform;
      
      switch (platform) {
        case 'win32':
          return await this.connectMCPWindows(serverInfo, mcpConfigs);
        case 'darwin':
          return await this.connectMCPMacOS(serverInfo, mcpConfigs);
        case 'linux':
          return await this.connectMCPLinux(serverInfo, mcpConfigs);
        default:
          return { message: `❌ 지원하지 않는 플랫폼: ${platform}` };
      }
      
    } catch (error) {
      this.logger.error('MCP 연결 오류:', error);
      return { message: `❌ 연결 오류: ${error}` };
    }
  }

  private async connectMCPWindows(serverInfo: any, mcpConfigs: any[]): Promise<{ message: string }> {
    this.logger.info('🪟 Windows MCP 연결 시작');
    
    const serverName = serverInfo.name;
    if (this.integration.isServerConnected(serverName)) {
      return { message: `✅ 이미 연결됨: ${serverName}` };
    }
    
    const config = this.selectBestConfigForWindows(mcpConfigs);
    if (!config) {
      return { message: '❌ Windows 호환 설정 없음' };
    }
    
    const serverConfig = {
      command: config.command,
      args: config.args || [],
      ...(config.env && { env: config.env })
    };
    
    const success = this.integration.connectServer(serverName, serverConfig);
    return {
      message: success 
        ? `🎉 ${serverName} Windows에 추가됨! Claude Desktop 재시작 필요`
        : `❌ Windows 연결 실패: ${serverName}`
    };
  }

  private async connectMCPMacOS(serverInfo: any, mcpConfigs: any[]): Promise<{ message: string }> {
    this.logger.info('🍎 macOS MCP 연결 시작');
    
    const serverName = serverInfo.name;
    if (this.integration.isServerConnected(serverName)) {
      return { message: `✅ 이미 연결됨: ${serverName}` };
    }
    
    const config = this.selectBestConfigForMacOS(mcpConfigs);
    if (!config) {
      return { message: '❌ macOS 호환 설정 없음' };
    }
    
    const serverConfig = {
      command: config.command,
      args: config.args || [],
      ...(config.env && { env: config.env })
    };
    
    const success = this.integration.connectServer(serverName, serverConfig);
    return {
      message: success 
        ? `🎉 ${serverName} macOS에 추가됨! Claude Desktop 재시작 필요`
        : `❌ macOS 연결 실패: ${serverName}`
    };
  }

  private async connectMCPLinux(serverInfo: any, mcpConfigs: any[]): Promise<{ message: string }> {
    this.logger.info('🐧 Linux MCP 연결 시작');
    
    const serverName = serverInfo.name;
    if (this.integration.isServerConnected(serverName)) {
      return { message: `✅ 이미 연결됨: ${serverName}` };
    }
    
    const config = this.selectBestConfigForLinux(mcpConfigs);
    if (!config) {
      return { message: '❌ Linux 호환 설정 없음' };
    }
    
    const serverConfig = {
      command: config.command,
      args: config.args || [],
      ...(config.env && { env: config.env })
    };
    
    const success = this.integration.connectServer(serverName, serverConfig);
    return {
      message: success 
        ? `🎉 ${serverName} Linux에 추가됨! Claude Desktop 재시작 필요`
        : `❌ Linux 연결 실패: ${serverName}`
    };
  }
  
  private selectBestConfigForWindows(configs: any[]): any {
    // Windows 우선순위 (비개발자 친화적): npx > npm > pip > uvx > uv > python > docker
    const priorities = ['npx', 'npm', 'pip', 'uvx', 'uv', 'python', 'docker'];
    
    // 🔥 강제로 순서대로만 확인 - is_recommended 완전 무시
    for (const priority of priorities) {
      const config = configs.find(c => c.command === priority);
      if (config) return config;
    }
    
    // 위에서 못 찾으면 첫 번째
    return configs[0] || null;
  }

  private selectBestConfigForMacOS(configs: any[]): any {
    // macOS 우선순위 (비개발자 친화적): npx > npm > pip > uvx > uv > python > docker
    const priorities = ['npx', 'npm', 'pip', 'uvx', 'uv', 'python', 'docker'];
    
    // 🔥 강제로 순서대로만 확인 - is_recommended 완전 무시
    for (const priority of priorities) {
      const config = configs.find(c => c.command === priority);
      if (config) return config;
    }
    
    // 위에서 못 찾으면 첫 번째
    return configs[0] || null;
  }

  private selectBestConfigForLinux(configs: any[]): any {
    // Linux 우선순위 (비개발자 친화적): npx > npm > pip > uvx > uv > python > docker
    const priorities = ['npx', 'npm', 'pip', 'uvx', 'uv', 'python', 'docker'];
    
    // 🔥 강제로 순서대로만 확인 - is_recommended 완전 무시
    for (const priority of priorities) {
      const config = configs.find(c => c.command === priority);
      if (config) return config;
    }
    
    // 위에서 못 찾으면 첫 번째
    return configs[0] || null;
  }
}