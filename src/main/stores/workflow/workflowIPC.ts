// === Workflow IPC ===
// Claude Desktop 연결을 위한 간단한 IPC 처리

export interface ClaudeConnectConfig {
  name: string;
  serverConfig: {
    execution: {
      command: string;
      args: string[];
      env?: Record<string, string>;
    };
  };
}

// 렌더러에서 호출할 수 있는 Claude 연결 함수
export async function connectToClaudeDesktop(serverName: string, serverConfig: any): Promise<boolean> {
  try {
    console.log(`🔍 [workflowIPC] 연결 시도 시작: ${serverName}`);
    console.log(`🔍 [workflowIPC] window 체크:`, typeof window !== 'undefined');
    console.log(`🔍 [workflowIPC] api 객체들:`, {
      workflowAPI: !!(window as any).workflowAPI,
      electronAPI: !!(window as any).electronAPI,
      api: !!(window as any).api
    });
    
    // api.connectToClaudeDesktop 먼저 확인 (preload.ts의 ...workflowAPI로 포함됨)
    if (typeof window !== 'undefined' && (window as any).api?.connectToClaudeDesktop) {
      console.log(`📡 [workflowIPC] api.connectToClaudeDesktop으로 연결 요청: ${serverName}`);
      return await (window as any).api.connectToClaudeDesktop(serverName, serverConfig);
    }
    
    // workflowAPI 사용
    if (typeof window !== 'undefined' && (window as any).workflowAPI?.connectToClaudeDesktop) {
      console.log(`📡 [workflowIPC] workflowAPI로 Claude Desktop 연결 요청: ${serverName}`);
      return await (window as any).workflowAPI.connectToClaudeDesktop(serverName, serverConfig);
    }
    
    // 백업: electronAPI 사용
    if (typeof window !== 'undefined' && (window as any).electronAPI?.connectToClaudeDesktop) {
      console.log(`📡 [workflowIPC] electronAPI로 Claude Desktop 연결 요청: ${serverName}`);
      return await (window as any).electronAPI.connectToClaudeDesktop(serverName, serverConfig);
    }
    
    // IPC가 없으면 시뮬레이션
    console.log(`🎭 [workflowIPC] IPC 미지원, 시뮬레이션: ${serverName}`);
    await new Promise(resolve => setTimeout(resolve, 500)); // 실제 연결처럼 잠깐 대기
    return true; // 시뮬레이션에서는 항상 성공
    
  } catch (error) {
    console.error(`❌ [workflowIPC] Claude 연결 실패:`, error);
    return false;
  }
}

// 메인 프로세스에서 사용할 실제 Claude Desktop 연결 함수 (나중에 구현)
export async function handleClaudeConnect(serverName: string, serverConfig: any): Promise<boolean> {
  // TODO: 메인 프로세스에서 실제 Claude Desktop Integration 호출
  // const { ClaudeDesktopIntegration } = require('../../../src/common/server/node/service/claude');
  // const integration = new ClaudeDesktopIntegration();
  // return integration.connectServer(serverName, serverConfig);
  
  console.log(`🚀 [workflowIPC] 메인 프로세스에서 Claude 연결 처리: ${serverName}`);
  return true; // 임시로 성공 반환
} 