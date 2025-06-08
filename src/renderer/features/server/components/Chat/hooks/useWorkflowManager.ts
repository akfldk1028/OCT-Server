import { useCallback } from 'react';
import { useStore, useDispatch } from '@/hooks/useStore';
import { useWorkflowExecution } from '../../../hook/useWorkflowExecution';
import type { WorkflowExecutionConfig } from '../../../types/workflow.types';

export function useWorkflowManager(sessionId: string | undefined, toggleMCPServer: (serverId: string) => Promise<void>) {
  const store = useStore();
  const dispatch = useDispatch();

  // 🔥 워크플로우 실행 훅 사용
  const { 
    executionState, 
    executeWorkflow, 
    cleanupWorkflow, 
    resetExecution 
  } = useWorkflowExecution();

  // 🧹 기존 워크플로우 서버들 정리 (새 워크플로우 로드 시)
  const cleanupPreviousWorkflowServers = useCallback(async () => {
    if (!sessionId) return;

    try {
      console.log('🧹 [cleanupPreviousWorkflowServers] 시작...');
      
      // 현재 등록된 서버들 중 워크플로우 서버들 찾기 (id가 "workflow-"로 시작)
      const currentServers = Object.values(store.mcp_registry?.servers || {});
      const workflowServerIds = currentServers
        .filter(server => server.id.startsWith('workflow-'))
        .map(server => server.id);
      
      if (workflowServerIds.length === 0) {
        console.log('🧹 [cleanupPreviousWorkflowServers] 정리할 서버 없음');
        return;
      }
      
      console.log('🧹 [cleanupPreviousWorkflowServers] 정리할 서버:', workflowServerIds.length, '개');
      
      // 1️⃣ 세션에서 연결 해제
      const mcpBindings = store.mcp_coordinator?.sessionBindings[sessionId] || [];
      for (const serverId of workflowServerIds) {
        try {
          const existingBinding = mcpBindings.find(
            (b) => b.serverId === serverId && b.status === 'active'
          );
          
          if (existingBinding) {
            console.log('🔌 [cleanupPreviousWorkflowServers] 세션 연결 해제:', serverId);
            await dispatch({
              type: 'mcp_coordinator.disconnectMCPFromSession',
              payload: { sessionId, bindingId: existingBinding.id },
            });
          }
        } catch (disconnectError) {
          console.warn('⚠️ [cleanupPreviousWorkflowServers] 세션 연결 해제 실패:', serverId, disconnectError);
        }
      }
      
      // 2️⃣ Registry에서 서버 제거 (도구, 프롬프트, 리소스도 함께 정리됨)
      for (const serverId of workflowServerIds) {
        try {
          console.log('🗑️ [cleanupPreviousWorkflowServers] Registry에서 제거:', serverId);
          await dispatch({
            type: 'mcp_registry.unregisterServer',
            payload: serverId
          });
        } catch (unregisterError) {
          console.warn('⚠️ [cleanupPreviousWorkflowServers] Registry 제거 실패:', serverId, unregisterError);
        }
      }
      
      console.log('✅ [cleanupPreviousWorkflowServers] 정리 완료');
      
    } catch (error) {
      console.warn('⚠️ [cleanupPreviousWorkflowServers] 실패:', error);
      // 정리 실패해도 새 워크플로우 로드는 계속 진행
    }
  }, [sessionId, store, dispatch]);

  // 🔥 깔끔하게 리팩토링된 워크플로우 실행 핸들러
  const handleLoadWorkflow = useCallback(async (workflowData: any) => {
    if (!sessionId) return;

    // 🔥 디버깅: 함수 호출 확인
    console.log('🎯🎯🎯 [handleLoadWorkflow] 함수 호출됨!!! 🎯🎯🎯');
    console.log('🎯 [handleLoadWorkflow] workflowData:', workflowData);
    
    try {
      if (!workflowData?.nodes?.length) {
        console.warn('⚠️ [handleLoadWorkflow] 워크플로우 노드가 없음');
        return;
      }

      console.log('🔥 [handleLoadWorkflow] 워크플로우 실행 시작:', workflowData.name);

      // 🔥 기존 서버들 정리
      await cleanupPreviousWorkflowServers();

      // 서버 노드들만 필터링하고 InstalledServer 타입으로 변환
      const serverNodes = workflowData.nodes
        .filter((node: any) => node.type === 'server')
        .map((node: any) => node.data)
        .filter((data: any) => data && data.mcp_servers);

      if (serverNodes.length === 0) {
        console.warn('⚠️ [handleLoadWorkflow] 서버 노드가 없음');
        return;
      }

      // 워크플로우 실행 설정
      const executionConfig: WorkflowExecutionConfig = {
        workflowData,
        selectedServers: serverNodes,
        onProgress: (progress) => {
          console.log(`📊 [handleLoadWorkflow] 진행률: ${progress}%`);
        },
        onComplete: async (results) => {
          console.log('🎉 [handleLoadWorkflow] 워크플로우 실행 완료:', results);
          
          // 각 성공한 서버를 채팅 세션에 연결
          const connectedServers: string[] = [];
          const failedServers: string[] = [];
          
          for (const result of results) {
            if (result.success) {
              try {
                // 🔥 성공한 서버를 채팅 세션에 연결 (toggleMCPServer가 연결 완료까지 보장)
                await toggleMCPServer(result.serverId);
                
                // 🔥 toggleMCPServer가 이미 연결 완료를 보장하므로 단순히 상태만 확인
                const updatedBindings = store.mcp_coordinator?.sessionBindings[sessionId] || [];
                const isConnected = updatedBindings.some(b => 
                  b.serverId === result.serverId && b.status === 'active'
                );
                
                if (isConnected) {
                  connectedServers.push(result.serverName);
                  console.log('✅ [handleLoadWorkflow] 채팅 연결 완료:', result.serverName);
                } else {
                  failedServers.push(result.serverName);
                  console.warn('⚠️ [handleLoadWorkflow] 채팅 연결 실패:', result.serverName);
                }
              } catch (connectionError) {
                failedServers.push(result.serverName);
                console.warn('⚠️ [handleLoadWorkflow] 채팅 연결 오류:', result.serverName, connectionError);
              }
            } else {
              failedServers.push(result.serverName);
            }
          }
        },
        onError: async (error) => {
          console.error('❌ [handleLoadWorkflow] 워크플로우 실행 실패:', error);
          
          if (sessionId) {
            await dispatch({
              type: 'chat.addMessage',
              payload: {
                sessionId,
                message: {
                  id: `workflow-error-${Date.now()}`,
                  content: `❌ 워크플로우 실행 중 오류 발생: ${error.message}`,
                  role: 'system',
                  timestamp: new Date().toISOString(),
                  metadata: {
                    type: 'workflow-error',
                    error: error.message
                  }
                }
              }
            });
          }
        }
      };

      // 워크플로우 실행
      await executeWorkflow(executionConfig);

    } catch (error) {
      console.error('❌ [handleLoadWorkflow] 전체 실행 실패:', error);
    }
  }, [sessionId, store, dispatch, cleanupPreviousWorkflowServers, executeWorkflow, toggleMCPServer]);

  return {
    executionState,
    executeWorkflow,
    cleanupWorkflow,
    resetExecution,
    handleLoadWorkflow,
    cleanupPreviousWorkflowServers
  };
} 