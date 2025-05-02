import { z } from 'zod';
import {
  ClientRequest,
  CompatibilityCallToolResult,
  CompatibilityCallToolResultSchema,
  ListResourcesResultSchema,
  ListResourceTemplatesResultSchema,
  ListPromptsResultSchema,
  ListToolsResultSchema,
  ReadResourceResultSchema,
  GetPromptResultSchema,
  EmptyResultSchema,
  Resource,
  ResourceTemplate,
  LoggingLevel,
} from '@modelcontextprotocol/sdk/types.js';

/**
 * MCP API 통신 처리를 위한 서비스 클래스
 */
export class MCPApiService {
  private makeRequest: <T extends z.ZodType>(
    request: ClientRequest,
    schema: T,
  ) => Promise<z.infer<T>>;

  private clearError: (tabKey?: string) => void;

  private setError: (tabKey: string, errorString: string) => void;

  /**
   * @param makeRequest 실제 API 요청을 처리하는 함수
   * @param clearError 오류 상태를 초기화하는 함수
   * @param setError 오류 상태를 설정하는 함수
   */
  constructor(
    makeRequest: <T extends z.ZodType>(
      request: ClientRequest,
      schema: T,
    ) => Promise<z.infer<T>>,
    clearError: (tabKey?: string) => void,
    setError: (tabKey: string, errorString: string) => void,
  ) {
    this.makeRequest = makeRequest;
    this.clearError = clearError;
    this.setError = setError;
  }

  /**
   * MCP 요청을 보내고 에러 처리
   */
  async sendRequest<T extends z.ZodType>(
    request: ClientRequest,
    schema: T,
    tabKey?: string,
  ): Promise<z.infer<T>> {
    try {
      const response = await this.makeRequest(request, schema);
      if (tabKey) {
        this.clearError(tabKey);
      }
      return response;
    } catch (e) {
      const errorString = (e as Error).message ?? String(e);
      if (tabKey) {
        this.setError(tabKey, errorString);
      }
      throw e;
    }
  }

  // 리소스 관련 메서드
  async listResources(
    cursor?: string,
  ): Promise<{ resources: Resource[]; nextCursor?: string }> {
    return this.sendRequest(
      {
        method: 'resources/list' as const,
        params: cursor ? { cursor } : {},
      },
      ListResourcesResultSchema,
      'resources',
    );
  }

  async listResourceTemplates(
    cursor?: string,
  ): Promise<{ resourceTemplates: ResourceTemplate[]; nextCursor?: string }> {
    return this.sendRequest(
      {
        method: 'resources/templates/list' as const,
        params: cursor ? { cursor } : {},
      },
      ListResourceTemplatesResultSchema,
      'resources',
    );
  }

  async readResource(uri: string): Promise<any> {
    return this.sendRequest(
      {
        method: 'resources/read' as const,
        params: { uri },
      },
      ReadResourceResultSchema,
      'resources',
    );
  }

  async subscribeToResource(uri: string): Promise<{}> {
    return this.sendRequest(
      {
        method: 'resources/subscribe' as const,
        params: { uri },
      },
      z.object({}),
      'resources',
    );
  }

  async unsubscribeFromResource(uri: string): Promise<{}> {
    return this.sendRequest(
      {
        method: 'resources/unsubscribe' as const,
        params: { uri },
      },
      z.object({}),
      'resources',
    );
  }

  // 프롬프트 관련 메서드
  async listPrompts(
    cursor?: string,
  ): Promise<{ prompts: any[]; nextCursor?: string }> {
    return this.sendRequest(
      {
        method: 'prompts/list' as const,
        params: cursor ? { cursor } : {},
      },
      ListPromptsResultSchema,
      'prompts',
    );
  }

  async getPrompt(
    name: string,
    args: Record<string, string> = {},
  ): Promise<any> {
    return this.sendRequest(
      {
        method: 'prompts/get' as const,
        params: { name, arguments: args },
      },
      GetPromptResultSchema,
      'prompts',
    );
  }

  // 툴 관련 메서드
  async listTools(
    cursor?: string,
  ): Promise<{ tools: any[]; nextCursor?: string }> {
    return this.sendRequest(
      {
        method: 'tools/list' as const,
        params: cursor ? { cursor } : {},
      },
      ListToolsResultSchema,
      'tools',
    );
  }

  async callTool(
    name: string,
    params: Record<string, unknown>,
    progressToken: number,
  ): Promise<CompatibilityCallToolResult> {
    return this.sendRequest(
      {
        method: 'tools/call' as const,
        params: {
          name,
          arguments: params,
          _meta: {
            progressToken,
          },
        },
      },
      CompatibilityCallToolResultSchema,
      'tools',
    );
  }

  // 기타 메서드
  async ping(): Promise<{}> {
    return this.sendRequest(
      {
        method: 'ping' as const,
      },
      EmptyResultSchema,
    );
  }

  async setLogLevel(level: LoggingLevel): Promise<{}> {
    return this.sendRequest(
      {
        method: 'logging/setLevel' as const,
        params: { level },
      },
      z.object({}),
    );
  }
}
