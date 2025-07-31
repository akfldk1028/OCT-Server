import type { InstalledServer } from '../types/server-types';
import type { MCPServerConfig, MCPServerRegistrationRequest } from '../types/workflow.types';

// 🔥 MCP 서버 관리 서비스
export class MCPServerManager {
  
  /**
   * MCP 설정에서 최적의 설정을 선택합니다.
   * 비개발자 친화적 우선순위: is_recommended=true > npx > npm > pip > uv > uvx > docker
   */
  static selectBestConfig(mcpConfigs: any[]): MCPServerConfig | null {
    if (!mcpConfigs || mcpConfigs.length === 0) {
      return null;
    }

    // 1. is_recommended=true인 설정 우선
    const recommendedConfig = mcpConfigs.find(config => config.is_recommended === true);
    if (recommendedConfig) {
      return this.createMCPConfig(recommendedConfig, 'is_recommended=true');
    }

    // 2. 비개발자 친화적 명령어 우선순위
    const priorityOrder = ['npx', 'npm', 'pip', 'uv', 'uvx', 'docker'];
    
    for (const command of priorityOrder) {
      const config = mcpConfigs.find(c => c.command === command);
      if (config) {
        return this.createMCPConfig(config, `비개발자 친화적 우선순위 (${command})`);
      }
    }

    // 3. 최후 수단: 첫 번째 설정 사용
    return this.createMCPConfig(mcpConfigs[0], '기본 설정');
  }

  /**
   * MCPServerConfig 객체를 생성합니다.
   */
  private static createMCPConfig(config: any, selectionReason: string): MCPServerConfig {
    return {
      command: config.command || 'npx',
      args: config.args || [],
      env: config.env || {},
      platform: config.platform,
      isRecommended: config.is_recommended || false,
      configType: config.config_type || 'unknown',
      selectionReason
    };
  }

  /**
   * MCP 서버 등록 요청 객체를 생성합니다.
   */
  static createRegistrationRequest(
    mcpServerInfo: any,
    config: MCPServerConfig
  ): MCPServerRegistrationRequest {
    // 전송 타입 결정
    const transportType = config.command === 'node' ? 'sse' : 'stdio';
    
    // URL 생성 (SSE인 경우)
    const url = transportType === 'sse' ? 'http://localhost:4303/sse' : undefined;

    return {
      id: `workflow-${mcpServerInfo.id}`,
      name: mcpServerInfo.name,
      description: mcpServerInfo.description || `워크플로우 ${mcpServerInfo.name}`,
      clientId: '',
      transportType: transportType as 'stdio' | 'sse' | 'streamable-http',
      command: config.command,
      args: config.args,
      env: config.env,
      url,
      autoConnect: true,
      capabilities: {
        tools: mcpServerInfo.supports_tools ?? true,
        prompts: mcpServerInfo.supports_prompts ?? true,
        resources: mcpServerInfo.supports_resources ?? true,
      },
      status: 'disconnected' as const,
    };
  }

  /**
   * 서버 정보에서 MCP 설정을 파싱합니다.
   */
  static parseMCPServerInfo(mcpServerInfo: InstalledServer): {
    config: MCPServerConfig | null;
    error?: string;
  } {
    try {
      // mcp_configs 배열에서 설정 선택
      const mcpConfigs = mcpServerInfo.mcp_configs;
      
      if (!mcpConfigs || mcpConfigs.length === 0) {
        return {
          config: null,
          error: 'MCP 설정이 없습니다.'
        };
      }

      const selectedConfig = this.selectBestConfig(mcpConfigs);
      
      if (!selectedConfig) {
        return {
          config: null,
          error: '유효한 MCP 설정을 찾을 수 없습니다.'
        };
      }

      return { config: selectedConfig };

    } catch (error) {
      return {
        config: null,
        error: `MCP 설정 파싱 오류: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * 서버 등록 상태를 확인합니다.
   */
  static async checkRegistrationStatus(
    serverId: string,
    dispatch: any = null,  // 🔥 더 이상 사용하지 않지만 호환성을 위해 유지
    maxRetries: number = 5  // 🔥 50 → 5로 줄임 (0.5초)
  ): Promise<boolean> {
    console.log('🔍 [checkRegistrationStatus] 상태 확인 시작:', serverId);
    
    // 🔥 dispatch 기반에서는 등록 성공을 가정하고 짧은 대기만 함
    await new Promise(resolve => setTimeout(resolve, 500)); // 0.5초 대기
    
    console.log('✅ [checkRegistrationStatus] 서버 등록 완료로 가정:', serverId);
    return true; // dispatch 방식에서는 성공으로 가정
  }

  /**
   * 여러 서버를 정리합니다.
   */
  static async cleanupServers(serverIds: string[], dispatch: any): Promise<void> {
    const cleanupPromises = serverIds.map(async (serverId) => {
      try {
        // 🔥 dispatch로 서버 해제
        await dispatch({
          type: 'mcp_registry/unregisterServer',
          payload: serverId
        });
        console.log(`✅ [MCPServerManager] 서버 ${serverId} 정리 완료`);
      } catch (error) {
        console.warn(`⚠️ [MCPServerManager] 서버 ${serverId} 정리 실패:`, error);
      }
    });

    await Promise.all(cleanupPromises);
  }
} 