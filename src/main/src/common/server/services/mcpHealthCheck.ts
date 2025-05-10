// src/main/services/mcpHealthCheck.ts

import { BrowserWindow, ipcMain } from 'electron';
import fetch from 'node-fetch';

// 서버 헬스 체크 함수
async function checkServerHealth(serverUrl: string): Promise<{
  isHealthy: boolean;
  status?: string;
  error?: string;
}> {
  try {
    const response = await fetch(`${serverUrl}/health`);
    if (response.ok) {
      const data = await response.json() as { status: string };
      return {
        isHealthy: true,
        status: data.status
      };
    } else {
      return {
        isHealthy: false,
        error: `서버 응답 오류: ${response.status}`
      };
    }
  } catch (error) {
    return {
      isHealthy: false,
      error: `연결 오류: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

// 세션 ID 생성 및 MCP 서버 연결 함수
async function connectToMcpServer(
  serverUrl: string,
  options: {
    transportType: 'stdio' | 'sse' | 'streamable-http';
    command?: string;
    args?: string;
  }
): Promise<{
  success: boolean;
  sessionId?: string;
  error?: string;
}> {
  try {
    // 연결 URL 구성
    let url = '';
    if (options.transportType === 'stdio' && options.command) {
      url = `${serverUrl}/stdio?transportType=${options.transportType}&command=${encodeURIComponent(options.command)}`;
      if (options.args) {
        url += `&args=${encodeURIComponent(options.args)}`;
      }
    } else if (options.transportType === 'sse' || options.transportType === 'streamable-http') {
      url = `${serverUrl}/mcp?transportType=${options.transportType}`;
    }

    // 서버에 연결 요청
    const response = await fetch(url);
    
    if (response.ok) {
      // 세션 ID는 응답 헤더에서 가져옴
      const sessionId = response.headers.get('mcp-session-id');
      
      if (sessionId) {
        return {
          success: true,
          sessionId
        };
      } else {
        // SSE 연결의 경우 세션 ID는 응답 본문의 첫 번째 메시지에 포함될 수 있음
        // 이 경우 응답 스트림을 처리하는 로직이 필요함
        return {
          success: true,
          sessionId: 'session-pending' // 임시 값, 실제로는 응답 스트림 처리 필요
        };
      }
    } else {
      return {
        success: false,
        error: `서버 연결 실패: ${response.status}`
      };
    }
  } catch (error) {
    return {
      success: false,
      error: `연결 오류: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

// IPC 핸들러 설정
export function setupMcpHealthCheckHandlers() {
  // 서버 상태 확인 핸들러
  ipcMain.handle('mcp:checkHealth', async (_, serverUrl: string) => {
    return await checkServerHealth(serverUrl);
  });
  
  // 서버 연결 및 세션 ID 가져오기 핸들러
  ipcMain.handle('mcp:connect', async (_, serverUrl: string, options: {
    transportType: 'stdio' | 'sse' | 'streamable-http';
    command?: string;
    args?: string;
  }) => {
    return await connectToMcpServer(serverUrl, options);
  });
  
  // 정기적인 헬스 체크 시작/중지 관련 상태
  let healthCheckIntervals: Record<string, NodeJS.Timeout> = {};
  
  // 정기적인 헬스 체크 시작
  ipcMain.handle('mcp:startHealthCheck', (_, serverId: string, serverUrl: string, interval: number = 30000) => {
    // 이미 실행 중인 헬스 체크가 있으면 중지
    if (healthCheckIntervals[serverId]) {
      clearInterval(healthCheckIntervals[serverId]);
    }
    
    // 새로운 헬스 체크 시작
    healthCheckIntervals[serverId] = setInterval(async () => {
      const result = await checkServerHealth(serverUrl);
      // 결과를 렌더러 프로세스로 전송
      if (BrowserWindow.getAllWindows().length > 0) {
        BrowserWindow.getAllWindows()[0].webContents.send('mcp:healthUpdate', {
          serverId,
          ...result
        });
      }
    }, interval);
    
    return { success: true };
  });
  
  // 정기적인 헬스 체크 중지
  ipcMain.handle('mcp:stopHealthCheck', (_, serverId: string) => {
    if (healthCheckIntervals[serverId]) {
      clearInterval(healthCheckIntervals[serverId]);
      delete healthCheckIntervals[serverId];
      return { success: true };
    }
    return { success: false, error: '실행 중인 헬스 체크가 없습니다.' };
  });
}