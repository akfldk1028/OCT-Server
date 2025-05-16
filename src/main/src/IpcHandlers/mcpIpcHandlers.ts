// mcpIpcHandlers.ts

import { ipcMain } from 'electron'
import { IMcpManagerDeps } from '../../../main/main'

export function initializeMcpIpcHandlers(deps: IMcpManagerDeps): void {
  console.log("Initializing MCP IPC handlers")

  // MCP 서버 상태 조회
  ipcMain.handle('server:getStatus', async () => {
    try {
      const allServers = await Promise.all(
        deps.mcpManager.getAllServers().map(server => 
          deps.mcpManager.getServerStatus(server.name)
        )
      );
      return allServers.filter(server => 
        server && server.name !== 'local-express-server'
      );
    } catch (error) {
      console.error('서버 상태 조회 오류:', error);
      return { error: '서버 상태 조회 실패' };
    }
  });

  // 전체 서버 설정 정보 조회
  ipcMain.handle('server:getFullConfigs', async () => {
    try {
      const allServers = deps.mcpManager.getAllServersWithFullConfig();
      return allServers.filter(server => server.name !== 'local-express-server');
    } catch (error) {
      console.error('서버 전체 설정 조회 오류:', error);
      return { error: '서버 전체 설정 조회 실패' };
    }
  });

  // MCP 서버 시작
  ipcMain.handle('server:start', async (_, name) => {
    try {
      if (!name || name === 'undefined' || typeof name !== 'string') {
        console.error(`유효하지 않은 서버 시작 요청: "${name}"`);
        return { success: false, message: '유효한 서버 이름이 필요합니다.' };
      }
      
      const server = deps.mcpManager.getServer(name);
      if (!server) {
        console.error(`존재하지 않는 서버(${name}) 시작 요청`);
        return { success: false, message: `서버 '${name}'을 찾을 수 없습니다.` };
      }
      
      console.log(`[mcpIpc] 서버 시작 요청: ${name}`);
      await deps.mcpManager.startServer(name);
      return { success: true, message: `${name} 서버가 시작되었습니다.` };
    } catch (error) {
      console.error(`${name || 'unknown'} 서버 시작 오류:`, error);
      return { 
        success: false, 
        message: `${name || 'unknown'} 서버 시작 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`
      };
    }
  });

  // MCP 서버 중지
  ipcMain.handle('server:stop', async (_, name) => {
    try {
      await deps.mcpManager.stopServer(name);
      return { success: true, message: `${name} 서버가 중지되었습니다.` };
    } catch (error) {
      console.error(`${name} 서버 중지 오류:`, error);
      return { success: false, error: `${name} 서버 중지 실패` };
    }
  });

  // MCP 서버 재시작
  ipcMain.handle('server:restart', async (_, name) => {
    try {
      await deps.mcpManager.stopServer(name);
      await new Promise(resolve => setTimeout(resolve, 1000)); // 1초 대기
      await deps.mcpManager.startServer(name);
      return { success: true, message: `${name} 서버가 재시작되었습니다.` };
    } catch (error) {
      console.error(`${name} 서버 재시작 오류:`, error);
      return { success: false, error: `${name} 서버 재시작 실패` };
    }
  });

  // MCP 서버 설치
  ipcMain.handle('installServer', async (event, serverName: string, command: string, envVars?: Record<string, string>) => {
    console.log('⬇️ mcpIpc: installServer handler received for', serverName, command);
    console.log('⬇️ mcpIpc: with environment variables:', envVars || 'none');

    try {
      const result = await deps.mcpManager.installServer(serverName, command, envVars);
      
      // 설치 완료 후 서버 목록 업데이트 알림
      if (result.success) {
        const mainWindow = deps.getMainWindow();
        if (mainWindow) {
          mainWindow.webContents.send('serversUpdated', await deps.mcpManager.getStatus());
        }
      }
      
      return result;
    } catch (error) {
      console.error(`[mcpIpc] Error during install process for ${serverName}:`, error);
      return { 
        success: false, 
        error: `설치 중 오류 발생: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  });

  // 모든 서버 목록 조회
  ipcMain.handle('server:getAllServers', async () => {
    try {
      return deps.mcpManager.getAllServers().map(server => ({
        name: server.name,
        status: server.status
      }));
    } catch (error) {
      console.error('서버 목록 조회 오류:', error);
      return { error: '서버 목록 조회 실패' };
    }
  });

  // MCP 세션 관리
  ipcMain.handle('mcp:getSessionId', async (_, config) => {
    const serverId = config?.id || config?.name;
    if (!serverId) return null;
    
    try {
      const sessionInfo = deps.mcpManager.getServerSessionInfo(serverId);
      return sessionInfo?.sessionId || null;
    } catch (error) {
      console.error('[mcpIpc] mcp:getSessionId error:', error);
      return null;
    }
  });

  // 활성 세션 조회
  ipcMain.handle('mcp:getActiveSessions', async (_, serverName?: string) => {
    try {
      return await deps.mcpManager.getActiveSessions(serverName);
    } catch (error) {
      console.error('Error getting active sessions:', error);
      return [];
    }
  });

  // 세션 저장
  ipcMain.handle('server:saveSession', async (_, serverId: string, sessionInfo: any) => {
    try {
      deps.mcpManager.updateServerSessionInfo(serverId, {
        sessionId: sessionInfo.sessionId,
        lastConnected: new Date().toISOString(),
        transportType: sessionInfo.transportType,
        active: sessionInfo.active,
      });
      console.log(`[mcpIpc] 서버 ${serverId} 세션 저장됨: 세션ID ${sessionInfo.sessionId}`);
      return { success: true };
    } catch (error) {
      console.error('Failed to save session:', error);
      return { success: false, message: error };
    }
  });

  // 세션 조회
  ipcMain.handle('server:getSession', async (_, serverId: string) => {
    try {
      const sessionInfo = deps.mcpManager.getServerSessionInfo(serverId);
      return sessionInfo;
    } catch (error) {
      console.error('Failed to get session:', error);
      return null;
    }
  });

  // 세션 유효성 검사
  ipcMain.handle('server:validateSession', async (_, sessionId: string) => {
    try {
      return await deps.mcpManager.validateSession(sessionId);
    } catch (error) {
      console.error('Failed to validate session:', error);
      return { valid: false, message: `Error: ${error}` };
    }
  });

  // 세션 정리
  ipcMain.handle('server:cleanupSessions', async () => {
    try {
      return await deps.mcpManager.cleanupSessions();
    } catch (error) {
      console.error('Failed to cleanup sessions:', error);
      return { cleaned: 0, remaining: 0 };
    }
  });

  // 워크플로우 실행
  ipcMain.handle('workflow:execute', async (_, payload) => {
    try {
      return await deps.mcpManager.executeWorkflow(payload);
    } catch (error) {
      console.error('Workflow execution error:', error);
      return { success: false, error: error.message };
    }
  });

  // Claude Desktop 통합
  ipcMain.handle('claude:getAllServers', () => {
    return deps.mcpManager.getClaudeConnectedServers();
  });

  ipcMain.handle('claude:removeServer', (_, serverName) => {
    return deps.mcpManager.disconnectFromClaude(serverName);
  });

  // MCP 헬스 체크
  ipcMain.handle('mcp:checkHealth', async (_, serverUrl = 'http://localhost:4303') => {
    try {
      return await deps.mcpManager.checkHealth(serverUrl);
    } catch (error) {
      console.error('Health check error:', error);
      return { healthy: false, error: error.message };
    }
  });

  // 서버 로그 조회
  ipcMain.handle('server:getLogs', async (_, serverId: string, lines?: number) => {
    try {
      return await deps.mcpManager.getServerLogs(serverId, lines);
    } catch (error) {
      console.error('Error getting server logs:', error);
      return [];
    }
  });

  // 서버 설정 업데이트
  ipcMain.handle('server:updateConfig', async (_, serverId: string, config: any) => {
    try {
      await deps.mcpManager.updateServerConfig(serverId, config);
      return { success: true, message: '서버 설정이 업데이트되었습니다.' };
    } catch (error) {
      console.error('Error updating server config:', error);
      return { success: false, message: message };
    }
  });

  // 서버 설정 제거
  ipcMain.handle('server:removeConfig', async (_, serverId: string) => {
    try {
      await deps.mcpManager.removeServerConfig(serverId);
      return { success: true, message: '서버 설정이 제거되었습니다.' };
    } catch (error) {
      console.error('Error removing server config:', error);
      return { success: false, message: error.message };
    }
  });
}