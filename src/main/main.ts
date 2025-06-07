import path from 'path';
import { app, BrowserWindow, ipcMain, globalShortcut } from 'electron';
import { autoUpdater } from 'electron-updater';
import log from 'electron-log';
import installExtension, {
  REACT_DEVELOPER_TOOLS,
} from 'electron-devtools-installer';
import './mcp/serverHandlers';
// 환경 변수 로드
import dotenv from 'dotenv';
import {
  // getBaseMCPServerConfig,  // ✅ 제거됨 - installerStore에서 처리
  // getMergedMCPServerConfig,  // ✅ 제거됨
  // updateServerInstallStatus,  // ✅ 제거됨
  getServerSessionInfo,
  userConfig
} from './src/common/configLoader';
// import type { MCPServerExtended } from './src/common/types/server-config';  // ✅ 제거됨
import { manager } from './src/common/manager/managerInstance';
import { setupMcpHealthCheckHandlers } from './src/common/server/services/mcpHealthCheck';
import { ServerInstanceFactory } from './src/common/manager/ServerInstanceFactory';
import { NodeExecutorFactory } from './src/workflow/executors/NodeExecutorFactory';
import { ExecutionContext } from './src/workflow/executors/node-executor-types';
import { ClaudeDesktopIntegration } from './src/workflow/clients/claude';

// 소프트웨어 가이드 기능 관련 임포트
// import { GuideManager } from './GuideManager';
import { aiService } from './overlay/SimpleAIService';

// 윈도우 관리 모듈 임포트
import { createMainWindow, hideWindowBlock } from './window';

import { createZustandBridge } from '@zubridge/electron/main';


// import { store } from './computer/antropic/create';
import { store } from './computer/overlay/create';
import {combinedStore} from  './stores/combinedStore'

import {setupMCPHandlers} from "@/main/mcp-handler";
import {setupMCPpreLoad} from "@/main/stores/renderProxy/rendererMCPProxy-preload";

dotenv.config();

// 로그 출력
console.log('[Main Process] dotenv loaded.');
console.log('SUPABASE_URL:', process.env.SUPABASE_URL);
console.log('SUPABASE_ANON_KEY:', process.env.SUPABASE_ANON_KEY);

// function getPythonPath() {  // ✅ 제거됨 - installer-helpers.ts에서 처리
//   if (app.isPackaged) {
//     return path.join(process.resourcesPath, 'python', 'python.exe');
//   } else {
//     return path.join(process.cwd(), 'python', 'python.exe');
//   }
// }

// const installer = new ServerInstaller(); // ✅ 제거됨 - 새로운 installerStore 사용

class AppUpdater {
  constructor() {
    log.transports.file.level = 'info';
    autoUpdater.logger = log;
    autoUpdater.checkForUpdatesAndNotify();
  }
}

let mainWindow: BrowserWindow | null = null;
const isDebug =
  process.env.NODE_ENV === 'development' || process.env.DEBUG_PROD === 'true';

if (isDebug) {
  require('electron-debug').default();
}

const installExtensions = async () => {
  try {
    const name = await installExtension(REACT_DEVELOPER_TOOLS, {
      loadExtensionOptions: { allowFileAccess: true },
    });
  } catch (err) {
    console.error('❌ Failed to install React DevTools:', err);
  }
};

const appDataPath = path.join(
  process.env.APPDATA ||
    (process.platform === 'darwin'
      ? `${process.env.HOME}/Library/Application Support`
      : `${process.env.HOME}/.local/share`),
  'mcp-server-manager',
);

const createWindow = async () => {
  if (isDebug) {
    await installExtensions();
  }

  try {
    await manager.startServer('local-express-server');
    const loadedCount = ServerInstanceFactory.loadServerConfigs(appDataPath);
    console.log(`📊 [main] 서버 인스턴스 로드 완료: ${loadedCount}개 서버 로드됨`);
  } catch (error) {
    console.error('❌ [main] Express 로컬 서버 시작 실패:', error);
  }

  const RESOURCES_PATH = app.isPackaged
    ? path.join(process.resourcesPath, 'assets')
    : path.join(__dirname, '../../assets');
  const getAssetPath = (...paths: string[]) => path.join(RESOURCES_PATH, ...paths);

  // 메인 윈도우 생성 및 옵션 전달
  mainWindow = await createMainWindow(getAssetPath, {
    width: 1024,
    height: 728,
    // transparent: true,
  });


  if (mainWindow) {
    // const { unsubscribe } = createZustandBridge(store, [mainWindow]);
    const { unsubscribe } = createZustandBridge(combinedStore, [mainWindow]);

    // reducer: rootReducer,
    app.on('window-all-closed', unsubscribe);

  }

  mainWindow.on('ready-to-show', () => {
    BrowserWindow.getAllWindows().forEach(window => {
      if (window.webContents.isDevToolsOpened()) {
        window.webContents.closeDevTools();
      }
    });

  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  new AppUpdater();
};

app.on('window-all-closed', () => {
  try {
    manager.stopServer('remote-mcp-server');
    manager.stopServer('local-express-server');


  } catch (err) {
    console.error('서버 종료 중 오류:', err);
  }
  if (process.platform !== 'darwin') app.quit();
});

app.whenReady()
  .then(async () => {
    if (isDebug) await installExtensions();
    // store.getState().INIT_API_KEY();
    // store.getState().SET_API_KEY(
    //   "sk-proj-...",
    //   '수동 설정'
    // );
    createWindow();
    setupMcpHealthCheckHandlers();

    // 파이썬 스크립트 예시 생략...
    setupMCPHandlers();
    setupMCPpreLoad();
    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  })
  .catch(console.log);

app.on('before-quit', async () => {});
app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});


