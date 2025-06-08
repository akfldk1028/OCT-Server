import { useState, useRef, useCallback } from 'react';
import type { 
  WorkflowExecutionConfig, 
  WorkflowExecutionState, 
  WorkflowExecutionResult,
  MCPServerConfig 
} from '../../../types/workflow.types';
import type { InstalledServer } from '../../../types/server-types';
import { MCPServerManager } from '../../../services/mcpServerManager';
import { useDispatch, useStore } from '@/renderer/hooks/useStore';

// 🔥 워크플로우 실행 훅
export function useWorkflowExecution() {
  const store = useStore(); // 🔥 상태 읽기용
  const dispatch = useDispatch(); // 🔥 액션 실행용
  
  const [executionState, setExecutionState] = useState<WorkflowExecutionState>({
    isExecuting: false,
    progress: 0,
    currentStep: '',
    results: [],
    error: undefined
  });

  const registeredServerIds = useRef<string[]>([]);

  // 진행률 업데이트
  const updateProgress = useCallback((progress: number, currentStep: string) => {
    setExecutionState(prev => ({
      ...prev,
      progress,
      currentStep
    }));
  }, []);

  // 결과 추가
  const addResult = useCallback((result: WorkflowExecutionResult) => {
    setExecutionState(prev => ({
      ...prev,
      results: [...prev.results, result]
    }));
  }, []);

  // 워크플로우 실행
  const executeWorkflow = useCallback(async (config: WorkflowExecutionConfig) => {
    const { workflowData, selectedServers, onProgress, onComplete, onError } = config;

    try {
      // 🔥 실행 상태 초기화
      setExecutionState({
        isExecuting: true,
        progress: 0,
        currentStep: '워크플로우 실행 준비 중...',
        results: [],
        error: undefined
      });

      // 🔥 dispatch 사용
      if (!dispatch) {
        throw new Error('Dispatch를 사용할 수 없습니다.');
      }

      // 🔥 1단계: 이전 서버들 정리
      updateProgress(10, '이전 워크플로우 서버들 정리 중...');
      onProgress?.(10);
      
      if (registeredServerIds.current.length > 0) {
        await MCPServerManager.cleanupServers(registeredServerIds.current, dispatch);
        registeredServerIds.current = [];
      }

      // 🔥 2단계: 서버별 처리
      const totalServers = selectedServers.length;
      const results: WorkflowExecutionResult[] = [];

      for (let i = 0; i < selectedServers.length; i++) {
        const mcpServerInfo = selectedServers[i];
        const baseProgress = 20 + (i / totalServers) * 70;
        
        updateProgress(baseProgress, `${mcpServerInfo.mcp_servers?.name || 'Unknown'} 처리 중...`);
        onProgress?.(baseProgress);

        const result = await processSingleServer(mcpServerInfo, dispatch);
        results.push(result);
        addResult(result);

        if (result.success) {
          registeredServerIds.current.push(result.serverId);
        }
      }

      // 🔥 3단계: 완료
      updateProgress(100, '워크플로우 실행 완료');
      onProgress?.(100);

      setExecutionState(prev => ({
        ...prev,
        isExecuting: false,
        progress: 100,
        currentStep: '완료'
      }));

      // 🔧 성공한 서버들을 AI에게 알림
      const successfulServers = results
        .filter(result => result.success)
        .map(result => result.serverName);

      if (successfulServers.length > 0) {
        console.log('🤖 [executeWorkflow] AI에게 새로운 도구 알림 전송:', successfulServers);
        
        // ChatStore를 통해 AI에게 새로운 도구 알림
        try {
          // 활성 세션 찾기
          const sessions = store?.session?.sessions || {};
          const activeSessions = Object.values(sessions).filter((session: any) => session.status === 'active');
          const sessionId = activeSessions.length > 0 ? activeSessions[0].id : Object.keys(sessions)[0];
          
          if (sessionId) {
            await dispatch({
              type: 'chat.notifyNewToolsAdded',
              payload: {
                sessionId,
                connectedServers: successfulServers,
                message: `🎉 **워크플로우 연결 완료!**\n\n✅ **새로운 MCP 서버들이 활성화되었습니다:**\n${successfulServers.map(name => `🔗 ${name}`).join('\n')}\n\n🚀 **이제 다음 메시지부터 이 도구들을 자동으로 사용할 수 있습니다!**\n💬 "현재 사용 가능한 도구들을 알려주세요" 라고 물어보세요!`
              }
            });
            console.log('✅ [executeWorkflow] AI 알림 전송 완료');
          }
        } catch (notifyError) {
          console.error('❌ [executeWorkflow] AI 알림 전송 실패:', notifyError);
        }
      }

      onComplete?.(results);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      setExecutionState(prev => ({
        ...prev,
        isExecuting: false,
        error: errorMessage
      }));

      onError?.(error instanceof Error ? error : new Error(errorMessage));
    }
  }, [updateProgress, addResult]);

  // 단일 서버 처리
  const processSingleServer = async (
    mcpServerInfo: InstalledServer,
    dispatch: any
  ): Promise<WorkflowExecutionResult> => {
    const serverName = mcpServerInfo.mcp_servers?.name || 'Unknown Server';
    const timestamp = new Date().toISOString();

    try {
      // MCP 설정 파싱
      const { config, error: parseError } = MCPServerManager.parseMCPServerInfo(mcpServerInfo);
      
      if (!config || parseError) {
        return {
          serverId: `workflow-${mcpServerInfo.original_server_id}`,
          serverName,
          success: false,
          message: '❌ MCP 설정 파싱 실패',
          config: config || getDefaultConfig(),
          error: parseError,
          timestamp
        };
      }

      // 서버 등록 요청 생성
      const registrationRequest = MCPServerManager.createRegistrationRequest(
        mcpServerInfo.mcp_servers,
        config
      );

      // 서버 등록
      await dispatch({
        type: 'mcp_registry.registerServer',
        payload: registrationRequest
      });

      // 🔥 서버 등록 후 바로 세션에 연결
      // SessionStore에서 활성 세션 찾기
      const sessions = store?.session?.sessions || {};
      const activeSessions = Object.values(sessions).filter((session: any) => session.status === 'active');
      const sessionId = activeSessions.length > 0 ? activeSessions[0].id : Object.keys(sessions)[0];
      
      if (!sessionId) {
        throw new Error('현재 세션을 찾을 수 없습니다.');
      }

      console.log(`🔌 [processSingleServer] ${serverName} 세션 연결 시작... (sessionId: ${sessionId})`);
      
      // MCP Coordinator를 통해 실제 연결
      const bindingId = await dispatch({
        type: 'mcp_coordinator.connectMCPToSession',
        payload: { 
          sessionId, 
          serverId: registrationRequest.id 
        }
      });

      console.log(`✅ [processSingleServer] ${serverName} 세션 연결 완료: ${bindingId}`);
      
      // 연결 완료까지 대기
 
      return {
        serverId: registrationRequest.id,
        serverName,
        success: true,
        message: `✅ ${serverName} 등록 성공 (${config.selectionReason})`,
        config,
        timestamp
      };

    } catch (error) {
      return {
        serverId: `workflow-${mcpServerInfo.original_server_id}`,
        serverName,
        success: false,
        message: `❌ ${serverName} 등록 실패`,
        config: getDefaultConfig(),
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp
      };
    }
  };

  // 워크플로우 정리
  const cleanupWorkflow = useCallback(async () => {
    if (registeredServerIds.current.length === 0) {
      return;
    }

    try {
      await MCPServerManager.cleanupServers(registeredServerIds.current, dispatch);
      registeredServerIds.current = [];
      
      console.log('🧹 [useWorkflowExecution] 워크플로우 정리 완료');
    } catch (error) {
      console.error('❌ [useWorkflowExecution] 정리 실패:', error);
    }
  }, []);

  // 실행 상태 초기화
  const resetExecution = useCallback(() => {
    setExecutionState({
      isExecuting: false,
      progress: 0,
      currentStep: '',
      results: [],
      error: undefined
    });
  }, []);

  return {
    executionState,
    executeWorkflow,
    cleanupWorkflow,
    resetExecution,
    registeredServerIds: registeredServerIds.current
  };
}



// 기본 설정 반환
function getDefaultConfig(): MCPServerConfig {
  return {
    command: 'npx',
    args: [],
    env: {},
    isRecommended: false,
    configType: 'default',
    selectionReason: '기본값'
  };
} 