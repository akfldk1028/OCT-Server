import { ipcMain } from 'electron';
import { manager } from '../src/common/manager/managerInstance';
import { getServerSessionInfo, updateServerInstallStatus, userConfig } from '../src/common/configLoader';

ipcMain.handle('server:start', async (_, name) => {
    try {
      // 서버 이름 유효성 검사 강화
      if (!name || name === 'undefined' || typeof name !== 'string') {
        console.error(`유효하지 않은 서버 시작 요청: "${name}" (타입: ${typeof name})`);
        return { success: false, message: '유효한 서버 이름이 필요합니다.' };
      }

      // 서버 존재 여부 확인
      const server = manager.getServer(name);
      if (!server) {
        console.error(`존재하지 않는 서버(${name}) 시작 요청을 받았습니다`);
        return { success: false, message: `서버 '${name}'을 찾을 수 없습니다.` };
      }

      console.log(`[main] 서버 시작 요청: ${name}`);
      await manager.startServer(name);
      return { success: true, message: `${name} 서버가 시작되었습니다.` };
    } catch (error) {
      console.error(`${name || 'unknown'} 서버 시작 오류:`, error);
      return { success: false, message: `${name || 'unknown'} 서버 시작 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}` };
    }
  });

  ipcMain.handle('server:stop', async (_, name) => {
    try {
      await manager.stopServer(name);
      return { success: true, message: `${name} 서버가 중지되었습니다.` };
    } catch (error) {
      console.error(`${name} 서버 중지 오류:`, error);
      return { success: false, error: `${name} 서버 중지 실패` };
    }
  });


  ipcMain.handle('server:saveSession', async (_, serverId: string, sessionInfo: any) => {
  try {
    // configLoader의 updateServerInstallStatus 함수 사용
    updateServerInstallStatus(serverId, {
      sessionId: sessionInfo.sessionId,
      lastConnected: new Date().toISOString(),
      transportType: sessionInfo.transportType,
      active: sessionInfo.active,
    });
    console.log(`[Main] 서버 ${serverId} 세션 저장됨: 세션ID ${sessionInfo.sessionId} (active: ${sessionInfo.active ? 'true' : 'false'})`);
    return { success: true };
  } catch (error) {
    console.error('Failed to save session:', error);
    return { success: false, message: error };
  }
});

// 세션 가져오기
// src/main/main.ts

// 세션 가져오기 - 간단한 버전
ipcMain.handle('server:getSession', async (_, serverId: string) => {
  try {
    const sessionInfo = getServerSessionInfo(serverId);
    return sessionInfo;
  } catch (error) {
    console.error('Failed to get session:', error);
    return null;
  }
});


// 세션 유효성 검사
ipcMain.handle('server:validateSession', async (_, sessionId: string) => {
  try {
    // 1. Express 서버로 세션 상태 확인 요청
    try {
      const response = await fetch(`http://localhost:4303/mcp/session/${sessionId}/status`);
      if (response.ok) {
        const data = await response.json();
        return { valid: true, active: data.active, message: 'Session is valid' };
      }
    } catch (error) {
      console.log('Express 세션 API 사용 불가능, 로컬 설정에서 확인 시도');
    }

    // 2. Express 서버 사용 불가능한 경우, userServers.json에서 모든 서버 확인
    for (const serverId in userConfig.mcpServers) {
      const sessionInfo = getServerSessionInfo(serverId);
      if (sessionInfo?.sessionId === sessionId) {
        // 마지막 연결 시간 확인 (24시간 이내인지)
        const lastConnected = new Date(sessionInfo.lastConnected || '');
        const isRecent = !isNaN(lastConnected.getTime()) &&
          (Date.now() - lastConnected.getTime() < 24 * 60 * 60 * 1000);

        return {
          valid: true,
          active: sessionInfo.active === true,
          message: isRecent ? 'Session found in local config (recent)' : 'Session found but might be stale'
        };
      }
    }

    return { valid: false, message: 'Session not found' };
  } catch (error) {
    console.error('Failed to validate session:', error);
    return { valid: false, message: `Error: ${error}` };
  }
});

// 만료된 세션 정리
ipcMain.handle('server:cleanupSessions', async () => {
  // TODO: 구현
  return { cleaned: 0, remaining: 0 };
});

// 서버 관리 관련 IPC 핸들러 추가
ipcMain.handle('server:getStatus', async () => {
  try {
    // 모든 서버 상태를 가져온 다음, Express 서버를 필터링하여 제외
    const allServers = await Promise.all(
      manager.getAllServers().map(server => manager.getServerStatus(server.name))
    );
    return allServers.filter(server => server && server.name !== 'local-express-server');
  } catch (error) {
    console.error('서버 상태 조회 오류:', error);
    return { error: '서버 상태 조회 실패' };
  }
});

// 전체 서버 설정 정보를 가져오는 핸들러 추가
ipcMain.handle('server:getFullConfigs', async () => {
  try {
    const allServers = manager.getAllServersWithFullConfig();
    // Express 서버 제외
    return allServers.filter(server => server.name !== 'local-express-server');
  } catch (error) {
    console.error('서버 전체 설정 조회 오류:', error);
    return { error: '서버 전체 설정 조회 실패' };
  }
});


ipcMain.handle('server:getAllServers', async () => {
  try {
    return manager.getAllServers().map(server => ({
      name: server.name,
      status: server.status
    }));
  } catch (error) {
    console.error('서버 목록 조회 오류:', error);
    return { error: '서버 목록 조회 실패' };
  }
});


ipcMain.on('ipc-example', async (event, arg) => {
  const msgTemplate = (pingPong: string) => `IPC test: ${pingPong}`;
  console.log(msgTemplate(arg));
  event.reply('ipc-example', msgTemplate('pong'));
});