// ===== MCP 서버 관련 IPC 핸들러 =====

// 🔥 서버 설치 - 새로운 installerStore로 이관됨
// 이제 renderer에서 직접 installerStore를 사용하므로 이 핸들러는 필요 없음
// ipcMain.handle('installServer', ...)  // ✅ 제거됨

// 활성 세션 조회
ipcMain.handle('mcp:getActiveSessions', async (event, serverName?: string) => {
  try {
    return await manager.getActiveSessions(serverName);
  } catch (error) {
    console.error('Error getting active sessions:', error);
    return [];
  }
});

// 세션 ID 조회
ipcMain.handle('mcp:getSessionId', async (event, config) => {
  const serverId = config?.id || config?.name;
  if (!serverId) return null;
  try {
    const sessionInfo = getServerSessionInfo(serverId);
    return sessionInfo?.sessionId || null;
  } catch (e) {
    console.error('[main] mcp:getSessionId error:', e);
    return null;
  }
});

// 워크플로우 실행
ipcMain.handle('workflow:execute', async (event, payload) => {
  console.log('🔥 [main] workflow:execute 핸들러 시작');
  console.log('📨 [main] 받은 payload:', JSON.stringify(payload, null, 2));
  
  const { workflowId, nodes, edges, triggerId, context } = payload;
  const results: Record<string, any> = {};
  let currentContext = context || {};

  console.log(`🎯 [main] 처리할 노드 개수: ${nodes.length}`);

  // 🔥 새로운 workflow 시스템 사용
  const claudeIntegration = new ClaudeDesktopIntegration();
  const executorFactory = new NodeExecutorFactory(claudeIntegration);
  const executionContext = new ExecutionContext();

  // 기존 context 데이터가 있으면 ExecutionContext에 복사
  if (currentContext) {
    Object.entries(currentContext).forEach(([key, value]) => {
      executionContext.set(key, value);
    });
  }

  for (const node of nodes) {
    console.log(`🔄 [main] 노드 ${node.id} (${node.type}) 처리 시작`);
    console.log(`📊 [main] 노드 데이터:`, {
      id: node.id,
      type: node.type,
      'data': node.data,
      'data.config': node.data?.config,
      'data.name': node.data?.name
    });
    
    try {
      const executor = executorFactory.create(node);
      console.log(`⚡ [main] NodeExecutor 생성됨: ${executor ? '성공' : '실패'}`);
      
      if (executor && executor.execute) {
        const executePayload = {
          nodeId: String(node.id),
          context: executionContext,
          nodes,
          edges,
          triggerId
        };
        
        const result = await executor.execute(executePayload);
        console.log(`✅ [main] 노드 ${node.id} 실행 완료:`, result);
        
        results[node.id] = result;
        executionContext.set(String(node.id), result);
        Object.assign(currentContext, result);
      } else {
        console.log(`⚠️ [main] 노드 ${node.id} executor가 없거나 execute 메서드가 없음`);
      }
    } catch (error: unknown) {
      let message = 'Unknown error';
      if (error && typeof error === 'object' && 'message' in error) {
        message = (error as any).message;
      } else if (typeof error === 'string') {
        message = error;
      }
      console.error(`❌ [main] 노드 ${node.id} 실행 실패:`, message);
      results[node.id] = { error: true, message };
      break;
    }
  }

  console.log('🏁 [main] workflow:execute 완료, 최종 결과:', currentContext);
  
  return {
    success: true,
    finalData: currentContext,
  };
});

// Claude 관련 핸들러
ipcMain.handle('claude:getAllServers', () => {
  const claude = new ClaudeDesktopIntegration();
  return claude.getAllConnectedServers();
});

ipcMain.handle('claude:removeServer', (event, serverName) => {
  const claude = new ClaudeDesktopIntegration();
  return claude.disconnectServer(serverName);
});

// === Claude Desktop 연결 핸들러 ===
ipcMain.handle('connect-to-claude-desktop', async (event, serverName: string, serverConfig: any) => {
  console.log(`🚀 [main] Claude Desktop 연결 요청: ${serverName}`);
  
  try {
    const claude = new ClaudeDesktopIntegration();
    const connected = claude.connectServer(serverName, serverConfig);
    
    console.log(`${connected ? '✅' : '❌'} [main] Claude Desktop 연결 결과: ${serverName} - ${connected ? '성공' : '실패'}`);
    return connected;
    
  } catch (error) {
    console.error(`❌ [main] Claude Desktop 연결 오류: ${serverName}`, error);
    return false;
  }
});

