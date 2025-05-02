import { useState, useCallback } from 'react';
import {
  Resource,
  ResourceTemplate,
  LoggingLevel,
} from '@modelcontextprotocol/sdk/types.js';
import { MCPApiService } from '../../API/MCPApiService';

/**
 * MCP API 서비스를 위한 커스텀 훅
 *
 * @param makeRequest API 요청 함수
 */
export function useMcpApi(
  makeRequest: any,
  initialErrorState: Record<string, string | null> = {},
) {
  // 에러 상태 관리
  const [errors, setErrors] =
    useState<Record<string, string | null>>(initialErrorState);

  // 에러 초기화 함수
  const clearError = useCallback((tabKey?: string) => {
    if (tabKey) {
      setErrors((prev) => ({ ...prev, [tabKey]: null }));
    }
  }, []);

  // 에러 설정 함수
  const setError = useCallback((tabKey: string, errorString: string) => {
    setErrors((prev) => ({
      ...prev,
      [tabKey]: errorString,
    }));
  }, []);

  // API 서비스 생성
  const apiService = new MCPApiService(makeRequest, clearError, setError);

  // 리소스 관련 상태 및 함수
  const [resources, setResources] = useState<Resource[]>([]);
  const [resourceTemplates, setResourceTemplates] = useState<
    ResourceTemplate[]
  >([]);
  const [resourceContent, setResourceContent] = useState<string>('');
  const [nextResourceCursor, setNextResourceCursor] = useState<
    string | undefined
  >();
  const [nextResourceTemplateCursor, setNextResourceTemplateCursor] = useState<
    string | undefined
  >();

  // 리소스 목록 가져오기
  const listResources = useCallback(async () => {
    try {
      const response = await apiService.listResources(nextResourceCursor);
      setResources((prev) => [...prev, ...(response.resources || [])]);
      setNextResourceCursor(response.nextCursor);
      return response;
    } catch (error) {
      console.error('Error listing resources:', error);
      throw error;
    }
  }, [apiService, nextResourceCursor]);

  // 리소스 템플릿 목록 가져오기
  const listResourceTemplates = useCallback(async () => {
    try {
      const response = await apiService.listResourceTemplates(
        nextResourceTemplateCursor,
      );
      setResourceTemplates((prev) => [
        ...prev,
        ...(response.resourceTemplates || []),
      ]);
      setNextResourceTemplateCursor(response.nextCursor);
      return response;
    } catch (error) {
      console.error('Error listing resource templates:', error);
      throw error;
    }
  }, [apiService, nextResourceTemplateCursor]);

  // 리소스 읽기
  const readResource = useCallback(
    async (uri: string) => {
      try {
        const response = await apiService.readResource(uri);
        setResourceContent(JSON.stringify(response, null, 2));
        return response;
      } catch (error) {
        console.error('Error reading resource:', error);
        throw error;
      }
    },
    [apiService],
  );

  // 리소스 구독 관련 상태 및 함수
  const [resourceSubscriptions, setResourceSubscriptions] = useState<
    Set<string>
  >(new Set<string>());

  // 리소스 구독하기
  const subscribeToResource = useCallback(
    async (uri: string) => {
      if (!resourceSubscriptions.has(uri)) {
        try {
          await apiService.subscribeToResource(uri);
          setResourceSubscriptions((prev) => {
            const clone = new Set(prev);
            clone.add(uri);
            return clone;
          });
        } catch (error) {
          console.error('Error subscribing to resource:', error);
          throw error;
        }
      }
    },
    [apiService, resourceSubscriptions],
  );

  // 리소스 구독 해제하기
  const unsubscribeFromResource = useCallback(
    async (uri: string) => {
      if (resourceSubscriptions.has(uri)) {
        try {
          await apiService.unsubscribeFromResource(uri);
          setResourceSubscriptions((prev) => {
            const clone = new Set(prev);
            clone.delete(uri);
            return clone;
          });
        } catch (error) {
          console.error('Error unsubscribing from resource:', error);
          throw error;
        }
      }
    },
    [apiService, resourceSubscriptions],
  );

  // 프롬프트 관련 상태 및 함수
  const [prompts, setPrompts] = useState<any[]>([]);
  const [promptContent, setPromptContent] = useState<string>('');
  const [nextPromptCursor, setNextPromptCursor] = useState<
    string | undefined
  >();

  // 프롬프트 목록 가져오기
  const listPrompts = useCallback(async () => {
    try {
      const response = await apiService.listPrompts(nextPromptCursor);
      setPrompts(response.prompts);
      setNextPromptCursor(response.nextCursor);
      return response;
    } catch (error) {
      console.error('Error listing prompts:', error);
      throw error;
    }
  }, [apiService, nextPromptCursor]);

  // 프롬프트 가져오기
  const getPrompt = useCallback(
    async (name: string, args: Record<string, string> = {}) => {
      try {
        const response = await apiService.getPrompt(name, args);
        setPromptContent(JSON.stringify(response, null, 2));
        return response;
      } catch (error) {
        console.error('Error getting prompt:', error);
        throw error;
      }
    },
    [apiService],
  );

  // 툴 관련 상태 및 함수
  const [tools, setTools] = useState<any[]>([]);
  const [toolResult, setToolResult] = useState<any | null>(null);
  const [nextToolCursor, setNextToolCursor] = useState<string | undefined>();

  // 툴 목록 가져오기
  const listTools = useCallback(async () => {
    try {
      const response = await apiService.listTools(nextToolCursor);
      setTools(response.tools);
      setNextToolCursor(response.nextCursor);
      return response;
    } catch (error) {
      console.error('Error listing tools:', error);
      throw error;
    }
  }, [apiService, nextToolCursor]);

  // 툴 호출하기
  const callTool = useCallback(
    async (
      name: string,
      params: Record<string, unknown>,
      progressToken: number,
    ) => {
      try {
        const response = await apiService.callTool(name, params, progressToken);
        setToolResult(response);
        return response;
      } catch (error) {
        console.error('Error calling tool:', error);
        setToolResult({
          content: [
            {
              type: 'text',
              text: (error as Error).message ?? String(error),
            },
          ],
          isError: true,
        });
        throw error;
      }
    },
    [apiService],
  );

  // 핑 요청 보내기
  const ping = useCallback(async () => {
    try {
      return await apiService.ping();
    } catch (error) {
      console.error('Error pinging server:', error);
      throw error;
    }
  }, [apiService]);

  // 로그 레벨 설정하기
  const setLogLevel = useCallback(
    async (level: LoggingLevel) => {
      try {
        return await apiService.setLogLevel(level);
      } catch (error) {
        console.error('Error setting log level:', error);
        throw error;
      }
    },
    [apiService],
  );

  // 상태 초기화 함수들
  const clearResources = useCallback(() => {
    setResources([]);
    setNextResourceCursor(undefined);
  }, []);

  const clearResourceTemplates = useCallback(() => {
    setResourceTemplates([]);
    setNextResourceTemplateCursor(undefined);
  }, []);

  const clearPrompts = useCallback(() => {
    setPrompts([]);
    setNextPromptCursor(undefined);
  }, []);

  const clearTools = useCallback(() => {
    setTools([]);
    setNextToolCursor(undefined);
  }, []);

  return {
    // 에러 상태
    errors,
    clearError,
    setError,

    // 리소스 관련
    resources,
    resourceTemplates,
    resourceContent,
    resourceSubscriptions,
    nextResourceCursor,
    nextResourceTemplateCursor,
    listResources,
    listResourceTemplates,
    readResource,
    subscribeToResource,
    unsubscribeFromResource,
    clearResources,
    clearResourceTemplates,

    // 프롬프트 관련
    prompts,
    promptContent,
    nextPromptCursor,
    listPrompts,
    getPrompt,
    clearPrompts,

    // 툴 관련
    tools,
    toolResult,
    nextToolCursor,
    listTools,
    callTool,
    clearTools,

    // 기타
    ping,
    setLogLevel,
  };
}
