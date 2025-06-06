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
  getBaseMCPServerConfig,
  getMergedMCPServerConfig,
  updateServerInstallStatus,
  getServerSessionInfo,
  userConfig
} from './src/common/configLoader';
import type { MCPServerExtended } from './src/common/types/server-config';
import { ServerInstaller } from './src/common/installer/ServerInstaller';
import { manager } from './src/common/manager/managerInstance';
import { setupMcpHealthCheckHandlers } from './src/common/server/services/mcpHealthCheck';
import { ServerInstanceFactory } from './src/common/manager/ServerInstanceFactory';
import { createNodeExecutor } from './src/common/server/node/NodeExecutorFactory';
import { ClaudeDesktopIntegration } from './src/common/server/node/service/claude';

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

function getPythonPath() {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'python', 'python.exe');
  } else {
    return path.join(process.cwd(), 'python', 'python.exe');
  }
}

const installer = new ServerInstaller();
// 기존 코드 제거
// const installer = new ServerInstaller();

// installServer 핸들러 수정
// ipcMain.handle('installServer', async (event, serverName: string, command: string, envVars?: Record<string, string>) => {
//   console.log('⬇️ main: installServer handler received for', serverName, command);
  
//   const config = await getBaseMCPServerConfig(serverName, command as MCPServerExtended['type'], envVars);
  
//   if (!config) {
//     console.error(`[Main] Base config not found for ${serverName}.`);
//     event.sender.send('installResult', {
//       success: false,
//       serverName,
//       message: `기본 설정 파일(${serverName}.json)을 찾을 수 없습니다.`,
//     });
//     return { success: false, error: 'Config not found' };
//   }

//   try {
//     // 새로운 installer store 사용
//     const installResult = await installerThunks.installServer(serverName, config, command);
    
//     event.sender.send('installResult', {
//       success: installResult.success,
//       serverName,
//       message: installResult.success 
//         ? `${serverName} 설치 완료` 
//         : installResult.error,
//     });
    
//     return installResult;
//   } catch (error) {
//     console.error(`[Main] Error during install process for ${serverName}:`, error);
//     return { success: false, error: error instanceof Error ? error.message : 'Install failed' };
//   }
// });



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

// 서버 설치
ipcMain.handle('installServer', async (event, serverName: string, command: string, envVars?: Record<string, string>) => {
  console.log('⬇️ main: installServer handler received for', serverName, command);
  console.log('⬇️ main: with environment variables:', envVars || 'none');

  const config = await getBaseMCPServerConfig(serverName, command as MCPServerExtended['type'], envVars);

  if (!config) {
    console.error(`[Main] Base config not found for ${serverName}. Replying error.`);
    event.sender.send('installResult', {
      success: false,
      serverName,
      message: `기본 설정 파일(${serverName}.json)을 찾을 수 없습니다.`,
    });
    return { success: false, error: 'Config not found' };
  }

  try {
    console.log(`[Main] Starting installation process for ${serverName} using BASE config...`);
    const installResult = await installer.installServer(serverName, config);
  } catch (error) {
    console.error(`[Main] Error during install process for ${serverName}:`, error);
  }

  return { success: true };
});

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
  const { workflowId, nodes, edges, triggerId, context } = payload;
  const results: Record<string, any> = {};
  let currentContext = context || {};

  for (const node of nodes) {
    try {
      const executor = createNodeExecutor(node, nodes, edges, triggerId);
      const result = await executor.execute(currentContext, nodes, edges, triggerId);
      results[node.id] = result;
      currentContext[node.id] = result;
      Object.assign(currentContext, result);
    } catch (error: unknown) {
      let message = 'Unknown error';
      if (error && typeof error === 'object' && 'message' in error) {
        message = (error as any).message;
      } else if (typeof error === 'string') {
        message = error;
      }
      results[node.id] = { error: true, message };
      break;
    }
  }

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

