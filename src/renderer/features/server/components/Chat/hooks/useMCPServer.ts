import { useCallback } from 'react';
import { useStore, useDispatch } from '@/hooks/useStore';

export function useMCPServer(sessionId: string | undefined) {
  const store = useStore();
  const dispatch = useDispatch();

  // MCP 서버 연결/해제
  const toggleMCPServer = useCallback(async (serverId: string) => {
    if (!sessionId) return;

    console.log('🔌 [toggleMCPServer] 시작:', {
      serverId,
      sessionId,
      timestamp: new Date().toISOString()
    });

    try {
      const mcpBindings = store.mcp_coordinator?.sessionBindings[sessionId] || [];
      const existingBinding = mcpBindings.find(
        (b) => b.serverId === serverId && b.status === 'active',
      );

      console.log('🔍 [toggleMCPServer] 기존 바인딩 확인:', {
        serverId,
        existingBinding: existingBinding ? {
          id: existingBinding.id,
          status: existingBinding.status,
          clientId: existingBinding.clientId
        } : null,
        allBindings: mcpBindings.map(b => ({
          serverId: b.serverId,
          status: b.status,
          id: b.id
        }))
      });

      if (existingBinding) {
        console.log('🔴 [toggleMCPServer] 기존 연결 해제 중...');
        const disconnectResult = await dispatch({
          type: 'mcp_coordinator.disconnectMCPFromSession',
          payload: { sessionId, bindingId: existingBinding.id },
        });
        console.log('✅ [toggleMCPServer] 연결 해제 완료:', disconnectResult);
      } else {
        console.log('🟢 [toggleMCPServer] 새 연결 시작...');
        
        // 서버 정보 확인
        const serverInfo = store.mcp_registry?.servers[serverId];
        console.log('🔧 [toggleMCPServer] 서버 정보:', {
          serverId,
          serverExists: !!serverInfo,
          serverData: serverInfo ? {
            name: serverInfo.name,
            command: serverInfo.command,
            args: serverInfo.args,
            transportType: serverInfo.transportType,
            status: serverInfo.status
          } : null
        });
        
        if (!serverInfo) {
          throw new Error(`서버 ${serverId}가 Registry에 등록되지 않았습니다.`);
        }
        
        // 🔥 MCP Coordinator가 Transport 생성부터 연결까지 모두 처리함
        console.log('📡 [toggleMCPServer] MCP Coordinator에 연결 요청...');
        const connectResult = await dispatch({
          type: 'mcp_coordinator.connectMCPToSession',
          payload: { sessionId, serverId },
        });
        
        console.log('✅ [toggleMCPServer] 연결 요청 완료:', {
          connectResult,
          bindingId: connectResult
        });

        let attempts = 0;
        const maxAttempts = 50; // 5초 (100ms * 50)
        let connectionSuccessful = false;
        
        while (attempts < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, 100)); // 100ms 대기
          
          // 바인딩이 생성되었는지 확인
          const newBindings = store.mcp_coordinator?.sessionBindings[sessionId] || [];
          const newBinding = newBindings.find(binding => 
            binding.serverId === serverId && binding.status === 'active'
          );
          
          // 도구가 등록되었는지 확인
          const serverTools = store.mcp_registry ? Object.values(store.mcp_registry.tools || {})
            .filter(tool => tool.serverId === serverId) : [];
          
          if (newBinding && serverTools.length > 0) {
            console.log('🎉 [toggleMCPServer] 연결 및 도구 등록 완료!', {
              serverId,
              bindingId: newBinding.id,
              toolsCount: serverTools.length,
              tools: serverTools.map(t => t.name)
            });
            connectionSuccessful = true;
            break;
          }
          
          attempts++;
          if (attempts % 10 === 0) { // 1초마다 로그
            console.log(`⏳ [toggleMCPServer] 대기 중... ${attempts/10}초`);
          }
        }
        
        if (!connectionSuccessful) {
          console.warn('⚠️ [toggleMCPServer] 연결 대기 시간 초과, 그래도 계속 진행');
        }
        
        // 🔥 서버를 autoConnect로 설정하여 향후 자동 연결되도록 함
        try {
          await dispatch({
            type: 'mcp_registry.updateServerStatus',
            payload: { 
              serverId, 
              status: 'connected',
              options: { autoConnect: true }  // 🔥 자동 연결 활성화
            }
          });
          console.log('🔥 [toggleMCPServer] autoConnect 활성화됨:', serverId);
        } catch (error) {
          console.warn('⚠️ [toggleMCPServer] autoConnect 설정 실패:', error);
        }
        
        // 🔥 최종 상태 확인
        const finalServerInfo = store.mcp_registry?.servers[serverId];
        const finalServerTools = store.mcp_registry ? Object.values(store.mcp_registry.tools || {})
          .filter(tool => tool.serverId === serverId) : [];
        const finalBindings = store.mcp_coordinator?.sessionBindings[sessionId] || [];
        const finalBinding = finalBindings.find(binding => 
          binding.serverId === serverId && binding.status === 'active'
        );
        
        console.log('🔍 [toggleMCPServer] 최종 상태:', {
          serverId,
          serverStatus: finalServerInfo?.status,
          autoConnect: finalServerInfo?.autoConnect,
          toolsCount: finalServerTools.length,
          tools: finalServerTools.map(t => t.name),
          id: finalBinding?.id,
          hasBinding: !!finalBinding,
          connectionSuccessful
        });
      }
    } catch (error) {
      console.error('❌ [toggleMCPServer] 실패:', {
        serverId,
        sessionId,
        error: error instanceof Error ? {
          message: error.message,
          stack: error.stack,
          name: error.name
        } : error,
        timestamp: new Date().toISOString()
      });
      
      // 에러를 다시 던지지 않고 로그만 남김 (상위에서 처리)
      throw error;
    }
  }, [sessionId, store, dispatch]);

  // MCP 서버 연결 해제 (Disconnect) 직접 구현
  const handleDisconnectMCP = useCallback(async (bindingId: string) => {
    if (!sessionId || !bindingId) return;
    await dispatch({
      type: 'mcp_coordinator.disconnectMCPFromSession',
      payload: { sessionId, bindingId },
    });
  }, [sessionId, dispatch]);

  return {
    toggleMCPServer,
    handleDisconnectMCP
  };
} 