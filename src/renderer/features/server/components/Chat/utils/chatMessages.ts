// utils/chatMessages.ts
interface ChatMessagePayload {
    sessionId: string;
    message: {
      id: string;
      content: string;
      role: 'assistant' | 'user' | 'system';
      timestamp: string;
      metadata?: any;
    };
  }
  
  export const sendChatMessage = async (dispatch: any, payload: ChatMessagePayload) => {
    return dispatch({
      type: 'chat.addMessage',
      payload
    });
  };
  
  // 메시지 생성 헬퍼 함수들
  export const createWindowConnectedMessage = (windowInfo: any, aiClientId: string | null) => {
    const windowName = typeof windowInfo === 'string' ? windowInfo : windowInfo.name;
    
    return {
      id: `ai-window-notification-${Date.now()}`,
      content: `🤖 **AI Assistant • 창 연결 완료**\n\n🎯 **${windowName}** 창이 성공적으로 연결되었습니다!\n\n📊 **창 정보:**\n• 📍 위치: ${typeof windowInfo === 'object' ? `(${windowInfo.x}, ${windowInfo.y})` : '정보 없음'}\n• 📏 크기: ${typeof windowInfo === 'object' ? `${windowInfo.width} × ${windowInfo.height} 픽셀` : '정보 없음'}\n• 🔗 상태: 실시간 연결됨\n\n💡 이제 이 창과 관련된 모든 작업을 도와드릴 수 있습니다! 무엇을 도와드릴까요?`,
      role: 'assistant' as const,
      timestamp: new Date().toISOString(),
      metadata: {
        type: 'window-connection',
        windowInfo,
        isCooperative: true,
        avatar: 'ai',
        clientId: aiClientId
      }
    };
  };
  
  export const createWindowDisconnectedMessage = (windowInfo: any, aiClientId: string | null) => {
    const windowName = typeof windowInfo === 'string' ? windowInfo : windowInfo.name;
    
    return {
      id: `ai-window-disconnect-${Date.now()}`,
      content: `🤖 **AI Assistant • 창 연결 해제**\n\n🔄 **${windowName}** 창과의 연결이 해제되었습니다.\n\n📋 **변경사항:**\n• 🔗 창 연결: 해제됨\n• 💬 모드: 일반 채팅으로 전환\n• 🎯 상태: 대기 중\n\n💡 언제든지 다시 창을 선택하여 연결할 수 있습니다!`,
      role: 'assistant' as const,
      timestamp: new Date().toISOString(),
      metadata: {
        type: 'window-disconnection',
        previousWindowInfo: windowInfo,
        isCooperative: true,
        avatar: 'ai',
        clientId: aiClientId
      }
    };
  };
  
  export const createWindowSelectionStartMessage = (aiClientId: string | null) => {
    return {
      id: `ai-window-selection-start-${Date.now()}`,
      content: `🤖 **AI Assistant • 창 선택 모드**\n\n🎯 창 선택 모드가 시작되었습니다!\n\n📋 **사용법:**\n• 🖱️ 마우스로 원하는 창을 클릭해주세요\n• ⌨️ ESC 키로 취소 가능\n• 🔄 창이 선택되면 자동으로 연결됩니다\n\n💡 잠시만 기다려주세요...`,
      role: 'assistant' as const,
      timestamp: new Date().toISOString(),
      metadata: {
        type: 'window-selection-start',
        isCooperative: true,
        avatar: 'ai',
        clientId: aiClientId
      }
    };
  };
  
  export const createWindowChangingMessage = (windowName: string, windowInfo: any, aiClientId: string | null) => {
    return {
      id: `ai-window-changing-${Date.now()}`,
      content: `🤖 **AI Assistant • 창 변경 중**\n\n🔄 현재 **${windowName}** 창에서 다른 창으로 변경하고 있습니다...\n\n📋 **진행 상황:**\n• 🎯 새로운 창 선택 대기 중\n• 🖱️ 마우스로 원하는 창을 클릭해주세요\n• ⌨️ ESC 키로 취소 가능\n\n💡 새로운 창을 선택하면 자동으로 연결됩니다!`,
      role: 'assistant' as const,
      timestamp: new Date().toISOString(),
      metadata: {
        type: 'window-changing',
        previousWindowInfo: windowInfo,
        isCooperative: true,
        avatar: 'ai',
        clientId: aiClientId
      }
    };
  };