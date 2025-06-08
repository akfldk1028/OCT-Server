import { useMemo } from 'react';
import { useStore } from '@/hooks/useStore';

export function useChatData(sessionId: string | undefined) {
  const store = useStore();

  // 세션 정보 가져오기
  const session = sessionId ? store.session.sessions[sessionId] : null;
  const room = session ? store.room.rooms[session.roomId] : null;
  const messages = sessionId ? store.chat.messages[sessionId] || [] : [];
  const chatConfig = sessionId ? store.chat.configs[sessionId] : null;
  const mcpBindings = store.mcp_coordinator?.sessionBindings[sessionId!] || [];

  // 🚀 워크플로우 실행 상태 추적
  const activeWorkflowExecutions = store.workflow?.executions ? 
    Object.values(store.workflow.executions).filter(exec => exec.status === 'running') : [];

  // 사용 가능한 리소스들
  const availableData = useMemo(() => {
    const availableModels = Object.values(store.open_router?.models || {});
    const availableServers = Object.values(store.mcp_registry?.servers || {});
    const activeTools = chatConfig?.activeTools || [];
    
    // MCP 리소스들 필터링
    const availableTools = store.mcp_registry ? Object.values(store.mcp_registry.tools || {})
      .filter(tool => mcpBindings.some(b => b.serverId === tool.serverId && b.status === 'active')) : [];
    const availablePrompts = store.mcp_registry ? Object.values(store.mcp_registry.prompts || {})
      .filter(prompt => mcpBindings.some(b => b.serverId === prompt.serverId && b.status === 'active')) : [];
    const availableResources = store.mcp_registry ? Object.values(store.mcp_registry.resources || {})
      .filter(resource => mcpBindings.some(b => b.serverId === resource.serverId && b.status === 'active')) : [];

    return {
      availableModels,
      availableServers,
      activeTools,
      availableTools,
      availablePrompts,
      availableResources
    };
  }, [store, chatConfig, mcpBindings]);

  return {
    // 기본 세션 데이터
    session,
    room,
    messages,
    chatConfig,
    mcpBindings,
    
    // 워크플로우 상태
    activeWorkflowExecutions,
    
    // 사용 가능한 리소스들
    ...availableData
  };
} 